import { SlashCommandBuilder } from "discord.js";
import { addCalendarEvent } from "./calendarStore";

// /event add title:Team meeting date:2026-10-30 time:15:00
export const eventCommand = {
  data: new SlashCommandBuilder()
    .setName("event")
    .setDescription("Calendar events")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add an event to the calendar")
        .addStringOption((o) =>
          o.setName("title").setDescription("What the event is, e.g. Team meeting").setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("date").setDescription("Date as YYYY-MM-DD, e.g. 2026-10-30").setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("time").setDescription("Time as HH:MM (24-hour, Pacific), e.g. 15:00").setRequired(true)
        )
    ),

  async execute(interaction) {
    if (interaction.options.getSubcommand() !== "add") return;

    const title = interaction.options.getString("title").trim();
    const date = interaction.options.getString("date").trim();
    const time = normalizeTime(interaction.options.getString("time").trim());

    // Check the date and time are real
    if (!isValidDate(date)) {
      return interaction.reply({
        content: `"${date}" is not a valid date. Use YYYY-MM-DD, e.g. 2026-10-30.`,
        ephemeral: true,
      });
    }
    if (!time) {
      return interaction.reply({
        content: "That is not a valid time. Use 24-hour HH:MM, e.g. 15:00.",
        ephemeral: true,
      });
    }

    // Save the event
    const saved = addCalendarEvent({
      title,
      date,
      time,
      createdBy: interaction.user.username,
    });

    // Confirm it was added
    return interaction.reply(
      `📅 **Event added!**\n` +
        `**Title:** ${saved.title}\n` +
        `**Date:** ${saved.date}\n` +
        `**Time:** ${saved.time}\n` +
        `**Event ID:** ${saved.id}`
    );
  },
};

// true if text is a real date like 2026-10-30 (rejects 2026-02-30)
function isValidDate(text) {
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const check = new Date(y, m - 1, d);
  return check.getFullYear() === y && check.getMonth() === m - 1 && check.getDate() === d;
}

// turns "9:05" into "09:05", or null if it isn't a real time
function normalizeTime(text) {
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}