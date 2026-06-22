import type { Metadata } from "next";
import "./globals.css";

// metadataBase makes Open Graph / canonical URLs in child pages resolve to the
// public domain (atlasbrief.la) rather than the Vercel deployment URL. Driven by
// NEXT_PUBLIC_SITE_URL so it tracks the domain in one place.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://atlasbrief.la"),
  title: "Atlas Brief",
  description: "Editorial Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
