import type { Metadata } from "next";
import { Pixelify_Sans, Press_Start_2P } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

const pixelifySans = Pixelify_Sans({
  subsets: ["latin", "cyrillic"],
  variable: "--font-pixelify",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEURO RADIO",
  description: "8-bit neuro-powered radio for your current vibe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pressStart.variable} ${pixelifySans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
