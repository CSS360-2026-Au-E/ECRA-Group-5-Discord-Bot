
const { expect } = require("chai");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("Task store unit tests", function () {
  let originalCwd;
  let tmpDir;
  let taskStore;

  before(() => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "task-store-test-"));
    process.chdir(tmpDir);

    taskStore = require("../src/helpers/taskStore");
  });

  after(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    const dataDir = path.join(tmpDir, "data");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, "tasks.json"), "[]");
  });

  it("returns undefined when looking up a task that does not exist", () => {
    expect(taskStore.getTaskById(99)).to.equal(undefined);
  });

  it("returns null when updating a task that does not exist", () => {
    taskStore.addTask({
      title: "Finish report",
      due: "2027-06-15",
      time: "17:00",
      assigneeIds: ["user-1"],
      createdBy: "tester",
    });

    const result = taskStore.updateTask(99, { title: "New title" });

    expect(result).to.equal(null);
    expect(taskStore.getTaskById(1).title).to.equal("Finish report");
  });

  it("assigns unique IDs when multiple tasks are added", () => {
    const first = taskStore.addTask({
      title: "First task",
      due: "2027-06-15",
      time: "17:00",
      assigneeIds: ["user-1"],
      createdBy: "tester",
    });

    const second = taskStore.addTask({
      title: "Second task",
      due: "2027-06-16",
      time: "18:00",
      assigneeIds: ["user-2"],
      createdBy: "tester",
    });

    expect(first.id).to.equal(1);
    expect(second.id).to.equal(2);
    expect(first.id).to.not.equal(second.id);
  });

  it("keeps tasks saved in the JSON file when they are loaded again", () => {
    taskStore.addTask({
      title: "Finish report",
      due: "2027-06-15",
      time: "17:00",
      assigneeIds: ["user-1"],
      createdBy: "tester",
    });

    const loadedTasks = taskStore.getTasks();

    expect(loadedTasks).to.have.lengthOf(1);
    expect(loadedTasks[0].title).to.equal("Finish report");
    expect(loadedTasks[0].id).to.equal(1);
  });

  it("returns an empty list when the tasks file contains invalid JSON", () => {
    const tasksFile = path.join(tmpDir, "data", "tasks.json");
    fs.writeFileSync(tasksFile, "{ invalid json");

    expect(taskStore.getTasks()).to.deep.equal([]);
  });
});
