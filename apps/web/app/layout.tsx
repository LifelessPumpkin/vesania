import { AuthProvider } from '@/context/AuthContext';
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./components.css";

const customFont = localFont({
  src: "./fonts/exepixelperfect.medium.ttf",
  variable: "--font-retganon",
});

export const metadata: Metadata = {
  title: "Vesania",
  description: "Collect, battle, and trade NFC-powered cards in the Vesania card game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${customFont.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
