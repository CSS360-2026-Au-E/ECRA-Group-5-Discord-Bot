import { SlashCommandBuilder, userMention } from "discord.js";
import * as cal from "./calendar";
import { addTask } from "./taskStore";

// How many people one task can be assigned to.
const MAX_ASSIGNEES = 5;

// /task add title:Write sprint report due:2026-11-03 assignee:@Sarah
// /task add title:Demo prep due:2026-11-05 assignee:@Sarah assignee2:@Cam assignee3:@Zad
export const taskCommand = {
  data: new SlashCommandBuilder()
    .setName("task")
    .setDescription("Tasks and to-dos")
    .addSubcommand((sub) => {
      sub
        .setName("add")
        .setDescription("Add a task")
        .addStringOption((o) =>
          o.setName("title").setDescription("What needs doing, e.g. Write sprint report").setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("due").setDescription("Due date as YYYY-MM-DD, e.g. 2026-11-03").setRequired(true)
        )
        .addUserOption((o) =>
          o.setName("assignee").setDescription("Who the task is for").setRequired(true)
        );

      // Extra optional assignees: assignee2, assignee3, ...
      for (let i = 2; i <= MAX_ASSIGNEES; i++) {
        sub.addUserOption((o) =>
          o.setName(`assignee${i}`).setDescription("Another person the task is for (optional)")
        );
      }
      return sub;
    }),

  async execute(interaction) {
    if (interaction.options.getSubcommand() !== "add") return;

    const title = interaction.options.getString("title").trim();
    const due = interaction.options.getString("due").trim();

    // Collect everyone picked, skipping empty slots and duplicates.
    const assigneeIds = [];
    for (let i = 1; i <= MAX_ASSIGNEES; i++) {
      const user = interaction.options.getUser(i === 1 ? "assignee" : `assignee${i}`);
      if (user && !assigneeIds.includes(user.id)) assigneeIds.push(user.id);
    }

    if (!title) {
      return interaction.reply({ content: "The task needs a title.", ephemeral: true });
    }
    if (!isRealDate(due)) {
      return interaction.reply({
        content: `"${due}" is not a valid date. Use YYYY-MM-DD, e.g. 2026-11-03.`,
        ephemeral: true,
      });
    }
    if (due < cal.today()) {
      return interaction.reply({ content: "That due date has already passed.", ephemeral: true });
    }

    const saved = addTask({
      title,
      due,
      assigneeIds,
      createdBy: interaction.user.username,
    });

    return interaction.reply(
      `📝 **Task added!**\n` +
        `**Title:** ${saved.title}\n` +
        `**Due:** ${cal.formatDate(cal.toDate(saved.due))}\n` +
        `**Assigned to:** ${saved.assigneeIds.map((id) => userMention(id)).join(", ")}\n` +
        `**Task ID:** ${saved.id}`
    );
  },
};

// true only for a real date written exactly as YYYY-MM-DD
function isRealDate(text) {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && cal.isValidDate(text);
}