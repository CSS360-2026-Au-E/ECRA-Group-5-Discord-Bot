import fs from "fs";
import path from "path";

// All tasks are saved in data/tasks.json
const DATA_DIR = path.join(process.cwd(), "data");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");

// Read all saved tasks (returns [] if there are none yet)
export function getTasks() {
  if (!fs.existsSync(TASKS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TASKS_FILE, "utf8"));
  } catch {
    return [];
  }
}

// Save the full list of tasks
export function saveTasks(tasks) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

// Add one new task and give it the next ID number
export function addTask({ title, due, assigneeIds, createdBy }) {
  const tasks = getTasks();
  const nextId = tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  const newTask = { id: nextId, title, due, assigneeIds, createdBy, done: false };
  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
}