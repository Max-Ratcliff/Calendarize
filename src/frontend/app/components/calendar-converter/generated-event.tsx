import React, { JSX } from "react"
import { CalendarEvent } from "@/app/types/CalendarEvent"
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card"
import { exportToGoogleCalendar, exportToICal, exportToOutlook, pushToGoogleCalendar } from "@/app/utils/calendarExport"
import { Button } from "@/app/components/ui/button"
import { format, parseISO, isValid } from "date-fns"

// Configuration
const CONFIG = {
  COLORS: {
    PRIMARY: "#218F98",
    TEXT_PRIMARY: "#071E37",
    TEXT_SECONDARY: "#6B909F"
  },
  ANIMATIONS: {
    BUTTON: {
      BASE: `relative w-full bg-[#218F98] text-white text-telegraf 
        transition-all duration-300 ease-in-out
        hover:bg-[#218F98] hover:shadow-lg hover:scale-[1.02]
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
        overflow-hidden group`,
      SHIMMER: `before:absolute before:inset-0 
        before:bg-white/10 before:transform before:scale-x-0 
        before:opacity-0 before:origin-left
        before:transition-transform before:duration-300
        hover:before:scale-x-100 hover:before:opacity-100`
    }
  },
  TEXT_SIZES: {
    MOBILE: {
      BUTTON: "text-xs",
      LABEL: "text-xs",
      TITLE: "text-lg",
      DESCRIPTION: "text-sm"
    },
    DESKTOP: {
      BUTTON: "text-[11px] xs:text-xs sm:text-sm lg:text-base",
      LABEL: "text-sm",
      TITLE: "text-xl",
      DESCRIPTION: "text-base"
    }
  }
} as const;

// Types
interface SectionRowProps {
  icon: React.ReactNode
  text: string
  contentClass: string
}

interface ExportButtonProps {
  label: string
  onClick?: () => void
  className?: string
}

// Utility functions
const formatDateTime = (date: string): string => {
  try {
    const parsed = parseISO(date)
    if (!isValid(parsed)) {
      throw new Error("Invalid date format")
    }
    return format(parsed, "EEEE, MMMM d, yyyy 'at' h:mm a")
  } catch (error) {
    console.error("Date formatting error:", error)
    return "Invalid date"
  }
};

const formatDate = (date: string): string => {
  try {
    const parsed = parseISO(date)
    if (!isValid(parsed)) {
      throw new Error("Invalid date format")
    }
    return format(parsed, "EEEE, MMMM d, yyyy")
  } catch (error) {
    console.error("Date formatting error:", error)
    return "Invalid date"
  }
}

// Reusable Button Component
const ExportButton: React.FC<ExportButtonProps> = ({ label, onClick, className = "" }) => (
  <Button
    className={`${CONFIG.ANIMATIONS.BUTTON.BASE} ${CONFIG.ANIMATIONS.BUTTON.SHIMMER} ${className}`}
    onClick={onClick}
  >
    <span className="relative z-10 flex items-center justify-center gap-1 xs:gap-2">
      <span className="font-medium tracking-wide text-white text-shadow-sm whitespace-nowrap">
        {label}
      </span>
      <span className="transform transition-transform duration-300 group-hover:translate-x-1 text-white">
        →
      </span>
    </span>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
      transform translate-x-[-100%] group-hover:translate-x-[100%] 
      transition-transform duration-1000 ease-in-out">
    </div>
  </Button>
);

// Utility Components
const SectionRow: React.FC<SectionRowProps> = React.memo(({ icon, text, contentClass }) => (
  <div className="flex items-start gap-2">
    <IconWrapper>{icon}</IconWrapper>
    <span className={contentClass}>{text}</span>
  </div>
));
SectionRow.displayName = 'SectionRow';

const IconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={`mt-0.5 text-[${CONFIG.COLORS.PRIMARY}] h-5 w-5`}>{children}</div>
);
IconWrapper.displayName = 'IconWrapper';

// Main Component
export function GeneratedEventDisplay({ event }: { event: CalendarEvent }): JSX.Element {
  // Memoized event details
  const eventDateTime = React.useMemo(() => ({
    start: formatDateTime(event.start_time),
    end: formatDateTime(event.end_time)
  }), [event.start_time, event.end_time]);

  const dayMapping: { [key: string]: string } = {
    mo: "Monday",
    tu: "Tuesday",
    we: "Wednesday",
    th: "Thursday",
    fr: "Friday",
    sa: "Saturday",
    su: "Sunday",
  };

  return (
    <Card className="w-full h-full
      md:border-[#218F98] 
      relative
      border-0
      md:border-2
      bg-white
      md:bg-white/95
      shadow-none
      md:shadow-sm
    ">
      <CardHeader className="px-4 md:px-8 pt-4 md:pt-6">
        <CardTitle className="text-[#071E37] heading-signika 
          text-lg 
          md:text-xl"
        >
          Generated Event
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6 px-4 md:px-8">
        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          <EventDetails
            title={event.title}
            dateTime={`${eventDateTime.start} - ${eventDateTime.end}`}
            description={event.description}
          />
          <MobileExportSection event={event} />
        </div>

        {/* Desktop View */}
        <div className="hidden md:block space-y-4">
          <SectionRow
            icon={<CalendarIcon />}
            text={event.title}
            contentClass={`text-lg font-medium text-telegraf text-[${CONFIG.COLORS.TEXT_PRIMARY}]`}
          />
          <SectionRow
            icon={<TimeIcon />}
            text={`${eventDateTime.start} - ${eventDateTime.end}`}
            contentClass={`text-telegraf text-[${CONFIG.COLORS.TEXT_SECONDARY}]`}
          />
          <div className="ml-4 space-y-2">
            {event.recurrence_type && (
              <SectionRow 
                icon={<RecurrenceIcon />}
                text={`Recurring: ${event.recurrence_type.toLowerCase()}`}
                contentClass={`text-tele  graf text-[${CONFIG.COLORS.TEXT_SECONDARY}]`}
              />
            )}
            {event.recurrence_type=="WEEKLY" && event.recurrence_days && (
              <SectionRow 
                icon={<RecurrenceIcon />}
                text={`On: ${event.recurrence_days
                  .map(day => dayMapping[day.toLowerCase()] || day)
                  .join(", ")}`}
                contentClass={`text-tele graf text-[${CONFIG.COLORS.TEXT_SECONDARY}]`}
              />
            )}
            {event.recurrence_type && event.recurrence_count != 0 && (
              <SectionRow 
                icon={<RecurrenceIcon />}
                text={`${event.recurrence_count} times`}
                contentClass={`text-tele  graf text-[${CONFIG.COLORS.TEXT_SECONDARY}]`}
              />
            )}
            {event.recurrence_type && event.recurrence_end && (
              <SectionRow 
                icon={<RecurrenceIcon />}
                text={`Until: ${formatDate(event.recurrence_end)}`}
                contentClass={`text-tele  graf text-[${CONFIG.COLORS.TEXT_SECONDARY}]`}
              />
            )}
          </div>
          {event.description && (
            <SectionRow
              icon={<LinesIcon />}
              text={event.description}
              contentClass={`text-telegraf text-[${CONFIG.COLORS.TEXT_SECONDARY}]`}
            />
          )}
          {event.location && (
            <SectionRow
              icon={<LocationIcon />}
              text={event.location}
              contentClass={`text-telegraf text-[${CONFIG.COLORS.TEXT_SECONDARY}]`}
            />
          )}
          {event.attendees.length > 0 && (
            <SectionRow
              icon={<EmailIcon />}
              text={event.attendees.join(", ")}
              contentClass={`text-telegraf text-[${CONFIG.COLORS.TEXT_SECONDARY}]`}
            />
          )}
          <DesktopExportSection event={event} />
        </div>
      </CardContent>
    </Card>
  )
}

// Event Details Component
const EventDetails: React.FC<{
  title: string;
  dateTime: string;
  description: string;
}> = React.memo(({ title, dateTime, description }) => (
  <div className="space-y-2">
    <p className="text-base md:text-lg font-medium text-telegraf text-[#071E37]">
      {title}
    </p>
    <p className="text-sm md:text-base text-telegraf text-[#6B909F]">
      {dateTime}
    </p>
    <p className="text-sm md:text-base text-telegraf text-[#6B909F]">
      {description}
    </p>
  </div>
));
EventDetails.displayName = 'EventDetails';

// Export Sections
const MobileExportSection: React.FC<{ event: CalendarEvent }> = React.memo(({ event }) => {
  const [isPushed, setIsPushed] = React.useState(false);

  const handlePush = async () => {
    try {
      await pushToGoogleCalendar(event, true);
      setIsPushed(true);
    } catch (e) {
      // toast already handled in pushToGoogleCalendar
    }
  };

  return (
    <div className="space-y-2 w-full">
      <p className="text-[#6B909F] text-sm font-medium text-telegraf">
        Export to:
      </p>
      <div className="flex flex-col gap-2 w-full">
        <ExportButton 
          label={isPushed ? "Added ✓" : "Push to Google"} 
          onClick={handlePush}
          className={isPushed ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
        />
        {isPushed && (
          <a 
            href="https://calendar.google.com" 
            target="_blank" 
            className="text-center text-xs text-[#218F98] underline font-medium py-1"
          >
            Review in Google Calendar
          </a>
        )}
        <ExportButton 
          label="Google Link" 
          onClick={() => exportToGoogleCalendar(event)}
        />
        <ExportButton 
          label="Outlook" 
          onClick={() => exportToOutlook(event)}
        />
        <ExportButton 
          label="Apple (ICS)"
          onClick={() => exportToICal(event)}
        />
      </div>
    </div>
  );
});
MobileExportSection.displayName = 'MobileExportSection';

// Desktop Export Section
const DesktopExportSection: React.FC<{ event: CalendarEvent }> = React.memo(({ event }) => {
  const [isPushed, setIsPushed] = React.useState(false);

  const handlePush = async () => {
    try {
      await pushToGoogleCalendar(event, true);
      setIsPushed(true);
    } catch (e) {
      // toast already handled
    }
  };

  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between items-center">
        <p className="text-[#6B909F] text-sm font-medium text-telegraf">
          Export to:
        </p>
        {isPushed && (
          <a 
            href="https://calendar.google.com" 
            target="_blank" 
            className="text-xs text-[#218F98] underline font-medium hover:text-[#1a747b]"
          >
            Review in Google Calendar
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 w-full">
        <ExportButton 
          label={isPushed ? "Added ✓" : "Push to Google"} 
          onClick={handlePush}
          className={isPushed ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
        />
        <ExportButton 
          label="Google Link" 
          onClick={() => exportToGoogleCalendar(event)}
        />
        <ExportButton 
          label="Outlook" 
          onClick={() => exportToOutlook(event)}
        />
        <ExportButton 
          label="Apple (ICS)"
          onClick={() => exportToICal(event)}
        />
      </div>
    </div>
  );
});
DesktopExportSection.displayName = 'DesktopExportSection';

// Icons (kept as is since they're already optimized)
function CalendarIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10 M5 21h14a2 2 0 002-2V7 a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

function TimeIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function LinesIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2}
        d="M4 6h16M4 10h16 M4 14h16M4 18h16"
      />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z"
      />
      <circle cx="12" cy="9" r="2.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg 
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  )
}
function RecurrenceIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582M20 20v-5h-.582M4.93 6.93a10 10 0 0114.14 0M19.07 17.07a10 10 0 01-14.14 0"
      />
    </svg>
  );
}