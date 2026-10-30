import { SlashCommandBuilder } from "discord.js";
import * as cal from "./calendar";
import {
  addCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventById,
  updateCalendarEvent,
} from "./calendarStore";

// /event add title:Team meeting date:2026-10-30 time:15:00 location:Room 204 description:Sprint planning
// /event edit id:3 time:16:00 location:Library
// /event delete id:3
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
        .addStringOption((o) =>
          o.setName("location").setDescription("Where it happens, e.g. Room 204 (optional)")
        )
        .addStringOption((o) =>
          o.setName("description").setDescription("More details about the event (optional)")
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Change an event. Leave an option blank to keep it.")
        .addIntegerOption((o) =>
          o.setName("id").setDescription("Event ID, shown when the event was added").setRequired(true)
        )
        .addStringOption((o) => o.setName("title").setDescription("New title"))
        .addStringOption((o) => o.setName("date").setDescription("New date as YYYY-MM-DD"))
        .addStringOption((o) => o.setName("time").setDescription("New time as HH:MM (24-hour, Pacific)"))
        .addStringOption((o) => o.setName("location").setDescription("New location"))
        .addStringOption((o) => o.setName("description").setDescription("New description"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Delete a past or upcoming event")
        .addIntegerOption((o) =>
          o.setName("id").setDescription("Event ID, shown when the event was added").setRequired(true)
        )
    ),

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case "add":
        return handleAdd(interaction);
      case "edit":
        return handleEdit(interaction);
      case "delete":
        return handleDelete(interaction);
    }
  },
};

// /event add
async function handleAdd(interaction) {
  const title = interaction.options.getString("title").trim();
  const date = interaction.options.getString("date").trim();
  const time = cal.normalizeTime(interaction.options.getString("time").trim());
  const location = optionalText(interaction, "location");
  const description = optionalText(interaction, "description");

  // Check the date and time are real
  if (!cal.isValidDate(date)) {
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
    location,
    description,
    createdBy: interaction.user.username,
  });

  // Confirm it was added
  return interaction.reply(`📅 **Event added!**\n${eventDetails(saved)}`);
}

// /event edit
async function handleEdit(interaction) {
  const id = interaction.options.getInteger("id");
  if (!getCalendarEventById(id)) {
    return interaction.reply({ content: `There is no event with ID ${id}.`, ephemeral: true });
  }

  // TODO: permission check. Only the creator or a moderator should edit.
  // Events store the creator's username for now (see calendarStore.js).

  const changes = {};

  const title = optionalText(interaction, "title");
  if (title !== undefined) changes.title = title;

  const date = optionalText(interaction, "date");
  if (date !== undefined) {
    if (!cal.isValidDate(date)) {
      return interaction.reply({
        content: `"${date}" is not a valid date. Use YYYY-MM-DD, e.g. 2026-10-30.`,
        ephemeral: true,
      });
    }
    changes.date = date;
  }

  const timeText = optionalText(interaction, "time");
  if (timeText !== undefined) {
    const time = cal.normalizeTime(timeText);
    if (!time) {
      return interaction.reply({
        content: "That is not a valid time. Use 24-hour HH:MM, e.g. 15:00.",
        ephemeral: true,
      });
    }
    changes.time = time;
  }

  // TODO: decide how a user clears location/description (e.g. typing "none").
  changes.location = optionalText(interaction, "location");
  changes.description = optionalText(interaction, "description");

  const changedFields = Object.keys(changes).filter((key) => changes[key] !== undefined);
  if (changedFields.length === 0) {
    return interaction.reply({
      content: "Nothing to change. Fill in at least one option besides the ID.",
      ephemeral: true,
    });
  }

  const updated = updateCalendarEvent(id, changes);
  return interaction.reply(
    `✏️ **Event updated!** Changed: ${changedFields.join(", ")}\n${eventDetails(updated)}`
  );
}

// /event delete
async function handleDelete(interaction) {
  const id = interaction.options.getInteger("id");

  // TODO: permission check. Only the creator or a moderator should delete.
  // Events store the creator's username for now (see calendarStore.js).

  const removed = deleteCalendarEvent(id);
  if (!removed) {
    return interaction.reply({ content: `There is no event with ID ${id}.`, ephemeral: true });
  }
  return interaction.reply(`🗑️ **Event deleted:** ${removed.title} (ID ${removed.id})`);
}

// The text of an optional string option, trimmed. undefined if left blank.
function optionalText(interaction, name) {
  const text = interaction.options.getString(name)?.trim();
  return text ? text : undefined;
}

// The lines shown after an event is added or edited
function eventDetails(event) {
  const lines = [
    `**Title:** ${event.title}`,
    `**Date:** ${event.date}`,
    `**Time:** ${event.time}`,
  ];
  if (event.location) lines.push(`**Location:** ${event.location}`);
  if (event.description) lines.push(`**Description:** ${event.description}`);
  lines.push(`**Event ID:** ${event.id}`);
  return lines.join("\n");
}
