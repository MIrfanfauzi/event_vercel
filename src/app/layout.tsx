import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DM_Sans, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../components/providers/auth-provider";
import { ClarityProvider } from "../components/analytics/ClarityProvider";

// Optional external brand stylesheet support via NEXT_PUBLIC_BRAND_STYLESHEET
const brandStylesheet = process.env.NEXT_PUBLIC_BRAND_STYLESHEET
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const poppins = Poppins({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "EventSeats - Open Source Event Booking System",
  description: "Free, open-source seat booking system for small venues, theatre groups, and community events. Professional booking without enterprise costs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=optional" 
        />
        {brandStylesheet ? (
          <link rel="stylesheet" href={brandStylesheet} />
        ) : null}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} ${poppins.variable} antialiased`}
      >
        <ClarityProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ClarityProvider>
        <Analytics />
      </body>
    </html>
  );
}
