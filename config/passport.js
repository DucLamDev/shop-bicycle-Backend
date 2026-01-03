import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

// Initialize Passport with Google OAuth Strategy
const initializePassport = () => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!googleClientId || !googleClientSecret) {
    console.warn('⚠️ Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    return;
  }

  try {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
          scope: ['profile', 'email'],
          proxy: true
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log(`Google OAuth Callback received for: ${profile.emails[0].value}`);

            // Check if user already exists by googleId or email
            let user = await User.findOne({
              $or: [
                { googleId: profile.id },
                { email: profile.emails[0].value }
              ]
            });

            if (user) {
              // Update Google ID if not set (linking existing account)
              if (!user.googleId) {
                user.googleId = profile.id;
                user.authProvider = 'google';
                if (!user.avatar && profile.photos[0]?.value) {
                  user.avatar = profile.photos[0].value;
                }
                await user.save();
              }
              return done(null, user);
            }

            // Create new user
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails[0].value,
              avatar: profile.photos[0]?.value,
              authProvider: 'google',
              role: 'user'
            });

            console.log(`New user created via Google OAuth: ${user.email}`);
            done(null, user);
          } catch (error) {
            console.error(`Google OAuth error: ${error.message}`);
            done(error, null);
          }
        }
      )
    );
    console.log('✅ Google OAuth Strategy registered successfully');
  } catch (error) {
    console.error(`❌ Failed to register Google Strategy: ${error.message}`);
  }

  // Serialize and deserialize user
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

export { initializePassport };
export default passport;
