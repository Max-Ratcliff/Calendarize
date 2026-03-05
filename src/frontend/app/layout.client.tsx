// app/layout.client.tsx
"use client";

import { Toaster } from "sonner";
import { PostHogAnalytics } from "./providers/PostHogProvider"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PostHogAnalytics>
      <Toaster position="top-right" richColors closeButton />
      {children}
    </PostHogAnalytics>
  )
}