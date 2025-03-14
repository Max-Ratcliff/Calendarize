# Calendarize - AI Calendar Event Generator

![icon](src/frontend/app/favicon.ico)

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://calendarize.ratcliff.cc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Calendarize is an Gemini/OpenAI powered tool designed to generate calendar events from images or text. Utilizing the OpenAI API, Calendarize extracts relevant event details and creates calendar events that are compatible with most calendar applications.

---

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Command-Line Interface](#command-line-interface)
- [Future Improvements](#future-improvements)

## Installation

To install the necessary dependencies, run the following command in your terminal:

```bash
bash setup.sh
```

Alternatively, for the backend requirements, run:

```bash
pip install -r ./src/backend/requirements.txt
```

## Usage

After installation, start the application locally by running:

```bash
bash runlocal.sh
```

Once the application is running, open your web browser and navigate to:

`http://localhost:3000/`

This will allow you to interact with the event converter.

## Command-Line Interface

Calendarize also provides a CLI for generating calendar events. To test the CLI, navigate to the backend directory and run:

```bash
python -m event_generation.testing.test_to_cal_cli
```

### CLI Options

- **Image Input**:
  - Provide the path to an image file (e.g., `./src/backend/event_generation/testing/single_event.png`). In this mode, `image_parser.py` processes the image to extract text before invoking `text_parser.py`.

- **Text Input**:
  - Enter your event prompt directly. In this mode, `text_parser.py` is used to generate an `Event` object with all relevant details and links.

To generate an ICS file, modify the `genIcal` flag in `test_to_cal_cli.py` to `true`.

### Running the Application as a CLI

Ensure all dependencies are installed before running the CLI. The CLI script outputs an `Event` object that includes all event details and calendar links, facilitating easy import into your preferred calendar application.

## Future Improvements

- Enable post-generation editing of events
- Integrate additional calendar services
- Enhance error handling and improve the user interface

---

For further assistance or more detailed documentation, please consult the project documentation or contact the development team.
