// calendar.js
// The calendar itself: dates, days, months, and hours, all in Pacific time.
// Other parts of the bot (adding events, tasks, reminders) build on these.
//
// Requires Luxon:  npm install luxon

import { DateTime } from "luxon";

// "America/Los_Angeles" switches between PST (winter) and PDT (summer)
// automatically, so times stay correct all year.
export const ZONE = "America/Los_Angeles";

// ---------- Current time ----------

// Right now, in Pacific time.
export function now() {
  return DateTime.now().setZone(ZONE);
}

// Today's date as "YYYY-MM-DD".
export function today() {
  return now().toISODate();
}

// ---------- Dates ----------

// True if the text is a real date in YYYY-MM-DD format.
export function isValidDate(dateStr) {
  return DateTime.fromISO(dateStr, { zone: ZONE }).isValid;
}

// Turn "2026-11-05" into a Pacific-time date (start of that day).
export function toDate(dateStr) {
  const day = DateTime.fromISO(dateStr, { zone: ZONE });
  if (!day.isValid) {
    throw new Error(`"${dateStr}" is not a valid date. Use YYYY-MM-DD.`);
  }
  return day.startOf("day");
}

// Turn "2026-11-05" + hour (0-23) into a Pacific-time date and time.
export function toDateTime(dateStr, hour) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("Hour must be a whole number from 0 to 23.");
  }
  return toDate(dateStr).set({ hour });
}

// ---------- Display ----------

// "Thu, Nov 5, 2026 at 3 PM PST"
export function formatTime(dt) {
  return dt.setZone(ZONE).toFormat("ccc, LLL d, yyyy 'at' h a ZZZZ");
}

// "Thursday, November 5, 2026"
export function formatDate(dt) {
  return dt.setZone(ZONE).toFormat("cccc, LLLL d, yyyy");
}

// 0 -> "12 AM", 15 -> "3 PM"
export function hourLabel(hour) {
  return DateTime.fromObject({ hour }, { zone: ZONE }).toFormat("h a");
}

// ---------- Days and hours ----------

// The 24 hours of a day. Each slot has the hour number, a label, and the
// exact start time, so events can be matched to a slot later.
export function getHours(dateStr) {
  const day = toDate(dateStr);
  const hours = [];
  for (let hour = 0; hour < 24; hour++) {
    hours.push({ hour, label: hourLabel(hour), start: day.set({ hour }) });
  }
  return hours;
}

// ---------- Months ----------

// The weeks of a month (month is 1-12), Sunday first.
// Each week is 7 slots: a day number, or null for blank spaces.
export function getMonthGrid(year, month) {
  const first = DateTime.fromObject({ year, month, day: 1 }, { zone: ZONE });
  if (!first.isValid) throw new Error("Month must be from 1 to 12.");

  const weeks = [];
  let week = new Array(first.weekday % 7).fill(null); // Luxon: Mon=1 ... Sun=7
  for (let d = 1; d <= first.daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    weeks.push([...week, ...new Array(7 - week.length).fill(null)]);
  }
  return weeks;
}

// A month as text, ready to send in a Discord message.
// Today's date is marked with *.
export function monthToText(year, month) {
  const first = DateTime.fromObject({ year, month, day: 1 }, { zone: ZONE });
  const t = now();
  const isThisMonth = t.year === year && t.month === month;

  const lines = [" Su  Mo  Tu  We  Th  Fr  Sa"];
  for (const week of getMonthGrid(year, month)) {
    lines.push(
      week
        .map((d) => {
          if (d === null) return "    ";
          const mark = isThisMonth && d === t.day ? "*" : " ";
          return String(d).padStart(3) + mark;
        })
        .join("")
        .trimEnd()
    );
  }
  return `**${first.toFormat("LLLL yyyy")}** (Pacific time)\n\`\`\`\n${lines.join("\n")}\n\`\`\``;
}
