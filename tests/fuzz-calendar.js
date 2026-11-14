// Fuzzer for the calendar bot, using fast-check.
//
// fast-check throws thousands of random (and deliberately nasty) inputs at
// the calendar code and the /event command, and checks that some rule
// ("property") holds for every one. When a rule breaks, fast-check shrinks
// the input down to the smallest example that still breaks it.
//
// Run from the repo root in Codespaces:
//   npm install --save-dev fast-check      (once)
//   npm run fuzz
//
// Every property runs even if an earlier one fails, and a summary is printed
// at the end. The script exits with code 1 if anything broke.
//
// Saved data goes to a temporary folder, so your real data/ folder is never
// touched.

const fc = require("fast-check");
const fs = require("fs");
const os = require("os");
const path = require("path");

// The stores save to <cwd>/data, so switch folders BEFORE loading bot code.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bot-fuzz-"));
process.chdir(tmpDir);

const cal = require("../src/helpers/calendar");
const store = require("../src/helpers/calendarStore");
const handleInteraction = require("../src/events/interactionCreate").default.execute;

// The handler logs errors it catches; keep the fuzz output readable.
console.error = () => {};

// ---------- Input generators ----------

// Inputs that tend to break things. Mixed in with random text below so the
// fuzzer tries them far more often than pure chance would.
const NASTY = [
  "", " ", "   ", "\n", "\t", "```", "**", "||spoiler||",
  "@everyone", "@here", "<@123456789012345678>", "<@&123456789012345678>",
  "2026-02-29", "2028-02-29", "2026-13-01", "0000-00-00", "9999-12-31",
  "2026-03-08", "2026-11-01", " 2026-11-05 ", "2026-11-05T10:00",
  "24:00", "23:59", "00:00", "9:05", "9:5", "-1:00", "12:60", "１２:００",
  "null", "undefined", "NaN", "__proto__", "constructor",
  "😀", "👨‍👩‍👧‍👦", "\u0000", "‮", "x".repeat(2100),
];

// Random text, NASTY pieces, or a mix of both glued together.
const nastyString = fc
  .array(
    fc.oneof(
      { weight: 3, arbitrary: fc.string({ unit: "grapheme", maxLength: 40 }) },
      { weight: 2, arbitrary: fc.constantFrom(...NASTY) },
      { weight: 1, arbitrary: fc.string({ unit: "grapheme", maxLength: 2500 }) }
    ),
    { minLength: 1, maxLength: 3 }
  )
  .map((parts) => parts.join(""));

// A real calendar date between 2020 and 2035 as "YYYY-MM-DD".
const realDate = fc
  .integer({ min: 0, max: 5843 }) // days after 2020-01-01
  .map((n) => new Date(Date.UTC(2020, 0, 1) + n * 86_400_000).toISOString().slice(0, 10));

const hour = fc.integer({ min: 0, max: 23 });

// ---------- Fake Discord interaction (same idea as tests/smoke.spec.js) ----------

function fakeInteraction(commandName, subcommand, options) {
  const interaction = {
    commandName,
    user: { id: "100000000000000001", username: "fuzzer" },
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

const textOf = (reply) => (typeof reply === "string" ? reply : reply.content);

// Run /event add with fuzzed options. Discord marks title/date/time as
// required, so they are always present, but they can be any text at all
// (up to Discord's 6000-character limit for a string option).
async function runEventAdd(opts) {
  const interaction = fakeInteraction("event", "add", opts);
  await handleInteraction(interaction);
  return interaction;
}

const eventAddOptions = fc.record(
  {
    title: nastyString,
    date: fc.oneof(nastyString, realDate),
    time: fc.oneof(nastyString, fc.constantFrom("9:05", "15:00", "23:59")),
    location: nastyString,
    description: nastyString,
  },
  { requiredKeys: ["title", "date", "time"] }
);

// ---------- Properties ----------

const properties = [
  // ----- calendar.js -----
  {
    name: "isValidDate never throws, and every date it accepts round-trips through toDate",
    run: () =>
      fc.check(
        fc.property(fc.oneof(nastyString, realDate), (text) => {
          if (!cal.isValidDate(text)) return true;
          return cal.toDate(text).toISODate() === text;
        }),
        { numRuns: 5000 }
      ),
  },
  {
    name: "normalizeTime never throws and only returns a real HH:MM time (or null)",
    run: () =>
      fc.check(
        fc.property(nastyString, (text) => {
          const result = cal.normalizeTime(text);
          if (result === null) return true;
          const [h, m] = result.split(":").map(Number);
          return /^\d{2}:\d{2}$/.test(result) && h <= 23 && m <= 59 && cal.normalizeTime(result) === result;
        }),
        { numRuns: 5000 }
      ),
  },
  {
    name: "toDateTime(date, hour) gives back the hour that was asked for",
    // Many runs, so the fuzzer gets a fair chance at the rare days where
    // Pacific time jumps an hour (daylight saving).
    run: () =>
      fc.check(
        fc.property(realDate, hour, (date, h) => cal.toDateTime(date, h).hour === h),
        { numRuns: 50000 }
      ),
  },
  {
    name: "getHours gives 24 slots, each starting one hour after the last",
    run: () =>
      fc.check(
        fc.property(realDate, (date) => {
          const slots = cal.getHours(date);
          if (slots.length !== 24) return false;
          return slots.every((s, i) => i === 0 || s.start.diff(slots[i - 1].start, "hours").hours === 1);
        }),
        { numRuns: 6000 }
      ),
  },
  {
    name: "dayToText shows exactly the hours from..to for any valid range",
    run: () =>
      fc.check(
        fc.property(realDate, hour, hour, (date, a, b) => {
          const [from, to] = a <= b ? [a, b] : [b, a];
          const text = cal.dayToText(date, from, to);
          const rows = text.split("\n").filter((line) => line.includes("|"));
          return rows.length === to - from + 1;
        }),
        { numRuns: 2000 }
      ),
  },
  {
    name: "getMonthGrid: full 7-day weeks, every day of the month exactly once, in order",
    run: () =>
      fc.check(
        fc.property(fc.integer({ min: 1970, max: 2100 }), fc.integer({ min: 1, max: 12 }), (year, month) => {
          const weeks = cal.getMonthGrid(year, month);
          if (!weeks.every((w) => w.length === 7)) return false;
          const days = weeks.flat().filter((d) => d !== null);
          const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
          return days.length === daysInMonth && days.every((d, i) => d === i + 1);
        }),
        { numRuns: 2000 }
      ),
  },

  // ----- /event add (through the real interaction handler) -----
  {
    name: "/event add never crashes, replies exactly once, and only saves valid dates and times",
    run: () =>
      fc.check(
        fc.asyncProperty(eventAddOptions, async (opts) => {
          const before = store.getCalendarEvents().length;
          const interaction = await runEventAdd(opts);
          if (interaction.replies.length !== 1) return false;

          const events = store.getCalendarEvents();
          if (events.length === before) return true; // rejected, nothing saved
          const saved = events.at(-1);
          return cal.isValidDate(saved.date) && cal.normalizeTime(saved.time) === saved.time;
        }),
        { numRuns: 500 }
      ),
  },
  {
    name: "/event add never saves an event with a blank title",
    run: () =>
      fc.check(
        fc.asyncProperty(eventAddOptions, async (opts) => {
          store.saveCalendarEvents([]);
          await runEventAdd(opts);
          const [saved] = store.getCalendarEvents();
          return !saved || saved.title.trim().length > 0;
        }),
        { numRuns: 500 }
      ),
  },
  {
    name: "/event add replies fit in Discord's 2000-character message limit",
    run: () =>
      fc.check(
        fc.asyncProperty(eventAddOptions, async (opts) => {
          const interaction = await runEventAdd(opts);
          return interaction.replies.every((r) => textOf(r).length <= 2000);
        }),
        { numRuns: 500 }
      ),
  },
  {
    name: "/event add replies can't ping @everyone or @here",
    run: () =>
      fc.check(
        fc.asyncProperty(eventAddOptions, async (opts) => {
          const interaction = await runEventAdd(opts);
          return interaction.replies.every((r) => {
            const pingSafe = typeof r === "object" && r.allowedMentions;
            return pingSafe || !/@(everyone|here)/.test(textOf(r));
          });
        }),
        { numRuns: 500 }
      ),
  },

  // ----- calendarStore.js -----
  {
    name: "event IDs are never reused, even after deleting events",
    run: () =>
      fc.check(
        fc.property(
          fc.array(fc.oneof(fc.constant({ op: "add" }), fc.record({ op: fc.constant("delete"), id: fc.integer({ min: 1, max: 10 }) })), {
            maxLength: 30,
          }),
          (ops) => {
            store.saveCalendarEvents([]);
            const usedIds = new Set();
            for (const step of ops) {
              if (step.op === "add") {
                const e = store.addCalendarEvent({ title: "t", date: "2027-01-01", time: "10:00", createdBy: "fuzzer" });
                if (usedIds.has(e.id)) return false;
                usedIds.add(e.id);
              } else {
                store.deleteCalendarEvent(step.id);
              }
            }
            return true;
          }
        ),
        { numRuns: 1000 }
      ),
  },
];

// ---------- Run everything and report ----------

function describeInput(counterexample) {
  return counterexample
    .map((value) => {
      const text = fc.stringify(value);
      return text.length > 300 ? `${text.slice(0, 300)}… (${text.length} chars)` : text;
    })
    .join(", ");
}

(async () => {
  const broken = [];

  for (const prop of properties) {
    const result = await prop.run();
    if (result.failed) {
      broken.push(prop.name);
      console.log(`✗ BROKEN  ${prop.name}`);
      console.log(`    smallest failing input: ${describeInput(result.counterexample)}`);
      if (result.errorInstance) console.log(`    error: ${result.errorInstance.message ?? result.errorInstance}`);
      console.log(`    replay with seed ${result.seed}, path "${result.counterexamplePath}"`);
    } else {
      console.log(`✓ held    ${prop.name} (${result.numRuns} runs)`);
    }
  }

  process.chdir(os.tmpdir());
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`\n${properties.length - broken.length} of ${properties.length} properties held.`);
  process.exitCode = broken.length ? 1 : 0;
})();
