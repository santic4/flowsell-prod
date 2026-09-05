import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import { getUserMELI } from '../integrations/MELI/users/usersMeliAPI.js';
import { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } from '../config/config.js';
import { findOrCreateUser, getByIdWithTokens } from '../services/user/userServices.js';

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await getByIdWithTokens(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

passport.use('meli', new OAuth2Strategy(
  {
    authorizationURL: 'https://auth.mercadolibre.com.ar/authorization',
    tokenURL: 'https://api.mercadolibre.com/oauth/token',
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: REDIRECT_URI,
    state: true,
  },
  async (accessToken, refreshToken, params, _, done) => {
    try {
      const profile = await getUserMELI(accessToken);
      const pictureClient = profile.thumbnail?.picture_url ?? undefined;

      const user = await findOrCreateUser({
        meliId: profile.id,
        email: profile.email,
        nickname: profile.nickname,
        picture: pictureClient,
        accessToken,
        refreshToken,
        expiresAt: Date.now() + params.expires_in * 1000
      });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));
