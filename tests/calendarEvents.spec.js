import { expect } from "chai";
import * as cal from "../src/helpers/calendar";

const events = [
  { id: 1, title: "Team meeting", date: "2030-03-05", time: "15:00" },
  { id: 2, title: "Lunch", date: "2030-03-05", time: "12:30" },
  { id: 3, title: "Demo", date: "2030-03-20", time: "09:00" },
  { id: 4, title: "Old event", date: "2020-01-01", time: "10:00" },
];

describe("events on the calendar", () => {
  it("/day shows each event next to the hour it starts in", () => {
    const text = cal.dayToText("2030-03-05", 0, 23, events);
    expect(text).to.match(/3 PM \| 15:00 Team meeting \(Event 1\)/);
    expect(text).to.match(/12 PM \| 12:30 Lunch \(Event 2\)/);
    expect(text).to.not.include("Demo");
  });

  it("/day shows tasks next to the hour they are due", () => {
    const tasks = [
      { id: 7, title: "Write report", due: "2030-03-05", time: "17:00", done: false },
      { id: 8, title: "Old task", due: "2030-03-06", time: "17:00", done: true },
    ];
    const text = cal.dayToText("2030-03-05", 0, 23, [], tasks);
    expect(text).to.match(/5 PM \| 17:00 📝 Task: Write report \(Task 7\)/);
    expect(text).to.not.include("Old task");
  });

  it("/day still shows empty hours when there are no events", () => {
    const text = cal.dayToText("2030-03-05", 8, 10);
    expect(text.split("\n").filter((l) => l.includes("|"))).to.have.length(3);
  });

  it("/calendar marks days that have an event with •", () => {
    const text = cal.monthToText(2030, 3, events);
    expect(text).to.include("5•");
    expect(text).to.include("20•");
    expect(text).to.not.include("6•");
    expect(text).to.include("• = has an event");
  });

  it("/event list only shows upcoming events, soonest first", () => {
    const ids = cal.upcomingEvents(events).map((e) => e.id);
    expect(ids).to.deep.equal([2, 1, 3]);
  });
});
