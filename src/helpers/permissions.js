import { PermissionFlagsBits } from "discord.js";

// Who is allowed to change an event or task (issue #34).
//   Events: the creator or a moderator.
//   Tasks:  the creator, an assignee, or a moderator.

// A "moderator" is anyone with the Manage Messages permission in this server.
// Server admins count automatically.
export function isModerator(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages) ?? false;
}

// True if this user created the item.
// Items saved before this change only have the creator's username, so fall
// back to comparing usernames for those.
export function isCreator(item, user) {
  if (item.createdById) return item.createdById === user.id;
  return item.createdBy === user.username;
}

// True if this user is assigned to the task.
export function isAssignee(task, user) {
  return (task.assigneeIds ?? []).includes(user.id);
}

export function canChangeEvent(event, interaction) {
  return isCreator(event, interaction.user) || isModerator(interaction);
}

export function canChangeTask(task, interaction) {
  return (
    isCreator(task, interaction.user) ||
    isAssignee(task, interaction.user) ||
    isModerator(interaction)
  );
}

// The private "no permission" reply. action is e.g. "edit", kind is "event" or "task".
export function noPermissionReply(action, kind) {
  const who = kind === "task" ? "its creator, an assignee, or a moderator" : "its creator or a moderator";
  return {
    content: `🚫 You don't have permission to ${action} this ${kind}. Only ${who} can.`,
    ephemeral: true,
  };
}