import logging
import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any

# Local imports
try:
    from event_generation.config.readenv import load_environment
except ImportError:
    # Fallback for direct execution/different paths
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from event_generation.config.readenv import load_environment

# Initialize env
load_environment()

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
ENV = os.getenv("ENV", "development")

class SecretFilter(logging.Filter):
    """
    Redacts sensitive API keys and secrets from logs.
    """
    def __init__(self, secrets_to_redact: list = None):
        super().__init__()
        self.secrets = []
        if secrets_to_redact:
            for s in secrets_to_redact:
                if s and len(s) > 5:  # Only redact keys that look substantial
                    self.secrets.append(s)

    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        for secret in self.secrets:
            if secret in message:
                message = message.replace(secret, "[REDACTED]")
        
        record.msg = message
        # Clear args since message is already formatted in getMessage() 
        # to prevent double formatting issues if there were placeholders
        record.args = ()
        return True

class JSONFormatter(logging.Formatter):
    """
    Formatter for Google Cloud Logging (JSON structure).
    """
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "logging.googleapis.com/sourceLocation": {
                "file": record.pathname,
                "line": record.lineno,
                "function": record.funcName,
            },
            "logger": record.name,
        }

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Add extra context if provided
        if hasattr(record, "extra"):
            log_entry.update(record.extra)

        return json.dumps(log_entry)

def setup_logger(name: str = "calendarize") -> logging.Logger:
    """
    Configure and return a structured logger.
    """
    logger = logging.getLogger(name)
    
    # Avoid duplicate handlers if setup_logger is called multiple times
    if logger.handlers:
        return logger

    logger.setLevel(getattr(logging, LOG_LEVEL))

    handler = logging.StreamHandler(sys.stdout)
    
    if ENV.lower() == "production":
        formatter = JSONFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
    
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    # Redaction Filter
    secrets = [
        os.getenv("GEMINI_API_KEY"),
    ]
    logger.addFilter(SecretFilter(secrets))

    # Prevent logs from propagating to the root logger (avoid double logging)
    logger.propagate = False
    
    return logger

# Default logger instance
logger = setup_logger()
