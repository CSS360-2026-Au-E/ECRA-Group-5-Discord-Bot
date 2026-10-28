import { SlashCommandBuilder } from "discord.js";
import * as cal from "./calendar";

// /day                         -> today's hours
// /day date:2026-11-05         -> that day's hours
// /day date:2026-11-05 from:8 to:18   -> only 8 AM to 6 PM
export const dayCommand = {
  data: new SlashCommandBuilder()
    .setName("day")
    .setDescription("Show a day's hour slots (Pacific time)")
    .addStringOption((o) =>
      o.setName("date").setDescription("Date as YYYY-MM-DD (default: today)")
    )
    .addIntegerOption((o) =>
      o
        .setName("from")
        .setDescription("First hour to show, 0-23 (default: 0, midnight)")
        .setMinValue(0)
        .setMaxValue(23)
    )
    .addIntegerOption((o) =>
      o
        .setName("to")
        .setDescription("Last hour to show, 0-23 (default: 23, 11 PM)")
        .setMinValue(0)
        .setMaxValue(23)
    ),

  async execute(interaction) {
    const date = interaction.options.getString("date") ?? cal.today();
    const from = interaction.options.getInteger("from") ?? 0;
    const to = interaction.options.getInteger("to") ?? 23;

    await interaction.reply(cal.dayToText(date, from, to));
  },
};
