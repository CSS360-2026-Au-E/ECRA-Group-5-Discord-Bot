# Calendar and Tasks Discord Bot

A Discord bot that helps server members organize events, manage tasks, and keep track of their schedules. Users can view a calendar, create and manage events, assign tasks to other members, and receive reminders through Discord direct messages.

## Features

### Calendar
- View a monthly calendar using `/calendar`.
- Select a month and year to view.
- View a specific day's schedule using `/day`.
- Displays dates and times in Pacific Time.

### Events
- Add events with a title, date, and time.
- Include optional locations and descriptions.
- Edit existing events.
- Delete events.
- Each event has a unique ID.

### Tasks
- Create tasks with a title, due date, and time.
- Assign tasks to one or more Discord users.
- Edit existing tasks and manage assignees.
- Mark tasks as complete.
- Reopen completed tasks.
- Each task has a unique ID.

### Reminders
- Create reminders for existing tasks and events.
- Receive reminders through Discord direct messages.
- Reminders are checked automatically by the bot.
- Reminders for deleted events and completed tasks are skipped.

## Usage

The bot uses Discord slash commands. Type `/` in a server where the bot is installed to view the available commands.

| Command | Purpose |
|---|---|
| `/calendar` | View a monthly calendar. |
| `/day` | View a specific day's schedule. |
| `/event add` | Create an event. |
| `/event edit` | Edit an existing event. |
| `/event delete` | Delete an event. |
| `/task add` | Create and assign a task. |
| `/task edit` | Edit a task and manage its assignees. |
| `/task complete` | Complete or reopen a task. |
| `/reminder add` | Create a reminder for a task or event. |

Dates use the `YYYY-MM-DD` format, and times use the 24-hour `HH:MM` format.

## Team

**ECRA Group 5**  
CSS 360 – Software Engineering  
University of Washington Bothell

- Zad
- Ilakshi
- Hakan
- Sarah
- Cam
