import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { buildAuthEmailTemplate, sendAuthEmail } from "@/lib/authEmail";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

const EMAIL_VERIFY_EXPIRES_IN = 60 * 30;
const RESET_PASSWORD_EXPIRES_IN = 60 * 30;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "scenecraft-dev-secret-key-please-change-in-production-2026",
  emailVerification: {
    expiresIn: EMAIL_VERIFY_EXPIRES_IN,
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Scenecraft AI 注册验证",
        html: buildAuthEmailTemplate({
          title: "完成账号注册",
          intro: "请点击下方按钮验证邮箱并完成注册。验证成功后会自动回到主页并进入编辑器。",
          actionUrl: url,
          actionText: "验证邮箱并继续",
          expireText: "该链接 30 分钟内有效。"
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
        subject: "Scenecraft AI 重置密码",
        html: buildAuthEmailTemplate({
          title: "重置登录密码",
          intro: "请点击下方按钮继续重置密码。页面会打开“设置新密码”弹窗。",
          actionUrl: url,
          actionText: "重置密码",
          expireText: "该链接 30 分钟内有效。"
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
