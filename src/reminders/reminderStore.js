import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const REMINDERS_FILE = path.join(DATA_DIR, "reminders.json");

// Read saved reminders, or return an empty list.
export function getReminders() {
  if (!fs.existsSync(REMINDERS_FILE)) return [];

  try {
    return JSON.parse(fs.readFileSync(REMINDERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

// Save all reminders.
export function saveReminders(reminders) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(REMINDERS_FILE, JSON.stringify(reminders, null, 2));
}

// Add a reminder with its own ID.
export function addReminder({
  type,
  itemId,
  title,
  remindAt,
  createdBy,
}) {
  const reminders = getReminders();
  const nextId =
    reminders.reduce((max, reminder) => Math.max(max, reminder.id), 0) + 1;

  const reminder = {
    id: nextId,
    type,
    itemId,
    title,
    remindAt,
    createdBy,
    sent: false,
  };

  reminders.push(reminder);
  saveReminders(reminders);
  return reminder;
}
