import { AuthProvider } from '@/context/AuthContext';
import BackgroundAudio from '@/components/BackgroundAudio';
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./components.css";

const customFont = localFont({
  src: "./fonts/exepixelperfect.medium.ttf",
  variable: "--font-retganon",
});

const pixelFont = localFont({
  src: "./fonts/PixelifySans.woff2",
  variable: "--font-pixelify",
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
      <head>
        {/* Stitch design system icon font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${customFont.variable} ${pixelFont.variable} antialiased`}
      >
        <AuthProvider>
          <BackgroundAudio src="/sounds/background_ambience.wav" />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
