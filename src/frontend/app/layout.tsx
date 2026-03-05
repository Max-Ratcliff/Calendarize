// app/layout.tsx (Server Component)
import type { Metadata } from "next"
import "./globals.css"
import { GeistSans, GeistMono } from "geist/font"
import ClientLayout from "./layout.client"
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: "Calendarize | AI Calendar Event Generator",
  description: "Effortlessly convert text, images, and documents into calendar events using AI. Supports Google, Outlook, and Apple Calendar.",
  keywords: ["calendar", "AI", "productivity", "event generator", "google calendar", "outlook"],
  authors: [{ name: "Calendarize Team" }],
  openGraph: {
    title: "Calendarize",
    description: "Instant Planning. Effortless Scheduling.",
    url: "https://calendarize.ratcliff.cc",
    siteName: "Calendarize",
    images: [
      {
        url: "/og-image.png", // You should add this file to public/
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Calendarize",
    description: "AI-powered calendar event generation from any text or image.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Suspense fallback={<div>Loading analytics...</div>}>
          <ClientLayout>
            {children}
          </ClientLayout>
        </Suspense>
      </body>
    </html>
  )
}