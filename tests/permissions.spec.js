// Unit tests for the permission rules in src/helpers/permissions.js (#34).
const { expect } = require("chai");
const { PermissionFlagsBits } = require("discord.js");
const {
  isModerator,
  isCreator,
  canChangeEvent,
  canChangeTask,
  noPermissionReply,
} = require("../src/helpers/permissions");

const creator = { id: "1", username: "creator" };
const assignee = { id: "2", username: "assignee" };
const stranger = { id: "3", username: "stranger" };

// A fake interaction. mod: true gives the user Manage Messages.
const as = (user, mod = false) => ({
  user,
  memberPermissions: { has: (flag) => mod && flag === PermissionFlagsBits.ManageMessages },
});

const event = { id: 1, createdBy: "creator", createdById: "1" };
const task = { id: 1, createdBy: "creator", createdById: "1", assigneeIds: ["2"] };

describe("Permissions (#34)", () => {
  it("treats Manage Messages as moderator, and no permissions (e.g. DMs) as not", () => {
    expect(isModerator(as(stranger, true))).to.equal(true);
    expect(isModerator(as(stranger))).to.equal(false);
    expect(isModerator({ user: stranger, memberPermissions: null })).to.equal(false);
  });

  it("matches creators by user ID, even if their username changed", () => {
    expect(isCreator(event, { id: "1", username: "new-name" })).to.equal(true);
    expect(isCreator(event, { id: "3", username: "creator" })).to.equal(false);
  });

  it("falls back to the username for items saved before user IDs were stored", () => {
    const oldEvent = { id: 2, createdBy: "creator" };
    expect(isCreator(oldEvent, creator)).to.equal(true);
    expect(isCreator(oldEvent, stranger)).to.equal(false);
  });

  it("events: only the creator or a moderator can change them", () => {
    expect(canChangeEvent(event, as(creator))).to.equal(true);
    expect(canChangeEvent(event, as(stranger, true))).to.equal(true);
    expect(canChangeEvent(event, as(stranger))).to.equal(false);
  });

  it("tasks: the creator, an assignee, or a moderator can change them", () => {
    expect(canChangeTask(task, as(creator))).to.equal(true);
    expect(canChangeTask(task, as(assignee))).to.equal(true);
    expect(canChangeTask(task, as(stranger, true))).to.equal(true);
    expect(canChangeTask(task, as(stranger))).to.equal(false);
  });

  it("the no-permission reply is private and says who can make the change", () => {
    const reply = noPermissionReply("delete", "event");
    expect(reply.ephemeral).to.equal(true);
    expect(reply.content).to.include("don't have permission to delete this event");
    expect(noPermissionReply("edit", "task").content).to.include("an assignee");
  });
});