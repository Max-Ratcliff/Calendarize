import React from "react"

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-[#071E37] font-sans">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="mb-4">Last updated: March 05, 2026</p>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
        <p className="mb-4">By using Calendarize, you agree to these terms. If you do not agree, please do not use the service.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
        <p className="mb-4">Calendarize is an AI-powered tool that extracts event information from text and images and provides links or API integrations to export them to calendar services.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. User Conduct</h2>
        <p className="mb-4">You agree not to use the service for any illegal or unauthorized purpose. You are responsible for any content you upload.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Disclaimer of Warranties</h2>
        <p className="mb-4">The service is provided "as is" without any warranties. While we use advanced AI (Google Gemini), we do not guarantee 100% accuracy in event detection.</p>
      </section>

      <div className="mt-12 text-sm text-[#6B909F]">
        <a href="/" className="underline hover:text-[#218F98]">Back to Home</a>
      </div>
    </div>
  )
}
