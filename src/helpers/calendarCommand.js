import { SlashCommandBuilder } from "discord.js";
import * as cal from "./calendar";

// /calendar            -> shows this month
// /calendar month:12   -> shows December of this year
// /calendar month:1 year:2027
export const calendarCommand = {
  data: new SlashCommandBuilder()
    .setName("calendar")
    .setDescription("Show a month calendar (Pacific time)")
    .addIntegerOption((o) =>
      o
        .setName("month")
        .setDescription("Month number, 1-12 (default: this month)")
        .setMinValue(1)
        .setMaxValue(12)
    )
    .addIntegerOption((o) =>
      o
        .setName("year")
        .setDescription("Year (default: this year)")
        .setMinValue(1970)
        .setMaxValue(2100)
    ),

  async execute(interaction) {
    const current = cal.now();
    const month = interaction.options.getInteger("month") ?? current.month;
    const year = interaction.options.getInteger("year") ?? current.year;

    await interaction.reply(cal.monthToText(year, month));
  },
};
