import { useCallback } from "react";
import { Locale, useAppStore } from "@/stores/appStore";

type Dictionary = Record<string, string>;

const dictionaries: Record<Locale, Dictionary> = {
  en: {
    "language.label": "Language",
    "language.english": "English",
    "language.chinese": "Chinese",
    "common.creator": "creator",
    "common.processing": "Processing...",
    "common.email": "Email",
    "common.password": "Password",
    "common.passwordMin8": "At least 8 characters",
    "dialog.close": "Close dialog",
    "home.login": "Log in",
    "home.register": "Register",
    "home.signOut": "Sign out",
    "home.slogan": "3D creative platform powered by AI",
    "home.enterEditor": "Enter Editor ({name})",
    "auth.login.title": "Welcome back",
    "auth.login.description": "Log in with email and password, or continue with a social account.",
    "auth.login.submit": "Log in with email",
    "auth.login.forgotPassword": "Forgot password",
    "auth.login.socialDivider": "Or continue with social account",
    "auth.login.withGoogle": "Continue with Google",
    "auth.login.withGithub": "Continue with GitHub",
    "auth.login.emailPlaceholder": "name@example.com",
    "auth.login.passwordPlaceholder": "Enter password",
    "auth.login.backToLogin": "Back to log in",
    "auth.login.errorRequired": "Please enter both email and password",
    "auth.login.errorInvalid": "Login failed. Please check your email and password",
    "auth.login.errorSocial": "Social login failed. Please check your configuration",
    "auth.forgot.description":
      "Enter your registered email and we will send you a password reset link.",
    "auth.forgot.errorRequired": "Please enter your email",
    "auth.forgot.errorSendFailed": "Failed to send. Please try again later",
    "auth.forgot.success":
      "Reset link sent. Please check your email. The link is valid for 30 minutes.",
    "auth.forgot.submit": "Reset password",
    "auth.register.title": "Create account",
    "auth.register.description":
      "Sign up with email and password. A verification link will be sent and valid for 30 minutes.",
    "auth.register.submit": "Send verification link",
    "auth.register.errorRequired": "Please enter both email and password",
    "auth.register.errorFailed": "Sign-up failed. Please try again later",
    "auth.register.success":
      "Verification link sent. Please complete registration within 30 minutes. You will enter the Editor after verification.",
    "auth.reset.title": "Set new password",
    "auth.reset.description": "Enter a new password and submit. This dialog will close after success.",
    "auth.reset.labelNewPassword": "New password",
    "auth.reset.submit": "Submit new password",
    "auth.reset.errorRequired": "Please enter a new password",
    "auth.reset.errorFailed": "Reset failed. Please restart the password reset flow",
    "editor.greeting": "Hi, {name}",
    "editor.tips": "Drag to rotate · Wheel to zoom · Right click to pan",
    "editor.backHome": "Back to Home",
    "editor.top.project": "Project",
    "editor.top.import": "Import",
    "editor.top.save": "Save",
    "editor.top.clear": "Clear",
    "editor.top.camera": "Camera",
    "editor.top.light": "Light",
    "editor.top.grid": "Grid",
    "editor.project.new": "New",
    "editor.project.select": "Select",
    "editor.camera.birdView": "Bird view",
    "editor.camera.firstPerson": "First person",
    "editor.light.ambient": "Ambient light",
    "editor.light.directional": "Directional light",
    "editor.light.point": "Point light",
    "editor.light.spot": "Spot light",
    "editor.light.rectArea": "Rect area light",
    "editor.grid.box": "Box",
    "editor.grid.capsule": "Capsule",
    "editor.grid.circle": "Circle",
    "editor.grid.cylinder": "Cylinder",
    "editor.avatar.default": "Default Avatar",
    "editor.avatar.signOut": "Sign out"
  },
  zh: {
    "language.label": "语言",
    "language.english": "英文",
    "language.chinese": "中文",
    "common.creator": "创作者",
    "common.processing": "处理中...",
    "common.email": "邮箱",
    "common.password": "密码",
    "common.passwordMin8": "至少 8 位",
    "dialog.close": "关闭弹窗",
    "home.login": "登录",
    "home.register": "注册",
    "home.signOut": "退出",
    "home.slogan": "3D创意平台，AI助力创作",
    "home.enterEditor": "进入 Editor（{name}）",
    "auth.login.title": "欢迎回来",
    "auth.login.description": "使用邮箱密码登录，或通过第三方认证继续。",
    "auth.login.submit": "邮箱密码登录",
    "auth.login.forgotPassword": "忘记密码",
    "auth.login.socialDivider": "或使用第三方认证",
    "auth.login.withGoogle": "谷歌认证",
    "auth.login.withGithub": "GitHub 认证",
    "auth.login.emailPlaceholder": "name@example.com",
    "auth.login.passwordPlaceholder": "输入密码",
    "auth.login.backToLogin": "返回登录",
    "auth.login.errorRequired": "请输入邮箱和密码",
    "auth.login.errorInvalid": "登录失败，请检查邮箱和密码",
    "auth.login.errorSocial": "第三方登录失败，请检查配置",
    "auth.forgot.description": "输入注册邮箱，我们会发送重置密码链接到你的邮箱。",
    "auth.forgot.errorRequired": "请输入邮箱",
    "auth.forgot.errorSendFailed": "发送失败，请稍后重试",
    "auth.forgot.success": "重置链接已发送，请前往邮箱点击链接。链接有效期为 30 分钟。",
    "auth.forgot.submit": "重置密码",
    "auth.register.title": "创建账号",
    "auth.register.description":
      "使用邮箱和密码注册。提交后会向邮箱发送注册链接，请在 30 分钟内点击完成注册。",
    "auth.register.submit": "发送注册链接",
    "auth.register.errorRequired": "请输入邮箱和密码",
    "auth.register.errorFailed": "注册失败，请稍后重试",
    "auth.register.success":
      "注册链接已发送到邮箱，请在 30 分钟内点击邮件中的链接完成注册。完成后将自动进入 Editor。",
    "auth.reset.title": "设置新密码",
    "auth.reset.description": "请输入新密码并提交，完成后将关闭该弹窗。",
    "auth.reset.labelNewPassword": "新密码",
    "auth.reset.submit": "提交新密码",
    "auth.reset.errorRequired": "请输入新密码",
    "auth.reset.errorFailed": "重置密码失败，请重新发起重置流程",
    "editor.greeting": "你好，{name}",
    "editor.tips": "鼠标拖拽旋转 · 滚轮缩放 · 右键平移",
    "editor.backHome": "返回 Home",
    "editor.top.project": "项目",
    "editor.top.import": "导入",
    "editor.top.save": "保存",
    "editor.top.clear": "清空",
    "editor.top.camera": "相机",
    "editor.top.light": "光照",
    "editor.top.grid": "网格",
    "editor.project.new": "新建",
    "editor.project.select": "选择",
    "editor.camera.birdView": "鸟瞰",
    "editor.camera.firstPerson": "第1人称",
    "editor.light.ambient": "环境光",
    "editor.light.directional": "平行光",
    "editor.light.point": "点光源",
    "editor.light.spot": "聚光灯",
    "editor.light.rectArea": "面光源（rectAreaLight）",
    "editor.grid.box": "盒子（box）",
    "editor.grid.capsule": "Capsule",
    "editor.grid.circle": "Circle",
    "editor.grid.cylinder": "Cylinder",
    "editor.avatar.default": "默认头像",
    "editor.avatar.signOut": "退出登录"
  }
};

export type TranslationKey = keyof (typeof dictionaries)["en"];

type TranslationParams = Record<string, string | number>;

export function translate(locale: Locale, key: TranslationKey, params?: TranslationParams) {
  const template = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? ""));
}

export function useI18n() {
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(locale, key, params),
    [locale]
  );
  return { locale, setLocale, t };
}
