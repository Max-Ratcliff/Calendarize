"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
} from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";
import { GeneratedEventDisplay } from "./generated-event";
import { CalendarEvent } from "@/app/types/CalendarEvent";
import { generateEvent } from "@/app/utils/eventGenerator";
import { pushAllToGoogleCalendar } from "@/app/utils/calendarExport";
import mammoth from "mammoth";
import { Analytics } from '@/app/lib/analytics'

// Constants moved to a separate configuration file
const CONFIG = {
  ACCEPTED_FILE_TYPES: {
    TEXT: "text/plain",
    DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    IMAGE: "image/"
  },
  ANIMATIONS: {
    BUTTON: `absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
      transform transition-transform duration-1000 ease-in-out`,
    BEAM_DELAY: {
      RIGHT: 0,
      DOWN: 750,
      LEFT: 1500,
      UP: 2250
    }
  },
  UI: {
    HEIGHTS: {
      MOBILE: {
        BASE: "120px",
        XS: "140px",
        SM: "160px"
      },
      DESKTOP: {
        BASE: "180px",
        LG: "200px"
      }
    },
    COLORS: {
      PRIMARY: "#218F98",
      TEXT: "#071E37",
      SECONDARY: "#6B909F"
    }
  }
} as const;

// Error handling utility
const handleError = (error: Error, context: string) => {
  Analytics.trackError(error, context);
  console.error(`Error in ${context}:`, error);
};

// File handling utilities
const isValidFileType = (file: File): boolean => {
  return Object.values(CONFIG.ACCEPTED_FILE_TYPES).some(type => 
    file.type.startsWith(type)
  );
};

const processFile = async (file: File): Promise<string> => {
  if (file.type === CONFIG.ACCEPTED_FILE_TYPES.TEXT) {
    return await readTextFile(file);
  } else if (file.type === CONFIG.ACCEPTED_FILE_TYPES.DOCX) {
    return await readDocxFile(file);
  }
  return '';
};

const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = () => reject(new Error('Error reading text file'));
    reader.readAsText(file);
  });
};

const readDocxFile = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch {
    throw new Error('Error extracting text from DOCX');
  }
};

/**
 * CalendarConverter
 * Processes text, images, and .docx files to generate a calendar event.
 */
export function CalendarConverter() {
  const [state, setState] = useState<{
    text: string;
    events: CalendarEvent[];
    buttonLabel: string;
    file: File | null;
    fileURL: string | null;
    isLoading: boolean;
  }>({
    text: "",
    events: [],
    buttonLabel: "Convert to Calendar Event",
    file: null,
    fileURL: null,
    isLoading: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles the core conversion logic, detecting whether to convert text or image.
   */
  const handleConvert = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, buttonLabel: "Converting" }));
    
    try {
      const events = state.file?.type.startsWith(CONFIG.ACCEPTED_FILE_TYPES.IMAGE)
        ? await generateEvent(state.text, state.file)
        : await generateEvent(state.text);

      Analytics.trackCalendarConversion(
        state.file?.type.startsWith(CONFIG.ACCEPTED_FILE_TYPES.IMAGE) ? 'image' : 'text',
        events.length
      );

      setState(prev => ({ ...prev, events }));
      if (events.length === 0) {
        toast.info("No events found in the text/image.");
      } else {
        toast.success(`Generated ${events.length} event${events.length > 1 ? 's' : ''}!`);
      }
    } catch (error) {
      handleError(error as Error, 'calendar_conversion');
      toast.error(error instanceof Error ? error.message : "Failed to generate events. Please try again.");
    } finally {
      setState(prev => ({
        ...prev,
        isLoading: false,
        buttonLabel: "Convert to Calendar Event"
      }));
    }
  }, [state.file, state.text]);

  /**
   * Sets file state and reads text if necessary (.txt or .docx).
   */
  const handleFileSelection = useCallback(async (uploadedFile: File) => {
    if (!isValidFileType(uploadedFile)) {
      handleError(new Error('Invalid file type'), 'file_upload');
      return;
    }

    try {
      const fileURL = URL.createObjectURL(uploadedFile);
      const text = await processFile(uploadedFile);
      
      setState(prev => ({
        ...prev,
        file: uploadedFile,
        fileURL,
        text: text || prev.text
      }));

      Analytics.trackFileUpload(uploadedFile.type, uploadedFile.size);
    } catch (error) {
      handleError(error as Error, 'file_processing');
    }
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (state.fileURL) {
        URL.revokeObjectURL(state.fileURL);
      }
    };
  }, [state.fileURL]);

  /**
   * File input change handler for manual selection.
   */
  const handleFileUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const uploadedFile = e.target.files?.[0] || null
      if(!uploadedFile) return;
      await handleFileSelection(uploadedFile);
    },
    [handleFileSelection]
  );

  /**
   * Drag over handler to allow file dropping.
   */
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  /**
   * Drop handler that processes the dropped file.
   */
  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files?.[0];
      await handleFileSelection(droppedFile);
    },
    [handleFileSelection]
  );

  /**
   * Handles pasted image content
   */
  const handlePastedImage = useCallback((items: DataTransferItemList) => {
    const itemsArray = Array.from(items);
    for (const item of itemsArray) {
      if (item.type.startsWith(CONFIG.ACCEPTED_FILE_TYPES.IMAGE)) {
        const file = item.getAsFile();
        if (file) {
          handleFileSelection(file);
          break; // Process only the first image
        }
      }
    }
  }, [handleFileSelection]);

  /**
   * Local paste handler for FileUploadZone
   */
  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboardItems = event.clipboardData?.items;
    if (!clipboardItems) return;
    
    handlePastedImage(clipboardItems);
  }, [handlePastedImage]);

  /**
   * Global paste listener to capture pasted images anywhere on the page.
   */
  useEffect(() => {
    const handleGlobalPaste = (event: ClipboardEvent) => {
      const clipboardItems = event.clipboardData?.items;
      if (!clipboardItems) return;
      
      handlePastedImage(clipboardItems);
    };

    document.addEventListener("paste", handleGlobalPaste);
    return () => {
      document.removeEventListener("paste", handleGlobalPaste);
    };
  }, [handlePastedImage]);

  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift + Enter: Insert a new line
        e.preventDefault();
        setState(prev => ({ ...prev, text: prev.text + "\n" }));
      } else {
        // Enter: Submit the form
        e.preventDefault();
        handleConvert();
      }
    }
  };

  /**
   * Textarea change handler for manual text input.
   */
  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setState(prev => ({ ...prev, text: newText }));
    Analytics.trackTextInput(newText);
  };

  return (
    <Container>
      <Card className="w-full h-full
        md:border-[#218F98] 
        md:bg-white/95 
        md:shadow-sm 
        relative
        md:flex-row 
        md:items-stretch
        flex-col 
        items-center
        border-0
        md:border-2
        bg-white
        md:bg-white/95
        shadow-none
        md:shadow-sm">
        <Sparkle position="left" />
        <Sparkle position="right" />
        
        {/* Header Section */}
        <div className="w-full md:w-auto">
          <CardHeader className="relative 
            md:px-8 
            px-4 
            pt-6
            md:pt-8 
            md:pb-0">
            <Logo />
            <CardTitle className="text-center heading-signika 
              text-[1.2rem] 
              xs:text-[1.4rem] 
              sm:text-[1.8rem] 
              md:text-[2.2rem] 
              lg:text-[2.6rem] 
              xl:text-[3rem] 
              text-[#071E37] 
              tracking-[0.1em] 
              xs:tracking-[0.12em] 
              sm:tracking-[0.15em] 
              font-light 
              uppercase
              transition-all 
              duration-300 
              ease-in-out"
            >
              Calendarize
            </CardTitle>
            <Tagline />
          </CardHeader>
        </div>

        {/* Content Section */}
        <CardContent className="w-full 
          space-y-4
          md:space-y-6 
          px-4
          md:px-8">
          <HiddenFileInput
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".png, .jpeg, .jpg, .txt, .docx"
            title="Upload a text, image, or document file"
          />
          
          {/* Mobile-specific layout */}
          <div className="flex flex-col md:hidden space-y-4">
            <FileUploadZone
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onPaste={handlePaste}
              fileURL={state.fileURL}
            />
            <div className="relative bg-white/50 rounded-lg w-full">
              <textarea
                placeholder="Enter event details (date, time, topic, description) for better results."
                value={state.text}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                className="h-[120px]
                  font-medium
                  text-telegraf 
                  border-2
                  border-[#218F98]
                  bg-white/95 
                  placeholder:text-[#218F98]/80
                  placeholder:text-sm
                  placeholder:font-medium
                  placeholder:italic
                  text-[#071E37] 
                  text-base
                  tracking-wide
                  leading-6
                  w-full
                  rounded-lg 
                  overflow-y-auto 
                  p-4
                  transition-all
                  duration-300
                  ease-in-out
                  focus:outline-none
                  focus:border-[#218F98]
                  hover:shadow-[0_0_15px_rgba(33,143,152,0.15)]
                  focus:shadow-[0_0_15px_rgba(33,143,152,0.2)]
                  resize-none"
              />
            </div>
          </div>

          {/* Desktop-specific layout */}
          <div className="hidden md:flex md:flex-col md:space-y-6">
            <FileUploadZone
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onPaste={handlePaste}
              fileURL={state.fileURL}
            />
            <div className="relative bg-white/50 rounded-lg w-full">
              <textarea
                placeholder="Enter event details (date, time, topic, description) for better results."
                value={state.text}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                className="h-[180px]
                  font-medium
                  text-telegraf 
                  border-2
                  border-[#218F98]
                  bg-white/95 
                  placeholder:text-[#218F98]/80
                  placeholder:text-base
                  placeholder:font-medium
                  placeholder:italic
                  text-[#071E37] 
                  text-xl
                  tracking-wide
                  leading-7
                  w-full
                  rounded-lg 
                  overflow-y-auto 
                  p-6
                  transition-all
                  duration-300
                  ease-in-out
                  focus:outline-none
                  focus:border-[#218F98]
                  hover:shadow-[0_0_15px_rgba(33,143,152,0.15)]
                  focus:shadow-[0_0_15px_rgba(33,143,152,0.2)]
                  resize-none"
              />
            </div>
          </div>

          <Button
            onClick={handleConvert}
            disabled={state.isLoading}
            className="relative w-full bg-[#218F98] text-white text-telegraf 
              text-[11px] xs:text-sm sm:text-base md:text-lg lg:text-xl
              py-2 xs:py-2.5 sm:py-3
              overflow-hidden group
              transition-all duration-300 ease-in-out
              hover:bg-[#218F98] hover:shadow-lg hover:scale-[1.02]
              active:scale-[0.98]
              disabled:opacity-90 disabled:cursor-wait
              before:absolute before:inset-0 
              before:bg-white/10 before:transform before:scale-x-0 
              before:opacity-0 before:origin-left
              before:transition-transform before:duration-300
              hover:before:scale-x-100 hover:before:opacity-100"
          >
            <span className="relative z-10 flex items-center justify-center gap-1.5 xs:gap-2">
              {state.isLoading ? (
                <span className="flex items-center gap-2 xs:gap-3">
                  <span className="font-bold tracking-wide text-white text-shadow-sm whitespace-nowrap">
                    Converting
                  </span>
                  <LoadingSpinner />
                </span>
              ) : (
                <span className="font-bold tracking-wide text-white text-shadow-sm whitespace-nowrap">
                  {state.buttonLabel}
                </span>
              )}
            </span>
            <div className={`${CONFIG.ANIMATIONS.BUTTON}
              ${state.isLoading ? 'animate-shimmer' : 'translate-x-[-100%] group-hover:translate-x-[100%]'}`}>
            </div>
          </Button>
        </CardContent>
      </Card>

      {state.events.length > 0 && (
        <div className="space-y-4 
          md:space-y-6 
          w-full
          px-4
          md:px-0">
          
          {state.events.length > 1 && (
            <div className="flex justify-end mb-2">
              <Button 
                onClick={() => pushAllToGoogleCalendar(state.events)}
                className="bg-[#218F98] hover:bg-[#1a747b] text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
              >
                Push All to Google Calendar →
              </Button>
            </div>
          )}

          {state.events.map((event, index) => (
            <Card key={index} className="w-full 
              md:border-[#218F98] 
              bg-white
              md:bg-white/95 
              shadow-none
              md:shadow-sm 
              relative
              border-0
              md:border-2">
              <Sparkle position="right" />
              <GeneratedEventDisplay event={event} />
            </Card>
          ))}
        </div>
      )}

      <Footer />
    </Container>
  );
}

/* ----------------- LOCAL SUB-COMPONENTS ----------------- */

// Footer component
function Footer() {
  return (
    <footer className="mt-12 mb-8 text-center space-y-4">
      <div className="flex justify-center gap-6 text-sm text-[#6B909F] font-medium uppercase tracking-widest">
        <a href="/privacy" className="hover:text-[#218F98] transition-colors">Privacy Policy</a>
        <a href="/terms" className="hover:text-[#218F98] transition-colors">Terms of Service</a>
      </div>
      <p className="text-xs text-[#6B909F]/60">
        © 2026 Calendarize. Built with Gemini AI.
      </p>
    </footer>
  );
}


// Loading spinner component
function LoadingSpinner() {
  return (
    <svg 
      className="animate-spin h-4 w-4 text-white" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Main layout container
function Container({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-6 w-full h-full
      max-w-3xl mx-auto
      md:px-0 
      md:py-6
      min-h-[100dvh]
      md:min-h-0">
      {children}
    </section>
  );
}

// Decorative sparkles
function Sparkle({ position }: { position: "left" | "right" }) {
  const sideClass = position === "left" ? "left-4" : "right-4";
  return (
    <div className={`absolute top-4 ${sideClass}`}>
      <span className="text-[#218F98] text-xl" aria-hidden="true">✧</span>
    </div>
  );
}

// Logo block
function Logo() {
  return (
    <div className="flex justify-center mb-1">
      <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-[#218F98] rounded-lg relative flex items-center justify-center">
        <span className="text-[#218F98] text-xl sm:text-2xl font-light heading-signika">
          CZ
        </span>
        <div className="absolute -top-1 left-2 right-2 sm:left-3 sm:right-3 h-1 bg-white flex justify-between">
          <Dot />
          <Dot />
        </div>
      </div>
    </div>
  );
}

// Dot used in the Logo
function Dot() {
  return (
    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border-2 border-[#218F98] bg-white -mt-1" />
  );
}

// Tagline under the title
function Tagline() {
  return (
    <div className="text-center mt-6 space-y-1">
      <p className="text-[#218F98] tracking-[0.15em] text-[0.7rem] xs:text-[0.8rem] sm:text-[0.9rem] 
        font-bold heading-signika uppercase">
        Effortless Scheduling.
      </p>
      <p className="text-[#6B909F] tracking-[0.15em] text-[0.7rem] xs:text-[0.8rem] sm:text-[0.9rem] 
        font-bold heading-signika uppercase">
        Instant Planning.
      </p>
    </div>
  );
}

// Hidden file input for user-triggered uploads
const HiddenFileInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => <input ref={ref} type="file" className="hidden" {...props} />);
HiddenFileInput.displayName = "HiddenFileInput";

// Props for the file upload zone
interface FileUploadZoneProps {
  onClick: () => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  onPaste: (e: React.ClipboardEvent<HTMLDivElement>) => void; 
  fileURL: string | null;
}

// Drop zone with optional file preview
function FileUploadZone({ onClick, onDragOver, onDrop, onPaste, fileURL }: FileUploadZoneProps) {
  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onPaste={onPaste}
      className="group relative border-2 border-dashed border-[#218F98] rounded-lg 
        p-6 md:p-12 text-center cursor-pointer 
        hover:bg-[#218F98]/5 transition-colors
        min-h-[120px] md:min-h-[180px]"
      role="button"
      tabIndex={0}
      aria-label="Upload file area. Click or drag files here."
    >
      {/* Smooth beam effect container */}
      <div className="absolute inset-0 rounded-lg overflow-hidden">
        <div className="absolute inset-0 rounded-lg">
          <div className="absolute top-0 left-0 w-[50%] h-[2px] bg-gradient-to-r from-transparent via-[#218F98]/40 to-transparent
            animate-[beam-move-right_3s_ease-in-out_infinite]" />
          <div className="absolute top-0 right-0 w-[2px] h-[50%] bg-gradient-to-b from-transparent via-[#218F98]/40 to-transparent
            animate-[beam-move-down_3s_ease-in-out_infinite] delay-750" />
          <div className="absolute bottom-0 right-0 w-[50%] h-[2px] bg-gradient-to-r from-transparent via-[#218F98]/40 to-transparent
            animate-[beam-move-left_3s_ease-in-out_infinite] delay-1500" />
          <div className="absolute bottom-0 left-0 w-[2px] h-[50%] bg-gradient-to-b from-transparent via-[#218F98]/40 to-transparent
            animate-[beam-move-up_3s_ease-in-out_infinite] delay-2250" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <UploadIcon />
        <p className="text-sm text-[#218F98] uppercase tracking-wider font-bold">
          Drop image or document, or click to upload
        </p>
        {fileURL && (
          <div className="mt-4 w-full max-w-lg mx-auto border-2 border-[#218F98] rounded-lg overflow-hidden bg-white/95 shadow-md">
            <div className="relative w-full h-0 pb-[75%] p-2">
              <div className="absolute inset-0 m-2 border-2 border-[#A5C3C2] rounded-lg overflow-hidden flex items-center justify-center">
                <Image
                  src={fileURL}
                  alt={
                    /\.(png|jpe?g)$/i.test(fileURL)
                      ? "Uploaded file preview"
                      : "File preview not available"
                  }
                  layout="fill"
                  objectFit="contain"
                  className="p-1 hover:scale-[1.02] transition-transform duration-200 text-[#218F98] text-telegraf text-xl sm:text-2xl font-light tracking-wide"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Upload icon
function UploadIcon() {
  return (
    <div className="flex items-center space-x-4" aria-hidden="true">
      {/* Document SVG */}
      <svg
        className="h-8 w-8 text-[#218F98]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
             a1 1 0 01.707.293l5.414 5.414
             a1 1 0 01.293.707V19a2 2 0
             01-2 2z"
        />
      </svg>

      {/* Image SVG */}
      <svg
        className="h-8 w-8 text-[#218F98]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <g>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <circle cx="15" cy="9" r="2" />
          <path d="m3 18l6-6l9 9" />
        </g>
      </svg>
    </div>
  );
}