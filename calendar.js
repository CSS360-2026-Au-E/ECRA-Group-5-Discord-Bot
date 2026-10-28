// calendar.js
// Handles dates, hours, and events for the Discord calendar bot.
// All times are entered and displayed in Pacific time (PST/PDT).
//
// Install the date library first:  npm install luxon

const { DateTime } = require('luxon');

// "America/Los_Angeles" automatically switches between PST (winter) and
// PDT (summer), so events stay at the right hour all year.
const ZONE = 'America/Los_Angeles';

// In-memory storage: event id -> event object.
// (This resets when the bot restarts; swap in a JSON file or database later.)
const events = new Map();
let nextId = 1;

// ---------- Date / hour helpers ----------

// Turn "2026-11-05" + hour (0-23) into a Pacific-time DateTime.
function toDateTime(dateStr, hour) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error('Hour must be a whole number from 0 to 23.');
  }
  const day = DateTime.fromISO(dateStr, { zone: ZONE });
  if (!day.isValid) {
    throw new Error(`"${dateStr}" is not a valid date. Use YYYY-MM-DD.`);
  }
  return day.set({ hour, minute: 0, second: 0, millisecond: 0 });
}

// Current time in Pacific.
function now() {
  return DateTime.now().setZone(ZONE);
}

// Nice display, e.g. "Thu, Nov 5, 2026 at 3 PM PST"
function formatTime(dt) {
  return dt.setZone(ZONE).toFormat("ccc, LLL d, yyyy 'at' h a ZZZZ");
}

// Hour label, e.g. 0 -> "12 AM", 15 -> "3 PM"
function hourLabel(hour) {
  return DateTime.fromObject({ hour }, { zone: ZONE }).toFormat('h a');
}

// ---------- Event functions ----------

// Add an event. Returns the new event.
function addEvent({ title, date, hour, durationHours = 1, createdBy, assignees = [] }) {
  if (!title) throw new Error('Event needs a title.');
  const start = toDateTime(date, hour);
  const event = {
    id: nextId++,
    title,
    start: start.toUTC().toISO(), // store in UTC, convert when showing
    durationHours,
    createdBy,                    // Discord user id
    assignees,                    // array of Discord user ids (for tasks)
    remindersOn: false,           // teammates handling reminders can use this
  };
  events.set(event.id, event);
  return event;
}

// Change an event. Pass only the fields you want to change.
// To move it, pass both date and hour.
function updateEvent(id, changes) {
  const event = events.get(id);
  if (!event) throw new Error(`No event with id ${id}.`);

  if (changes.date !== undefined || changes.hour !== undefined) {
    const current = getStart(event);
    const date = changes.date ?? current.toISODate();
    const hour = changes.hour ?? current.hour;
    event.start = toDateTime(date, hour).toUTC().toISO();
  }
  if (changes.title !== undefined) event.title = changes.title;
  if (changes.durationHours !== undefined) event.durationHours = changes.durationHours;
  if (changes.assignees !== undefined) event.assignees = changes.assignees;
  if (changes.remindersOn !== undefined) event.remindersOn = changes.remindersOn;
  return event;
}

// Delete an event. Returns true if something was deleted.
function deleteEvent(id) {
  return events.delete(id);
}

// Event start as a Pacific-time DateTime.
function getStart(event) {
  return DateTime.fromISO(event.start).setZone(ZONE);
}

// All events on one day ("2026-11-05"), sorted by time.
function getEventsOnDay(dateStr) {
  const day = DateTime.fromISO(dateStr, { zone: ZONE });
  if (!day.isValid) throw new Error(`"${dateStr}" is not a valid date.`);
  return [...events.values()]
    .filter(e => getStart(e).hasSame(day, 'day'))
    .sort((a, b) => getStart(a) - getStart(b));
}

// A day broken into 24 hour slots, each with its events.
function getDaySchedule(dateStr) {
  const dayEvents = getEventsOnDay(dateStr);
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    slots.push({
      hour,
      label: hourLabel(hour),
      events: dayEvents.filter(e => getStart(e).hour === hour),
    });
  }
  return slots;
}

// Text version of a day, ready to send in a Discord message.
function dayToText(dateStr) {
  const day = DateTime.fromISO(dateStr, { zone: ZONE });
  const lines = [`**${day.toFormat('cccc, LLLL d, yyyy')}** (Pacific time)`];
  for (const slot of getDaySchedule(dateStr)) {
    for (const e of slot.events) {
      lines.push(`\`${slot.label.padStart(5)}\` #${e.id} ${e.title}`);
    }
  }
  if (lines.length === 1) lines.push('No events.');
  return lines.join('\n');
}

// All dates in a month, for drawing a month view.
// month is 1-12. Returns weeks (arrays of 7, Sunday first; null = blank).
function getMonthGrid(year, month) {
  const first = DateTime.fromObject({ year, month, day: 1 }, { zone: ZONE });
  const weeks = [];
  let week = new Array(first.weekday % 7).fill(null); // Luxon: Mon=1 ... Sun=7
  for (let d = 1; d <= first.daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) weeks.push([...week, ...new Array(7 - week.length).fill(null)]);
  return weeks;
}

module.exports = {
  ZONE,
  now,
  toDateTime,
  formatTime,
  hourLabel,
  addEvent,
  updateEvent,
  deleteEvent,
  getStart,
  getEventsOnDay,
  getDaySchedule,
  dayToText,
  getMonthGrid,
};
