import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuxVision AI — Luxury Real Estate Imagery",
  description:
    "Generate stunning, magazine-quality AI images of luxury properties in seconds.",
  openGraph: {
    title: "LuxVision AI",
    description: "AI-powered luxury real estate imagery",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Cormorant+Garamond:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
