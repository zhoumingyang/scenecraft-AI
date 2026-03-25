import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import RotatingSquare from "@/components/rotating-square";

export default async function HomePage() {
  const authCookie = (await cookies()).get("scenecraft_auth");
  if (authCookie?.value !== "1") {
    redirect("/");
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
          maxWidth: "900px",
          background: "rgba(9, 12, 22, 0.85)",
          border: "1px solid rgba(122, 140, 255, 0.35)",
          borderRadius: "18px",
          padding: "22px",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)"
        }}
      >
        <h1 style={{ margin: 0, marginBottom: "8px", fontSize: "24px" }}>
          scenecraft-AI · Three.js Demo
        </h1>
        <p style={{ marginTop: 0, opacity: 0.82 }}>
          下方画布展示一个持续旋转的正方形，页面由 Next.js SSR 输出。
        </p>
        <div
          style={{
            width: "100%",
            height: "520px",
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.15)"
          }}
        >
          <RotatingSquare />
        </div>
      </section>
    </main>
  );
}
