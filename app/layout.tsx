import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PharmaGuard — Pharmacogenomic Risk Analysis",
  description:
    "Analyze your patient's genetic profile against CPIC clinical guidelines. Get instant drug safety reports — Safe, Adjust Dosage, Toxic, or Ineffective — explained by AI.",
  keywords: [
    "pharmacogenomics",
    "drug safety",
    "CPIC guidelines",
    "VCF analysis",
    "precision medicine",
    "clinical pharmacology",
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fbfb" },
    { media: "(prefers-color-scheme: dark)",  color: "#0e151a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
