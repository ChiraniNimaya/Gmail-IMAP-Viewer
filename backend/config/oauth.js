const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
require('dotenv').config();

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; 

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      accessType: 'offline',
      prompt: 'consent',
      scope: [
        'profile',
        'email',
        'https://mail.google.com/'
      ]
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({
          where: { googleId: profile.id }
        });

        const userData = {
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          profilePicture: profile.photos[0]?.value || null,
          accessToken: accessToken,
          refreshToken: refreshToken,
          tokenExpiry: new Date(Date.now() + TOKEN_EXPIRY_MS),
          lastSync: new Date()
        };

        if (user) {
          await user.update(userData);
        } else {
          user = await User.create(userData);
        }

        return done(null, user);
      } catch (error) {
        console.error('OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;