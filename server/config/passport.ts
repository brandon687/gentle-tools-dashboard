import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { validateEmailDomain, isAdminEmail } from '../middleware/auth';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
  throw new Error('Missing required Google OAuth environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL');
}

/**
 * Configure Google OAuth Strategy
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const googleId = profile.id;

        if (!email) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        // Validate email domain (@scalmob.com only)
        if (!validateEmailDomain(email)) {
          return done(
            new Error('Only @scalmob.com email addresses are allowed'),
            undefined
          );
        }

        // Check if user exists
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        let user = existingUsers[0];

        if (user) {
          // Update existing user
          const updatedUsers = await db
            .update(users)
            .set({
              name,
              googleId,
              lastLoginAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id))
            .returning();

          user = updatedUsers[0];
        } else {
          // Create new user
          // Check if email should be admin based on ADMIN_EMAILS env var
          const role = isAdminEmail(email) ? 'admin' : 'power_user';

          const newUsers = await db
            .insert(users)
            .values({
              email,
              name,
              googleId,
              role,
              isActive: true,
              lastLoginAt: new Date(),
            })
            .returning();

          user = newUsers[0];
        }

        // Return user object
        return done(null, user);
      } catch (error) {
        console.error('Error in Google OAuth strategy:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

/**
 * Serialize user to session
 * Only store user ID in session
 */
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

/**
 * Deserialize user from session
 * Retrieve full user object from database
 */
passport.deserializeUser(async (id: number, done) => {
  try {
    const userResults = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (userResults.length === 0) {
      return done(new Error('User not found'), null);
    }

    done(null, userResults[0]);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
