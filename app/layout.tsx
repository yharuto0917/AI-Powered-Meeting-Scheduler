import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meeting Scheduler - AI-Powered Scheduling",
  description: "AI-powered meeting scheduling application with Gemini and Firebase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="polka-dots">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={`polka-dot-${i}`} className="polka-dot"></div>
          ))}
        </div>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
