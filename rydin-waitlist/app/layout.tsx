import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rydin — Share the Ride. Split the Cost. Travel Smarter.",
  description:
    "India's first true peer-to-peer mobility network. Connect with verified students and professionals travelling your exact route, split fuel costs, and skip surge pricing entirely.",
  keywords: [
    "carpool India",
    "ride sharing Indore",
    "Bhopal commute",
    "peer to peer mobility",
    "fuel cost sharing",
    "campus carpool",
  ],
  openGraph: {
    title: "Rydin — Share the Ride. Split the Cost. Travel Smarter.",
    description:
      "Zero surge. 100% verified peers. Split exact fuel costs with commuters on your route.",
    type: "website",
    url: "https://rydinapp.com",
    siteName: "Rydin",
  },
  metadataBase: new URL("https://rydinapp.com"),
};

export const viewport: Viewport = {
  /* Matches `paper.floor` so the mobile browser chrome blends into the page. */
  themeColor: "#F9FAFB",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /*
     * No `dark` class, and none is ever applied. This page is light mode only
     * by product decision, so there are no `dark:` variants to fall out of sync.
     */
    <html lang="en-IN">
      <head>
        {/*
          Geist + Geist Mono loaded from Google Fonts.

          Deliberately a <link> rather than `next/font/google`: Geist only
          landed in Next's bundled font data in newer releases, and a hard
          import breaks the build on older ones. If you are on Next 15+,
          swapping to `import { Geist, Geist_Mono } from "next/font/google"`
          removes this render-blocking request — see README.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-paper-floor">
        {/*
          Page floor. A single fixed gradient rather than per-section
          backgrounds, so the paper never bands at section seams. It runs from
          white at the top — behind the hero, where the card needs contrast —
          down into gray-50.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(125%_85%_at_50%_-10%,#FFFFFF_0%,#FDFEFE_38%,#F9FAFB_100%)]"
        />
        {/* Map graticule, masked to a soft falloff under the hero. */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-graticule bg-grid-72 opacity-70 [mask-image:radial-gradient(70%_50%_at_50%_0%,#000_0%,transparent_100%)]"
        />
        {children}
      </body>
    </html>
  );
}
