import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "scenecraft-dev-secret-key-please-change-in-production-2026",
  emailAndPassword: {
    enabled: true
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
