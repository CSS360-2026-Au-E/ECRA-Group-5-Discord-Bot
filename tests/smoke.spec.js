// Smoke test: drives every major feature of the bot end to end, without
// connecting to Discord. Fake "interaction" objects stand in for slash
// commands and go through the real interactionCreate handler, so command
// routing, validation, the JSON stores and the replies are all exercised.
//
// Run with:  npm test
//
// The stores save to <current working directory>/data, so the test switches
// into a temporary folder BEFORE loading any bot code. Your real data/ folder
// is never touched.

// Written with require() (CommonJS) so newer Node versions don't load this
// file as an ES module, which would bypass esbuild-runner.
const { expect } = require("chai");
const fs = require("fs");
const os = require("os");
const path = require("path");

// ---------- Fakes ----------

// The text of a reply, whether it was sent as a string or as { content }.
const textOf = (reply) => (typeof reply === "string" ? reply : reply.content);

// A fake slash-command interaction. `options` maps option names to values;
// user options are passed as { id: "..." } objects.
function fakeInteraction(commandName, subcommand, options = {}) {
  const interaction = {
    commandName,
    user: { id: "100000000000000001", username: "smoke-tester" },
    replies: [],
    replied: false,
    deferred: false,
    isChatInputCommand: () => true,
    options: {
      getSubcommand: () => subcommand,
      getString: (name) => options[name] ?? null,
      getInteger: (name) => options[name] ?? null,
      getBoolean: (name) => options[name] ?? null,
      getUser: (name) => options[name] ?? null,
    },
    async reply(message) {
      interaction.replies.push(message);
      interaction.replied = true;
    },
    async followUp(message) {
      interaction.replies.push(message);
    },
  };
  return interaction;
}

// A fake Discord client with one server. Records registered commands and DMs.
function fakeClient() {
  const client = {
    registered: [],
    dms: [],
    user: { username: "SmokeBot" },
    guilds: {
      cache: new Map([
        ["guild-1", { commands: { set: async (data) => client.registered.push(...data) } }],
      ]),
    },
    users: {
      cache: { size: 0 },
      fetch: async (id) => ({
        send: async (text) => client.dms.push({ to: id, text }),
      }),
    },
  };
  return client;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- Test setup ----------

describe("Smoke test: core bot features", function () {
  this.timeout(10000);

  let originalCwd;
  let tmpDir;
  let handleInteraction; // interactionCreate.execute
  let commands;
  let readyEvent;
  let taskStore;
  let reminderStore;

  // Dates one year out so the test never goes stale.
  const nextYear = new Date().getFullYear() + 1;
  const futureDate = `${nextYear}-06-15`;
  const reminderDate = `${nextYear}-06-14`;
  const assignee = { id: "100000000000000002" };
  const assignee2 = { id: "100000000000000003" };

  // Send a slash command through the real handler; return its last reply.
  async function run(commandName, subcommand, options) {
    const interaction = fakeInteraction(commandName, subcommand, options);
    await handleInteraction(interaction);
    expect(interaction.replies, `${commandName} ${subcommand ?? ""} sent no reply`).to.not.be.empty;
    return interaction.replies[interaction.replies.length - 1];
  }

  const readJson = (file) => JSON.parse(fs.readFileSync(path.join(tmpDir, "data", file), "utf8"));

  before(() => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bot-smoke-"));
    process.chdir(tmpDir);

    process.env.CHANNEL_NAME = "general";
    process.env.MEME_URL = "https://example.com/meme.png";

    // Load bot code only after switching folders (see note at the top).
    handleInteraction = require("../src/events/interactionCreate").default.execute;
    commands = require("../src/helpers/commands").commands;
    readyEvent = require("../src/events/ready").default;
    taskStore = require("../src/helpers/taskStore");
    reminderStore = require("../src/reminders/reminderStore");
  });

  after(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ---------- Startup ----------

  it("defines all five slash commands with valid Discord definitions", () => {
    const names = commands.map((c) => c.data.toJSON().name);
    expect(names).to.have.members(["calendar", "day", "event", "task", "reminder"]);
  });

  // ---------- Calendar ----------

  it("/calendar shows the current month and a chosen month", async () => {
    expect(textOf(await run("calendar", null, {}))).to.include("Su  Mo  Tu");
    expect(textOf(await run("calendar", null, { month: 2, year: 2028 }))).to.include("February 2028");
  });

  it("/day shows a day's hour slots, and rejects a bad date without crashing", async () => {
    const reply = textOf(await run("day", null, { date: futureDate, from: 9, to: 17 }));
    expect(reply).to.include("9 AM").and.include("5 PM");

    // The handler logs the caught error; hide that expected log here.
    const originalError = console.error;
    console.error = () => {};
    let bad;
    try {
      bad = await run("day", null, { date: "not-a-date" });
    } finally {
      console.error = originalError;
    }
    expect(bad.ephemeral).to.equal(true);
    expect(textOf(bad)).to.include("not a valid date");
  });

  // ---------- Events ----------

  it("/event add saves an event and rejects an invalid date", async () => {
    const reply = textOf(
      await run("event", "add", { title: "Sprint demo", date: futureDate, time: "15:00", location: "UW1-031" })
    );
    expect(reply).to.include("Event added").and.include("Event ID:** 1");
    expect(readJson("events.json")[0]).to.include({ title: "Sprint demo", location: "UW1-031" });

    const bad = await run("event", "add", { title: "Bad", date: "2026-02-30", time: "10:00" });
    expect(bad.ephemeral).to.equal(true);
  });

  it("/event edit changes only the fields given", async () => {
    const reply = textOf(await run("event", "edit", { id: 1, time: "16:30" }));
    expect(reply).to.include("Event updated").and.include("Changed: time");
    expect(readJson("events.json")[0]).to.include({ time: "16:30", location: "UW1-031" });
  });

  // ---------- Tasks ----------

  it("/task add saves a task with assignees", async () => {
    const reply = textOf(
      await run("task", "add", { title: "Write report", due: futureDate, time: "17:00", assignee })
    );
    expect(reply).to.include("Task added").and.include(`<@${assignee.id}>`);
    expect(readJson("tasks.json")[0]).to.include({ id: 1, done: false });
  });

  it("/task edit adds an assignee", async () => {
    const reply = textOf(await run("task", "edit", { id: 1, add_assignee: assignee2 }));
    expect(reply).to.include("Task updated");
    expect(readJson("tasks.json")[0].assigneeIds).to.deep.equal([assignee.id, assignee2.id]);
  });

  it("/task complete marks a task done and undo reopens it", async () => {
    expect(textOf(await run("task", "complete", { id: 1 }))).to.include("Task complete");
    expect(readJson("tasks.json")[0].done).to.equal(true);

    expect(textOf(await run("task", "complete", { id: 1, undo: true }))).to.include("Task reopened");
    expect(readJson("tasks.json")[0].done).to.equal(false);
  });

  // ---------- Reminders ----------

  it("/reminder add creates a reminder for an existing task", async () => {
    const reply = textOf(
      await run("reminder", "add", { type: "task", item_id: 1, date: reminderDate, time: "09:00" })
    );
    expect(reply).to.include("Reminder created");
    expect(readJson("reminders.json")[0]).to.include({ type: "task", itemId: 1, sent: false });
  });

  it("/reminder add refuses an item that does not exist", async () => {
    const bad = await run("reminder", "add", { type: "event", item_id: 99, date: reminderDate, time: "09:00" });
    expect(bad.ephemeral).to.equal(true);
  });

  // ---------- Event delete ----------

  it("/event delete removes the event, and a second delete reports it is gone", async () => {
    expect(textOf(await run("event", "delete", { id: 1 }))).to.include("Event deleted");
    expect(readJson("events.json")).to.be.empty;

    const again = await run("event", "delete", { id: 1 });
    expect(again.ephemeral).to.equal(true);
  });

  // ---------- Bot startup + reminder delivery ----------

  it("on ready: registers commands with each server and DMs any reminder that is due", async () => {
    // A reminder that came due a minute ago, for the open task.
    expect(taskStore.getTaskById(1)).to.include({ done: false });
    reminderStore.addReminder({
      type: "task",
      itemId: 1,
      title: "Write report",
      remindAt: new Date(Date.now() - 60_000).toISOString(),
      createdBy: assignee.id,
    });

    const client = fakeClient();
    await readyEvent.execute(client); // also starts the reminder scheduler
    await wait(200); // the scheduler's first check runs right away

    expect(client.registered.map((c) => c.name)).to.include.members(["calendar", "task", "reminder"]);
    expect(client.dms).to.have.lengthOf(1);
    expect(client.dms[0]).to.include({ to: assignee.id });
    expect(client.dms[0].text).to.include("Reminder").and.include("Write report");

    const due = readJson("reminders.json").find((r) => r.createdBy === assignee.id);
    expect(due.sent).to.equal(true);
  });

  // ---------- Welcome message ----------

  it("welcomes a new member in the configured channel", async () => {
    const sent = [];
    const member = {
      id: "100000000000000004",
      guild: { channels: { cache: [{ name: "general", send: (msg) => sent.push(msg) }] } },
    };
    await require("../src/events/guildMemberAdd").default.execute(member);

    expect(sent).to.have.lengthOf(1);
    expect(sent[0].content).to.include(`<@${member.id}>`);
    expect(sent[0].embeds).to.have.lengthOf(1);
  });
});