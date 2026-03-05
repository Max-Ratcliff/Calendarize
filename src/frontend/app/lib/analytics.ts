"use client"

import posthog from 'posthog-js'

export const Analytics = {
  // Calendar events
  trackCalendarConversion: (inputType: 'text' | 'image' | 'docx', eventCount: number) => {
    if (!posthog.__loaded) return
    try {
      posthog.capture('calendar_conversion', {
        input_type: inputType,
        event_count: eventCount,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      console.error('PostHog tracking error:', e)
    }
  },

  trackCalendarExport: (platform: 'google' | 'outlook' | 'apple', success: boolean) => {
    if (!posthog.__loaded) return
    try {
      posthog.capture('calendar_export', {
        platform,
        success,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      console.error('PostHog tracking error:', e)
    }
  },

  // User interactions
  trackFileUpload: (fileType: string, fileSize: number) => {
    if (!posthog.__loaded) return
    try {
      posthog.capture('file_upload', {
        file_type: fileType,
        file_size: fileSize,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      console.error('PostHog tracking error:', e)
    }
  },

  trackTextInput: (text: string) => {
    if (!posthog.__loaded) return
    try {
      posthog.capture('typed_text', {
        text: text,
        length: text.length,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      console.error('PostHog tracking error:', e)
    }
  },

  // Error tracking
  trackError: (error: Error, context: string) => {
    if (!posthog.__loaded) return
    try {
      posthog.capture('error_occurred', {
        error_message: error.message,
        error_type: error.name,
        error_stack: error.stack,
        context,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      console.error('PostHog tracking error:', e)
    }
  },

  // Page views
  trackPageView: (url: string) => {
    if (!posthog.__loaded) return
    try {
      posthog.capture('$pageview', {
        $current_url: url,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      console.error('PostHog tracking error:', e)
    }
  }
}
 