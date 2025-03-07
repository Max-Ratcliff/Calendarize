// app/layout.tsx (Server Component)
import type { Metadata } from "next"
import "./globals.css"
import { GeistSans, GeistMono } from "geist/font"
import ClientLayout from "./layout.client" // the client layout

export const metadata: Metadata = {
  title: "Calendarize",
  description: "Convert text and images to calendar events",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}