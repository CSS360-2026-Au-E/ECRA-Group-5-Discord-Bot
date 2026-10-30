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

// Add one new event and give it the next ID number.
// location and description are optional and saved as null when left out.
// TODO: createdBy is a username, which can change. Store the user ID
// (createdById) instead once we add permission checks for edit/delete.
export function addCalendarEvent({ title, date, time, location, description, createdBy }) {
  const events = getCalendarEvents();
  const nextId = events.reduce((max, e) => Math.max(max, e.id), 0) + 1;
  const newEvent = {
    id: nextId,
    title,
    date,
    time,
    location: location ?? null,
    description: description ?? null,
    createdBy,
  };
  events.push(newEvent);
  saveCalendarEvents(events);
  return newEvent;
}

// Find one event by its ID (returns undefined if there is none)
export function getCalendarEventById(id) {
  return getCalendarEvents().find((e) => e.id === id);
}

// Merge `changes` into the event with this ID.
// Keys set to undefined are ignored, so blank options keep their old value.
// Returns the updated event, or null if there is no event with that ID.
export function updateCalendarEvent(id, changes) {
  const events = getCalendarEvents();
  const index = events.findIndex((e) => e.id === id);
  if (index === -1) return null;

  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined) events[index][key] = value;
  }
  saveCalendarEvents(events);
  return events[index];
}

// Remove an event, past or upcoming.
// Returns the removed event, or null if there is no event with that ID.
export function deleteCalendarEvent(id) {
  const events = getCalendarEvents();
  const index = events.findIndex((e) => e.id === id);
  if (index === -1) return null;

  const [removed] = events.splice(index, 1);
  saveCalendarEvents(events);
  return removed;
}
