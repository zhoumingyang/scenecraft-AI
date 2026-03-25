import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "scenecraft-AI",
  description: "scenecraft-AI login and threejs demo"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
