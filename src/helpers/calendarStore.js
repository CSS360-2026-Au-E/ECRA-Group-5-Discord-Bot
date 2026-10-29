import fs from "fs";
import path from "path";

// All calendar events are saved in data/events.json
const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");

// Read all saved events (returns [] if there are none yet)
export function getCalendarEvents() {
  if (!fs.existsSync(EVENTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8"));
  } catch {
    return [];
  }
}

// Save the full list of events
export function saveCalendarEvents(events) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

// Add one new event and give it the next ID number
export function addCalendarEvent({ title, date, time, createdBy }) {
  const events = getCalendarEvents();
  const nextId = events.reduce((max, e) => Math.max(max, e.id), 0) + 1;
  const newEvent = { id: nextId, title, date, time, createdBy };
  events.push(newEvent);
  saveCalendarEvents(events);
  return newEvent;
}