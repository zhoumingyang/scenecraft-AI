import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const isValidPhone = (value: string) => /^1\d{10}$/.test(value);

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const authCookie = (await cookies()).get("scenecraft_auth");
  if (authCookie?.value === "1") {
    redirect("/home");
  }

  const resolvedParams = await searchParams;
  const hasError = resolvedParams.error === "1";

  async function loginAction(formData: FormData) {
    "use server";
    const phone = String(formData.get("phone") ?? "");
    const password = String(formData.get("password") ?? "");

    if (isValidPhone(phone) && password === "123456") {
      (await cookies()).set("scenecraft_auth", "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/"
      });
      redirect("/home");
    }

    redirect("/?error=1");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px"
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(12, 15, 28, 0.82)",
          border: "1px solid rgba(116, 134, 255, 0.35)",
          borderRadius: "16px",
          padding: "32px",
          backdropFilter: "blur(10px)",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.4)"
        }}
      >
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>scenecraft-AI</h1>
        <p style={{ marginTop: "8px", marginBottom: "24px", opacity: 0.82 }}>
          输入手机号和默认密码登录体验 3D 场景。
        </p>
        <form action={loginAction} style={{ display: "grid", gap: "14px" }}>
          <input
            type="tel"
            name="phone"
            placeholder="手机号（11位）"
            required
            pattern="^1\\d{10}$"
            style={{
              width: "100%",
              height: "44px",
              padding: "0 12px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              background: "rgba(255, 255, 255, 0.08)",
              color: "#fff",
              outline: "none"
            }}
          />
          <input
            type="password"
            name="password"
            defaultValue="123456"
            required
            style={{
              width: "100%",
              height: "44px",
              padding: "0 12px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              background: "rgba(255, 255, 255, 0.08)",
              color: "#fff",
              outline: "none"
            }}
          />
          <button
            type="submit"
            style={{
              marginTop: "10px",
              height: "44px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(90deg, #7a8cff, #56c8ff)",
              color: "#081220",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            登录
          </button>
        </form>
        {hasError ? (
          <p style={{ color: "#ff9090", marginTop: "14px", marginBottom: 0 }}>
            登录失败，请输入正确手机号与默认密码 123456。
          </p>
        ) : null}
      </section>
    </main>
  );
}
