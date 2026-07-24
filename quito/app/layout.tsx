import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "LABUBU Experience Chatbox",
  description: "A bilingual Labubu-style chatbox experience for personality, identity, social proof, FOMO, and media literacy.",
  openGraph: {
    title: "LABUBU Experience Chatbox",
    description: "A chatbox interface that shows why a viewer becomes more interested in Labubu through media.",
  },
  twitter: {
    card: "summary",
    title: "LABUBU Experience Chatbox",
    description: "A chatbox interface that shows why a viewer becomes more interested in Labubu through media.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
