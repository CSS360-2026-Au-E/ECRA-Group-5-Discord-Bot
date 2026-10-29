import { commands } from "../helpers/commands";

// Runs whenever someone uses a slash command, and passes it to the
// matching command in helpers/commands.js.
const event = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.find(
      (c) => c.data.name === interaction.commandName
    );
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      // Only the person who ran the command sees this.
      const message = { content: err.message, ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(message);
      } else {
        await interaction.reply(message);
      }
    }
  },
};

export default event;
