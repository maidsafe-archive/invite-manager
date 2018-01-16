import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import Debug from 'debug';
import express from 'express';
import logger from 'morgan';
// import favicon from 'serve-favicon';
import path from 'path';
import lessMiddleware from 'less-middleware';
import session from 'express-session';
// import passport from 'passport';
import mongoose from 'mongoose';

import { isSuperAdmin, getClientIp } from './utils';
import adminRouter from './routes/admin';
import inviteRouter from './routes/invite';
import networkProxyRouter from './routes/network_proxy';
import discourseRouter from './auth/discourse';

import adminService from './service/admin';
import userService from './service/user';
import inviteService from './service/invite';
import networkProxyService from './service/network_proxy';

const appConfig = require('./configs/app');

const MIN_TRUST_LEVEL = parseInt(appConfig.trustLevel);

try {
    mongoose.connect(appConfig.mongo)
        .then(() => {
            console.log('Connected to DB');
        })
        .catch(e => {
            console.log(e);
            throw e;
        });
} catch (e) {
    console.error(e);
    throw e;
}

const loggedIn = (req, res, next) => {
    if (!req.session || !req.session.passport || !req.session.passport.user) {
        return res.status(401).send('Unauthorised');
    }
    next();
};

const app = express();
const debug = Debug('invites-manager:app');

// view engine setup
app.disable('etag');
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(cookieParser());
app.use(lessMiddleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: 'SAFE_NET_SECRET',
    signed: true
}));

app.set('trust proxy', true);

// app.use('*', (req, res, next) => {
//     let ipList = ['::1'];
//     if (ipList.indexOf(getClientIp(req)) === -1) {
//         return res.sendStatus(403);
//     }
//     next();
// });

// app.use(passport.initialize());
// app.use(passport.session());
app.use('/admin', adminRouter);
app.use('/invite', inviteRouter);
app.use('/networkProxy', networkProxyRouter);
app.use('/auth/discourse', discourseRouter);

app.use('/profile', (req, res) => {
    if (req && req.session && req.session.passport && req.session.passport.user) {
        const user = req.session.passport.user;
        res.send({
            role: req.session.user.role,
            email: user.email,
            id: user.id,
            cip: getClientIp(req)
        });
    } else {
        res.send({
            cip: getClientIp(req)
        });
    }
});

app.use('/authUri/:testnet/:token', loggedIn, async (req, res) => {
    if (!req.params.testnet || !req.params.token) {
        return res.send(400, 'Invalid URI');
    }
    try {
        const invite = await inviteService.get(req.params.testnet, req.params.token);
        const ip = getClientIp(req);
        if (!invite.ip) {
            await inviteService.claim(req.params.testnet, ip, invite.token);
        }
        res.redirect(`/update_ip.html`);
    } catch (e) {
        res.send(400, e);
    }
});

app.use('/clearDatabase', loggedIn, async (req, res) => {
    try {
        await inviteService.deleteAll(req.session.testnet);
        await userService.deleteAll(req.session.testnet);
        await networkProxyService.deleteAll(req.session.testnet);
        res.sendStatus(200);
    } catch (e) {
        res.send(400, e);
    }
});

app.use('/assignInvite/:id', loggedIn, async (req, res) => {
    try {
        let user = req.session.passport.user;
        if (!isSuperAdmin(req) && !await adminService.isAdmin(user.userName)) {
            return res.sendStatus(403);
        }
        let invite = await inviteService.findByAssignedTo(req.session.testnet, req.params.id);
        if (invite) {
            return res.send({ token: invite.token });
        }
        user = await userService.find(user.id, user.strategy);
        invite = await inviteService.assignForUser(req.session.testnet, req.params.id, user._id);
        return res.send({ testnet: req.session.testnet, token: invite.token });
    } catch (e) {
        console.log(e);
        res.status(400).send(e.toString());
    }
});

app.use('/testnet/:name', loggedIn, (req, res) => {
    if (appConfig.testnets.indexOf(req.params.name) === -1) {
        return res.status(400).send('Invalid testnet');
    }
    req.session.testnet = req.params.name;
    res.redirect('/generateInvite');
});

app.use('/testnet', loggedIn, (req, res) => {
    res.send(appConfig.testnets);
});

app.use('/generateInvite', loggedIn, async (req, res) => {
    try {
        let user = req.session.passport.user;
        const isSuperAdmin = appConfig.superAdmins.indexOf(user.email) > -1;
        const isAdmin = await adminService.isAdmin(user.userName);
        req.session.user = req.session.user || {};
        req.session.user.role = isSuperAdmin ? 'SuperAdmin' : (isAdmin ? 'Admin' : 'User');
        if (user.trustLevel < MIN_TRUST_LEVEL) {
            return res.redirect(`./auth_response.html?err=Only users with trust level ${MIN_TRUST_LEVEL} or above can get an invite`);
        }
        user = await userService.find(user.id, user.strategy);
        if (user) {
            let invite = await inviteService.findByUserId(req.session.testnet, user._id);
            if (!invite) {
                invite = await inviteService.assignForUser(req.session.testnet, user._id);
            }
            if (!invite) {
                return res.redirect(`./auth_response.html?err=No invites available`);
            }
            req.session.user.invite = invite.token;
            res.redirect(`./update_ip.html?invite=${invite.token}`);
        } else {
            user = req.session.passport.user;
            user = await userService.create(user.id, user.email, user.strategy, user.userName);
            const invite = await inviteService.assignForUser(req.session.testnet, user._id);
            if (!invite) {
                return res.redirect(`./auth_response.html?err=No invites available`);
            }
            req.session.user.invite = invite.token;
            res.redirect(`./update_ip.html?invite=${invite.token}`);
        }
    } catch (e) {
        res.redirect(`./auth_response.html?err=${e}`);
    }
});

app.use('/', (req, res) => {
    res.redirect('/index.html');
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
/* eslint no-unused-vars: 0 */
app.use((err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

// Handle uncaughtException
process.on('uncaughtException', (err) => {
    debug('Caught exception: %j', err);
    process.exit(1);
});

export default app;
