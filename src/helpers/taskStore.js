import fs from "fs";
import path from "path";

// All tasks are saved in data/tasks.json
const DATA_DIR = path.join(process.cwd(), "data");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");

// Error thrown when saved task data cannot be loaded.
export class TaskDataError extends Error {
  constructor(message) {
    super(message);
    this.name = "TaskDataError";
  }
}

// Read saved tasks (returns [] if there are none yet).
// Pass a Discord server ID (guildId) to get only that server's tasks.
// Leave it out to get every server's tasks (used by the reminder scheduler).
export function getTasks(guildId) {  let fileContents;

  try {
    fileContents = fs.readFileSync(TASKS_FILE, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return [];

    throw new TaskDataError(
      "I couldn't read your saved tasks. Your existing task data has not been overwritten. Please contact a server administrator for help."
    );
  }

  let tasks;

  try {
    tasks = JSON.parse(fileContents);
  } catch {
    throw new TaskDataError(
      "Your saved task data appears to be corrupted. Your existing task data has not been overwritten. Please contact a server administrator for help."
    );
  }

  if (!Array.isArray(tasks)) {
    throw new TaskDataError(
      "Your saved task data has an invalid format. Your existing task data has not been overwritten. Please contact a server administrator for help."
    );
  }

  return guildId === undefined ? tasks : tasks.filter((t) => t.guildId === guildId);
}

// Save the full list of tasks
export function saveTasks(tasks) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

// Add one new task and give it the next ID number
// createdBy is the creator's username (for display). createdById is their
// Discord user ID, which never changes, so permission checks use it.
export function addTask({ guildId, title, due, time, assigneeIds, createdBy, createdById }) {  const tasks = getTasks();
  const nextId = tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  const newTask = {
    id: nextId,
    guildId: guildId ?? null,
    title,
    due,
    time,
    assigneeIds,
    createdBy,
    createdById: createdById ?? null,
    done: false,
  };  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
}

// Find one task by its ID (returns undefined when there is none).
// With a guildId, tasks from other servers are treated as not found.
export function getTaskById(id, guildId) {
  return getTasks(guildId).find((t) => t.id === id);
}

// Merge changes into the task with this ID.
// Keys set to undefined are ignored, so blank options keep their old value.
// Returns the updated task, or null if there is no task with that ID.
export function updateTask(id, changes) {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  for (const [key, value] of Object.entries(changes)) {
    if (value !== undefined) tasks[index][key] = value;
  }
  saveTasks(tasks);
  return tasks[index];
}

// Mark a task done, or not done when done is false.
// Works for past and upcoming tasks alike.
export function setTaskDone(id, done = true) {
  return updateTask(id, {
    done,
    completedAt: done ? new Date().toISOString() : null,
  });
}
