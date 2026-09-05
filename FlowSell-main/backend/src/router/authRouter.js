import express from "express";
import { checkAuth } from "../controllers/authController.js";
import passport from "passport";
import { APP_URL, COOKIE_DOMAIN } from '../config/config.js';

const authRouter = express.Router();

authRouter.get('/login', passport.authenticate('meli'));

// 2) Callback de ML
authRouter.get(
  '/callback',
  passport.authenticate('meli', { failureRedirect: `${APP_URL}/login?auth=failed`, session: true }),
  (req, res, next) => {
        req.session.save(err => {
      if (err) return next(err);
      // Ahora sí enviamos el redirect con la cookie correcta
      res.redirect(`${APP_URL}/app`);
    });
  }
);

authRouter.get('/check', checkAuth);

authRouter.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);
      res.clearCookie('flowsell.sid', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
      });
      res.sendStatus(204);
    });
  });
});

export default authRouter;
