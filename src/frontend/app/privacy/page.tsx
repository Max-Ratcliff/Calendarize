import React from "react"

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-[#071E37] font-sans">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="mb-4">Last updated: March 05, 2026</p>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
        <p className="mb-4">Welcome to Calendarize. We respect your privacy and are committed to protecting your personal data.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Data We Collect</h2>
        <p className="mb-4"><strong>Google Calendar Data:</strong> If you use the "Push to Google" feature, we request temporary access to your Google Calendar to create events. We do not store your calendar events on our servers. Access tokens are stored in your browser's local storage and a temporary in-memory session on our server which is cleared regularly.</p>
        <p className="mb-4"><strong>Content:</strong> Any text or images you upload for conversion are processed by Google's Gemini API. We do not store these uploads permanently.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Data</h2>
        <p className="mb-4">We use your data solely to provide the event generation and calendar export services you request. We do not sell your data to third parties.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>
        <p className="mb-4">We use Google Gemini for AI processing and PostHog for anonymous usage analytics. These services have their own privacy policies.</p>
      </section>

      <div className="mt-12 text-sm text-[#6B909F]">
        <a href="/" className="underline hover:text-[#218F98]">Back to Home</a>
      </div>
    </div>
  )
}
