
import { getReminders, saveReminders } from "./reminderStore";
import { getTasks } from "../helpers/taskStore";
import { getCalendarEvents } from "../helpers/calendarStore";
import * as cal from "../helpers/calendar";

let intervalId;
let checking = false;

export function startReminderScheduler(client) {
  if (intervalId) return;

  const checkReminders = async () => {
    if (checking) return;
    checking = true;

    try {
      const reminders = getReminders();
      const tasks = getTasks();
      const events = getCalendarEvents();
      const now = cal.now();

      for (const reminder of reminders) {
        if (reminder.sent || !reminder.remindAt) continue;

        const remindAt = new Date(reminder.remindAt);
        if (Number.isNaN(remindAt.getTime()) || remindAt > now.toJSDate()) {
          continue;
        }

        const items = reminder.type === "task" ? tasks : events;
        const item = items.find((entry) => entry.id === reminder.itemId);

        // Skip reminders for deleted items or completed tasks.
        if (!item || (reminder.type === "task" && item.done)) {
          reminder.sent = true;
          reminder.skipped = true;
          saveReminders(reminders);
          continue;
        }

        try {
          const user = await client.users.fetch(reminder.createdBy);
          await user.send(
            `⏰ **Reminder:** ${reminder.title}\n` +
              `Your ${reminder.type} (ID ${reminder.itemId}) is due for a reminder now.`
          );

          reminder.sent = true;
          saveReminders(reminders);
        } catch (error) {
          console.error(`Could not send reminder ${reminder.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Reminder scheduler error:", error);
    } finally {
      checking = false;
    }
  };

  checkReminders();
  intervalId = setInterval(checkReminders, 30_000);
}
