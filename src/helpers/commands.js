import { calendarCommand } from "./calendarCommand";
import { dayCommand } from "./dayCommand";
import { eventCommand } from "./eventCommand";

// Every slash command the bot has.
// To add a new command: make a file like calendarCommand.js that exports
// { data, execute }, import it here, and add it to this list.
export const commands = [calendarCommand, dayCommand, eventCommand];
