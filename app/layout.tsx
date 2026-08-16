import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Providers } from "@/app/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RCT S1 — Ranka's Chess Tournament",
  description:
    "RCT S1 · 限国内 Open Rank 的 osu! 团队赛。4v4、强制 NoFail、Score V2，把谱面当作棋子，在 4×4 棋盘上对弈。",
  keywords: ["osu!", "RCT", "tournament", "mappool", "chess", "board game", "锦标赛"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={geistSans.variable + " " + geistMono.variable + " h-full antialiased dark"}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
