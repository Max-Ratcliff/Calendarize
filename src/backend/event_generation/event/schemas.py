from typing import List, Optional
from pydantic import BaseModel, Field

class AIEvent(BaseModel):
    """
    Schema for a single event as returned by the AI.
    Used for strict validation of Gemini's output.
    """
    title: str = Field(..., description="Title of the event")
    is_all_day: bool = Field(default=False)
    start_time: str = Field(..., description="ISO 8601 or YYYYMMDDTHHMMSS format")
    end_time: Optional[str] = Field(None, description="ISO 8601 or YYYYMMDDTHHMMSS format")
    time_zone: str = Field(default="UTC")
    description: Optional[str] = None
    location: Optional[str] = None
    attendees: List[str] = Field(default_factory=list)
    is_recurring: bool = Field(default=False)
    recurrence_pattern: Optional[str] = Field(None, pattern="^(DAILY|WEEKLY|MONTHLY|YEARLY)$")
    recurrence_days: Optional[List[str]] = None
    recurrence_count: Optional[int] = None
    recurrence_end_date: Optional[str] = None

class AIResponse(BaseModel):
    """
    Schema for the full response from Gemini.
    """
    events: List[AIEvent]
