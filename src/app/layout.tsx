import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "FreeGamesList – Alle kostenlosen Spiele",
  description: "Gratis-Aktionen und Free-to-Play-Spiele von Steam, Epic, GOG, Ubisoft, EA, Battle.net & mehr an einem Ort.",
};

/** Applies the stored theme before first paint so there is no light/dark flash. */
const themeScript = `try{var t=localStorage.getItem("fgl.theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy as a <meta> tag: GitHub Pages can't send custom headers. Next.js
 * hydration and the theme bootstrap use inline scripts; game images come from many store CDNs,
 * so images allow any https source; the game lists are fetched from the site itself. Dev mode
 * additionally needs eval + websockets for hot reloading. (frame-ancestors only works as a header.)
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** Root HTML shell: security meta tags, theme bootstrap and the self-hosted fonts. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={csp} />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>{children}</body>
    </html>
  );
}
