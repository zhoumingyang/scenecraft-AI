import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { memoryAdapter } from "@better-auth/memory-adapter";
import { nextCookies } from "better-auth/next-js";
import { db, isDatabaseConfigured } from "@/db";
import * as schema from "@/db/schema";
import { buildAuthEmailTemplate, sendAuthEmail } from "@/lib/authEmail";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

const EMAIL_VERIFY_EXPIRES_IN = 60 * 30;
const RESET_PASSWORD_EXPIRES_IN = 60 * 30;
const isProduction = process.env.NODE_ENV === "production";
const databaseAdapter =
  isDatabaseConfigured && db
    ? drizzleAdapter(db, {
        provider: "pg",
        schema,
        camelCase: true
      })
    : memoryAdapter({
        user: [],
        session: [],
        account: [],
        verification: []
      });

if (!isDatabaseConfigured) {
  if (isProduction) {
    throw new Error("DATABASE_URL is required in production.");
  }

  console.warn(
    "[auth] DATABASE_URL is not configured. Falling back to Better Auth memory adapter for local development."
  );
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "scenecraft-dev-secret-key-please-change-in-production-2026",
  // Production should use Postgres persistence. Local development can fall
  // back to memory mode before Neon is ready, which keeps the app runnable
  // but does not preserve auth data after a restart.
  database: databaseAdapter,
  emailVerification: {
    expiresIn: EMAIL_VERIFY_EXPIRES_IN,
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Scenecraft AI Email Verification",
        html: buildAuthEmailTemplate({
          title: "Complete Your Account Registration",
          intro:
            "Click the button below to verify your email and finish registration. After verification, you will be redirected to the home page and enter the editor automatically.",
          actionUrl: url,
          actionText: "Verify Email and Continue",
          expireText: "This link is valid for 30 minutes."
        })
      });
    }
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: RESET_PASSWORD_EXPIRES_IN,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Scenecraft AI Password Reset",
        html: buildAuthEmailTemplate({
          title: "Reset Your Login Password",
          intro:
            "Click the button below to continue resetting your password. A modal for setting a new password will open.",
          actionUrl: url,
          actionText: "Reset Password",
          expireText: "This link is valid for 30 minutes."
        })
      });
    }
  },
  socialProviders: {
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret
          }
        }
      : {}),
    ...(githubClientId && githubClientSecret
      ? {
          github: {
            clientId: githubClientId,
            clientSecret: githubClientSecret
          }
        }
      : {})
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7
    }
  },
  plugins: [nextCookies()]
});
