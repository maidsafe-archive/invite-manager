import express from 'express';
import passport from 'passport';
import { Strategy } from 'passport-google-oauth20';

const config = require('../configs/app');
const authConfig = require('../configs/google')[(process.env.NODE_ENV || 'dev').trim()];

passport.use(new Strategy({
  clientID: authConfig.CLIENT_ID,
  clientSecret: authConfig.SECRET,
  callbackURL: authConfig.CALLBACK_URL,
  accessType: 'offline'
}, (accessToken, refreshToken, profile, cb) => {
  // Extract the minimal profile information we need from the profile object
  // provided by Google  
  // console.log(profile);
  cb(null, {id: profile.id, strategy: 'google', email: profile.emails[0].value});
}));

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((obj, cb) => {
  cb(null, obj);
});
// [END setup]

const router = express.Router();

// Begins the authorization flow. The user will be redirected to Google where
// they can authorize the application to have access to their basic profile
// information. Upon approval the user is redirected to `/auth/google/callback`.
// If the `return` query parameter is specified when sending a user to this URL
// then they will be redirected to that URL when the flow is finished.
// [START authorize]
router.get(
  // Login url
  '/login',

  // Save the url of the user's current page so the app can redirect back to
  // it after authorization
  (req, res, next) => {
    if (req.query.return) {
      req.session.oauth2return = req.query.return;
    }
    next();
  },

  // Start OAuth 2 flow using Passport.js
  passport.authenticate('google', { scope: ['email', 'profile'] })
);
// [END authorize]

// [START callback]
router.get(
  // OAuth 2 callback url. Use this url to configure your OAuth client in the
  // Google Developers console
  '/callback',

  // Finish OAuth 2 flow using Passport.js
  passport.authenticate('google', { failureRedirect: '/auth.html?err=Authorisation Failed' }),

  // Redirect back to the original page, if any
  (req, res) => {
    const redirect = req.session.oauth2return || '/';
    delete req.session.oauth2return;
    res.redirect(config.authConfirmURL);
  }
);
// [END callback]

export const googleRouter = router;
