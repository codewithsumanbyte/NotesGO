import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaProvider } from "@/components/pwa/PwaProvider";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://notesgo.vercel.app"),
  title: {
    default: "NotesGO — Personal File Vault, Notion Notes & Study Studio",
    template: "%s | NotesGO",
  },
  description: "NotesGO is your all-in-one personal digital vault. Store documents, edit Notion-style rich notes, annotate PDFs, and study on a full-screen interactive whiteboard canvas.",
  applicationName: "NotesGO",
  keywords: [
    "NotesGO",
    "Notes GO",
    "NotesGO App",
    "notesgo.vercel.app",
    "Notion Notes",
    "Study Whiteboard",
    "PDF Editor Studio",
    "Personal File Vault",
    "Online Notes App",
    "Free Cloud Storage Vault",
    "Student Productivity Hub",
    "PWA Notes App"
  ],
  authors: [{ name: "NotesGO Team", url: "https://notesgo.vercel.app" }],
  creator: "NotesGO",
  publisher: "NotesGO",
  alternates: {
    canonical: "https://notesgo.vercel.app",
  },
  openGraph: {
    title: "NotesGO — Personal File Vault, Notion Notes & Study Studio",
    description: "Organize files, write Notion notes, annotate PDFs, and collaborate on a full-screen whiteboard with NotesGO.",
    url: "https://notesgo.vercel.app",
    siteName: "NotesGO",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "NotesGO Logo & Digital Vault",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NotesGO — Personal File Vault & Study Studio",
    description: "Organize files, write Notion notes, annotate PDFs, and study with an infinite whiteboard.",
    images: ["/icon-512.png"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" }
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NotesGO",
  },
  verification: {
    google: "2CHJBg-qKXDrhWRAOxOwL8bGxIXIq4R-QM6EGL9MMeM",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#10231A",
};

// Structured JSON-LD Schema to ensure Google recognizes NotesGO as a brand & web application
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "NotesGO",
  "alternateName": ["Notes GO", "NotesGO App"],
  "url": "https://notesgo.vercel.app",
  "applicationCategory": "ProductivityApplication",
  "operatingSystem": "All",
  "description": "Secure, personal cloud storage and productivity workspace combining Notion-style notes, full-screen study whiteboard, and PDF annotation studio.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "Encrypted Cloud File Vault",
    "Rich Markdown Notion Notes",
    "Full-Screen Study Whiteboard with Flashcards",
    "Mobile PWA Support",
    "PDF Annotation Studio"
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={`dark ${sora.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <meta name="google-site-verification" content="2CHJBg-qKXDrhWRAOxOwL8bGxIXIq4R-QM6EGL9MMeM" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-vault-bg text-vault-text font-sans antialiased selection:bg-vault-primary/25 selection:text-vault-primary overflow-x-hidden">
        <PwaProvider>
          {children}
        </PwaProvider>
      </body>
    </html>
  );
}
