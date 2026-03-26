import type { Metadata } from "next";
import "./globals.scss";
import MuiProvider from "@/components/muiProvider";

export const metadata: Metadata = {
  title: "scenecraft-AI",
  description: "scenecraft-AI creative dark editor"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <MuiProvider>{children}</MuiProvider>
      </body>
    </html>
  );
}
