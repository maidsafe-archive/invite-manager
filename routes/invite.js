import express from 'express';

import { isSuperAdmin, getClientIp } from '../utils';
import inviteService from '../service/invite';

const appConfig = require('../configs/app');
const router = express.Router();

const isAdmin = (req) => {
    return req && req.session && req.session.user && req.session.user.role.toLowerCase() !== 'user';
};

router.get('/', async (req, res) => {
    if (!isAdmin(req)) {
        return res.sendStatus(403);
    }
    inviteService.list(req.session.testnet)
        .then(list => res.send(list))
        .catch(err => res.send(400, err));
});

router.get('/used', (req, res) => {
    if (!isAdmin(req)) {
        return res.sendStatus(403);
    }
    inviteService.listUsed(req.session.testnet)
        .then(list => res.send(list))
        .catch(err => res.send(400, err));
});

router.get('/unused', (req, res) => {
    if (!isAdmin(req)) {
        return res.sendStatus(403);
    }
    inviteService.listNotUsed(req.session.testnet)
        .then(list => res.send(list))
        .catch(err => res.send(400, err));
});

router.get('/stats', (req, res) => {
    if (!isAdmin(req)) {
        return res.sendStatus(403);
    }
    inviteService.getStats(req.session.testnet)
        .then(list => res.send(list))
        .catch(err => res.send(400, 'Error: ' + err));
});

router.get('/:token?', async (req, res) => {
    try {
        let reqToken = req.params.token;
        if (req.session && req.session.user && !reqToken) {
            reqToken = req.session.user.invite;
        }
        if (!reqToken) {
            return res.send(400, 'Token parameter is missing');
        }
        const invite = await inviteService.get(req.session.testnet, reqToken);
        let role = 'user';
        if (req.session && req.session.user && req.session.user.role) {
            role = req.session.user.role;
        }
        res.send({
            role,
            cip: getClientIp(req),
            ip: invite.ip
        });
    } catch(e) {
        res.send(400, e);
    }
});

router.get('/:token/:testnet', async (req, res) => {
    try {
        let reqToken = req.params.token;
        if (appConfig.testnets.indexOf(req.params.testnet) === -1) {
            return res.status(400).send('Invalid Testnet Name');
        }
        const invite = await inviteService.get(req.params.testnet, reqToken);
        let role = 'user';
        if (req.session && req.session.user && req.session.user.role) {
            role = req.session.user.role;
        }
        res.send({
            role,
            cip: getClientIp(req),
            ip: invite.ip
        });
    } catch(e) {
        res.send(400, e);
    }
});


router.post('/', async (req, res) => {
    try {
        if (!isSuperAdmin(req)) {
            return res.send(403, 'Not authorised');
        }
        const list = req.body.tokens;
        for (let i = 0; i < list.length; i++) {
            if (list[i].trim()) {
                await inviteService.create(req.session.testnet, list[i]);
            }
        }
        res.sendStatus(200);
    } catch(e) {
        res.status(400).send(e);
    }
});

// To set new IP
router.post('/resetIp/:token/:testnet?', (req, res) => {
    const testnet = req.params.testnet || req.session.testnet;
    if (!testnet) {
        res.status(400).send('Testnet param not found');
    }
    if (testnet && appConfig.testnets.indexOf(testnet) === -1) {
        return res.status(400).send('Invalid testnet');
    }
    const ip = getClientIp(req);
    const token = req.params.token;
    // console.log(req.params.testnet || req.session.testnet, ip, token);
    inviteService.claim(testnet, ip, token)
        .then(() => res.send({invite: token, ip}))
        .catch(e => res.send(400, e.message));
});

router.delete('/:id', (req, res) => {
    if (!isSuperAdmin(req)) {
        return res.send(403, 'Not authorised');
    }
    inviteService.delete(req.params.id)
        .then(() => res.sendStatus(200))
        .catch(err => res.send(400, err));
});

router.delete('/clearAll', (req, res) => {
    if (!isSuperAdmin(req)) {
        return res.send(403, 'Not authorised');
    }
    inviteService.deleteAll(req.session.testnet)
        .then(() => res.sendStatus(200))
        .catch(err => res.send(400, err));
});

const inviteRouter = router;
export default inviteRouter;
