import { startReminderScheduler } from "../reminders/reminderScheduler";
import { commands } from "../helpers/commands";

const event = {
  name: "ready",
  once: true,
  async execute(client) {
    // Register the slash commands in every server the bot is in.
    // Server commands show up right away (global ones can take a while).
    const commandData = commands.map((c) => c.data);
    for (const guild of client.guilds.cache.values()) {
      await guild.commands.set(commandData);
    }
    
    startReminderScheduler(client);

    console.log(`
    ############################################################
    #  Logged in as ${client.user.username}!
    #  Serving ${client.guilds.cache.size} servers.
    #  Serving ${client.users.cache.size} users.
    ############################################################
  `);
  },
};

export default event;
