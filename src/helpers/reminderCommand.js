import { SlashCommandBuilder } from "discord.js";
import * as cal from "./calendar";
import { getTasks } from "./taskStore";
import { getCalendarEvents } from "./calendarStore";
import { addReminder } from "../reminders/reminderStore";

export const reminderCommand = {
  data: new SlashCommandBuilder()
    .setName("reminder")
    .setDescription("Create reminders for tasks and events")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add a reminder for a task or event")
        .addStringOption((o) =>
          o
            .setName("type")
            .setDescription("What the reminder is for")
            .setRequired(true)
            .addChoices(
              { name: "Task", value: "task" },
              { name: "Event", value: "event" }
            )
        )
        .addIntegerOption((o) =>
          o
            .setName("item_id")
            .setDescription("The ID of the existing task or event")
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption((o) =>
          o
            .setName("date")
            .setDescription("Reminder date, YYYY-MM-DD")
            .setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName("time")
            .setDescription("Reminder time, 24-hour Pacific time, HH:MM")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (interaction.options.getSubcommand() !== "add") return;

    const type = interaction.options.getString("type");
    const itemId = interaction.options.getInteger("item_id");
    const date = interaction.options.getString("date").trim();
    const time = cal.normalizeTime(
      interaction.options.getString("time").trim()
    );

    if (!cal.isValidDate(date)) {
      return interaction.reply({
        content: "Use a valid date in YYYY-MM-DD format.",
        ephemeral: true,
      });
    }

    if (!time) {
      return interaction.reply({
        content: "Use a valid time in 24-hour HH:MM format, Pacific time.",
        ephemeral: true,
      });
    }

    const items =
      type === "task" ? getTasks() : getCalendarEvents();
    const item = items.find((entry) => entry.id === itemId);

    if (!item) {
      return interaction.reply({
        content: `I couldn't find ${type} ID ${itemId}.`,
        ephemeral: true,
      });
    }

    if (type === "task" && item.done) {
      return interaction.reply({
        content: "You can't create a reminder for a completed task.",
        ephemeral: true,
      });
    }

    const [hour, minute] = time.split(":").map(Number);
    const remindAt = cal.toDate(date).set({ hour, minute });

    if (remindAt <= cal.now()) {
      return interaction.reply({
        content: "The reminder date and time must be in the future.",
        ephemeral: true,
      });
    }

    const reminder = addReminder({
      type,
      itemId,
      title: item.title,
      remindAt: remindAt.toISO(),
      createdBy: interaction.user.id,
    });

    return interaction.reply(
      `⏰ **Reminder created!**\n` +
        `**For:** ${item.title} (${type} ID ${itemId})\n` +
        `**When:** ${remindAt.toFormat("ccc, LLL dd, yyyy 'at' h:mm a")} PDT\n` +
        `**Reminder ID:** ${reminder.id}\n` +
        `I'll notify you when it's due.`
    );
  },
};
