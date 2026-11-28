import fs from "fs";
import path from "path";

// All calendar events are saved in data/events.json
const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");

// Read saved events (returns [] if there are none yet).
// Pass a Discord server ID (guildId) to get only that server's events.
// Leave it out to get every server's events (used by the reminder scheduler).
export function getCalendarEvents(guildId) {
  if (!fs.existsSync(EVENTS_FILE)) return [];
  let events;
  try {
    events = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8"));
  } catch {
    return [];
  }
  return guildId === undefined ? events : events.filter((e) => e.guildId === guildId);
}

// Save the full list of events
export function saveCalendarEvents(events) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

// Add one new event and give it the next ID number.
// location and description are optional and saved as null when left out.
// createdBy is the creator's username (for display). createdById is their
// Discord user ID, which never changes, so permission checks use it.
export function addCalendarEvent({ guildId, title, date, time, location, description, createdBy, createdById }) {  const events = getCalendarEvents();
  const nextId = events.reduce((max, e) => Math.max(max, e.id), 0) + 1;
  const newEvent = {
    id: nextId,
    guildId: guildId ?? null,
    title,
    date,
    time,
    location: location ?? null,
    description: description ?? null,
    createdBy,
    createdById: createdById ?? null,
  };
  events.push(newEvent);
  saveCalendarEvents(events);
  return newEvent;
}

// Find one event by its ID (returns undefined if there is none).
// With a guildId, events from other servers are treated as not found.
export function getCalendarEventById(id, guildId) {
  return getCalendarEvents(guildId).find((e) => e.id === id);
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
