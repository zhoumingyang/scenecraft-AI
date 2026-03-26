"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RotatingSquare from "@/components/rotatingSquare";
import { authClient } from "@/lib/authClient";
import styles from "./landingAuthShell.module.scss";

type LandingAuthShellProps = {
  isAuthenticated: boolean;
  displayName: string | null;
};

type AuthMode = "login" | "register";

const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@scenecraft.local`;

const getErrorMessage = (fallback: string, error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
};

export default function LandingAuthShell({
  isAuthenticated,
  displayName
}: LandingAuthShellProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const titleText = useMemo(
    () => (mode === "login" ? "欢迎回来" : "创建你的 scenecraft 账户"),
    [mode]
  );

  const openModal = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorText("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setErrorText("");
  };

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password.trim()) {
      setErrorText("请输入用户名和密码");
      return;
    }

    setLoading(true);
    setErrorText("");

    try {
      const email = usernameToEmail(normalizedUsername);
      if (mode === "register") {
        const result = await authClient.signUp.email({
          email,
          password,
          name: normalizedUsername,
          callbackURL: "/home"
        });
        if (result.error) {
          setErrorText(result.error.message || "注册失败，请稍后重试");
          return;
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL: "/home"
        });
        if (result.error) {
          setErrorText(result.error.message || "登录失败，请检查用户名和密码");
          return;
        }
      }
      router.push("/home");
      router.refresh();
    } catch (error) {
      setErrorText(getErrorMessage("操作失败，请稍后重试", error));
    } finally {
      setLoading(false);
    }
  };

  const socialSignIn = async (provider: "google" | "github") => {
    setLoading(true);
    setErrorText("");
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: "/home"
      });
      if (result.error) {
        setErrorText(result.error.message || `${provider} 登录失败`);
      }
    } catch (error) {
      setErrorText(getErrorMessage("第三方登录失败，请检查配置", error));
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authClient.signOut();
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.brand}>scenecraft-AI</div>
        <div className={styles.topActions}>
          {isAuthenticated ? (
            <>
              <span className={styles.userName}>Hi, {displayName || "creator"}</span>
              <Link href="/home" className={styles.ghostButton}>
                进入主页
              </Link>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={loading}
                onClick={signOut}
              >
                退出
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => openModal("login")}
            >
              登录 / 注册
            </button>
          )}
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.copyBlock}>
          <p className={styles.kicker}>Realtime · Three.js · Creative Workflow</p>
          <h1 className={styles.title}>把灵感快速转成可交互的 3D 场景原型</h1>
          <p className={styles.subtitle}>
            精简登录流程与视觉工作台合一。注册后立即进入创作空间，支持账号密码与 Google / GitHub
            登录。
          </p>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => openModal("register")}
            >
              立即开始
            </button>
            <Link href="/home" className={styles.ghostButton}>
              预览场景
            </Link>
          </div>
        </div>
        <div className={styles.previewCard}>
          <RotatingSquare />
        </div>
      </section>

      {isModalOpen ? (
        <div className={styles.modalMask} onClick={closeModal}>
          <section className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalTabs}>
              <button
                type="button"
                className={mode === "login" ? styles.activeTab : styles.tab}
                onClick={() => setMode("login")}
              >
                登录
              </button>
              <button
                type="button"
                className={mode === "register" ? styles.activeTab : styles.tab}
                onClick={() => setMode("register")}
              >
                注册
              </button>
            </div>

            <h2 className={styles.modalTitle}>{titleText}</h2>
            <p className={styles.modalDesc}>使用用户名 + 密码登录，或选择第三方账号。</p>

            <form className={styles.form} onSubmit={submitAuth}>
              <label className={styles.label}>
                用户名
                <input
                  className={styles.input}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="例如：mingyoung"
                  autoComplete="username"
                />
              </label>
              <label className={styles.label}>
                密码
                <input
                  className={styles.input}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="至少 8 位"
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                />
              </label>

              {errorText ? <p className={styles.errorText}>{errorText}</p> : null}

              <button className={styles.primaryButton} type="submit" disabled={loading}>
                {loading ? "处理中..." : mode === "register" ? "注册并进入" : "登录"}
              </button>
            </form>

            <div className={styles.divider}>或使用第三方账号</div>
            <div className={styles.socialRow}>
              <button
                type="button"
                className={styles.ghostButton}
                disabled={loading}
                onClick={() => socialSignIn("google")}
              >
                Google
              </button>
              <button
                type="button"
                className={styles.ghostButton}
                disabled={loading}
                onClick={() => socialSignIn("github")}
              >
                GitHub
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
