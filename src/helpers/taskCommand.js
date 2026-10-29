import { SlashCommandBuilder, userMention } from "discord.js";
import * as cal from "./calendar";
import { addTask, getTaskById, setTaskDone, updateTask } from "./taskStore";

// How many people one task can be assigned to.
const MAX_ASSIGNEES = 5;

// /task add title:Write sprint report due:2026-11-03 time:17:00 assignee:@Sarah
// /task add title:Demo prep due:2026-11-05 time:09:30 assignee:@Sarah assignee2:@Cam assignee3:@Zad
// /task complete id:4
// /task complete id:4 undo:true
// /task edit id:4 due:2026-11-06 add_assignee:@Cam
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
        .addStringOption((o) =>
          o.setName("time").setDescription("Due time as HH:MM, 24-hour Pacific, e.g. 17:00").setRequired(true)
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
    })
    .addSubcommand((sub) =>
      sub
        .setName("complete")
        .setDescription("Mark a past or upcoming task as done")
        .addIntegerOption((o) =>
          o.setName("id").setDescription("Task ID, shown when the task was added").setRequired(true)
        )
        .addBooleanOption((o) =>
          o.setName("undo").setDescription("Mark the task as not done instead")
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Change a task. Leave an option blank to keep it.")
        .addIntegerOption((o) =>
          o.setName("id").setDescription("Task ID, shown when the task was added").setRequired(true)
        )
        .addStringOption((o) => o.setName("title").setDescription("New title"))
        .addStringOption((o) => o.setName("due").setDescription("New due date as YYYY-MM-DD"))
        .addStringOption((o) => o.setName("time").setDescription("New due time as HH:MM, 24-hour Pacific"))
        .addUserOption((o) => o.setName("add_assignee").setDescription("Someone to add to the task"))
        .addUserOption((o) => o.setName("remove_assignee").setDescription("Someone to take off the task"))
    ),

  async execute(interaction) {
    switch (interaction.options.getSubcommand()) {
      case "add":
        return handleAdd(interaction);
      case "complete":
        return handleComplete(interaction);
      case "edit":
        return handleEdit(interaction);
    }
  },
};

// /task add
async function handleAdd(interaction) {
  const title = interaction.options.getString("title").trim();
  const due = interaction.options.getString("due").trim();
  const time = cal.normalizeTime(interaction.options.getString("time").trim());

  // Collect everyone picked, skipping empty slots and duplicates.
  const assigneeIds = [];
  for (let i = 1; i <= MAX_ASSIGNEES; i++) {
    const user = interaction.options.getUser(i === 1 ? "assignee" : `assignee${i}`);
    if (user && !assigneeIds.includes(user.id)) assigneeIds.push(user.id);
  }

  if (!title) {
    return interaction.reply({ content: "The task needs a title.", ephemeral: true });
  }
  if (!cal.isValidDate(due)) {
    return interaction.reply({
      content: `"${due}" is not a valid date. Use YYYY-MM-DD, e.g. 2026-11-03.`,
      ephemeral: true,
    });
  }
  if (!time) {
    return interaction.reply({
      content: "That is not a valid time. Use 24-hour HH:MM, e.g. 17:00.",
      ephemeral: true,
    });
  }

  const dueAt = dueDateTime(due, time);
  if (dueAt < cal.now()) {
    return interaction.reply({ content: "That due time has already passed.", ephemeral: true });
  }

  const saved = addTask({
    title,
    due,
    time,
    assigneeIds,
    createdBy: interaction.user.username,
  });

  return interaction.reply(`📝 **Task added!**\n${taskDetails(saved)}`);
}

// /task complete
async function handleComplete(interaction) {
  const id = interaction.options.getInteger("id");
  const undo = interaction.options.getBoolean("undo") ?? false;

  // TODO: permission check. Only an assignee, the creator, or a moderator
  // should complete a task. Tasks store the creator's username for now
  // (see taskStore.js).

  const task = setTaskDone(id, !undo);
  if (!task) {
    return interaction.reply({ content: `There is no task with ID ${id}.`, ephemeral: true });
  }

  return interaction.reply(
    undo
      ? `↩️ **Task reopened:** ${task.title} (ID ${task.id})`
      : `✅ **Task complete:** ${task.title} (ID ${task.id})`
  );
}

// /task edit
async function handleEdit(interaction) {
  const id = interaction.options.getInteger("id");
  const task = getTaskById(id);
  if (!task) {
    return interaction.reply({ content: `There is no task with ID ${id}.`, ephemeral: true });
  }

  // TODO: permission check. Only an assignee, the creator, or a moderator
  // should edit a task. Tasks store the creator's username for now
  // (see taskStore.js).

  const changes = {};

  const title = interaction.options.getString("title")?.trim();
  if (title) changes.title = title;

  const due = interaction.options.getString("due")?.trim();
  if (due) {
    if (!cal.isValidDate(due)) {
      return interaction.reply({
        content: `"${due}" is not a valid date. Use YYYY-MM-DD, e.g. 2026-11-03.`,
        ephemeral: true,
      });
    }
    changes.due = due;
  }

  const timeText = interaction.options.getString("time")?.trim();
  if (timeText) {
    const time = cal.normalizeTime(timeText);
    if (!time) {
      return interaction.reply({
        content: "That is not a valid time. Use 24-hour HH:MM, e.g. 17:00.",
        ephemeral: true,
      });
    }
    changes.time = time;
  }

  // Assignees: start from the current list, then add and remove.
  const added = interaction.options.getUser("add_assignee");
  const removed = interaction.options.getUser("remove_assignee");
  if (added || removed) {
    let assigneeIds = [...task.assigneeIds];
    if (added && !assigneeIds.includes(added.id)) assigneeIds.push(added.id);
    if (removed) assigneeIds = assigneeIds.filter((userId) => userId !== removed.id);

    if (assigneeIds.length === 0) {
      return interaction.reply({
        content: "A task needs at least one assignee. Add someone else before removing the last person.",
        ephemeral: true,
      });
    }
    if (assigneeIds.length > MAX_ASSIGNEES) {
      return interaction.reply({
        content: `A task can have at most ${MAX_ASSIGNEES} assignees.`,
        ephemeral: true,
      });
    }
    changes.assigneeIds = assigneeIds;
  }

  const changedFields = Object.keys(changes);
  if (changedFields.length === 0) {
    return interaction.reply({
      content: "Nothing to change. Fill in at least one option besides the ID.",
      ephemeral: true,
    });
  }

  const updated = updateTask(id, changes);

  // Past due dates are allowed when editing, but we warn about them.
  // TODO: decide later whether this should stay a warning or become an error.
  let warning = "";
  if ((changes.due || changes.time) && dueDateTime(updated.due, updated.time) < cal.now()) {
    warning = "\n⚠️ The new due time has already passed.";
  }

  return interaction.reply(
    `✏️ **Task updated!** Changed: ${changedFields.join(", ")}\n${taskDetails(updated)}${warning}`
  );
}

// The due date and time of a task as a Pacific-time Luxon date
function dueDateTime(due, time) {
  const [hour, minute] = time.split(":").map(Number);
  return cal.toDate(due).set({ hour, minute });
}

// The lines shown after a task is added or edited
function taskDetails(task) {
  return (
    `**Title:** ${task.title}\n` +
    `**Due:** ${dueDateTime(task.due, task.time).toFormat("ccc, LLL d, yyyy 'at' h:mm a ZZZZ")}\n` +
    `**Assigned to:** ${task.assigneeIds.map((userId) => userMention(userId)).join(", ")}\n` +
    `**Task ID:** ${task.id}`
  );
}
