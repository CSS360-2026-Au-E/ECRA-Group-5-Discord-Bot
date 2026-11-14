// Unit tests for src/helpers/calendar.js (dates, hours and months, Pacific time).
// Run with:  npm test

// Written with require() (CommonJS) so esbuild-runner handles the import,
// same as the other spec files.
const { expect } = require("chai");
const cal = require("../src/helpers/calendar");

describe("Calendar unit tests", function () {
  it("isValidDate accepts real YYYY-MM-DD dates and rejects everything else", () => {
    expect(cal.isValidDate("2026-11-05")).to.equal(true);
    expect(cal.isValidDate("2028-02-29")).to.equal(true); // leap year

    expect(cal.isValidDate("2026-02-30")).to.equal(false); // no Feb 30
    expect(cal.isValidDate("2027-02-29")).to.equal(false); // not a leap year
    expect(cal.isValidDate("2026-11")).to.equal(false);
    expect(cal.isValidDate("20261105")).to.equal(false);
    expect(cal.isValidDate("11/05/2026")).to.equal(false);
    expect(cal.isValidDate("")).to.equal(false);
  });

  it("normalizeTime pads valid 24-hour times and returns null for bad ones", () => {
    expect(cal.normalizeTime("9:05")).to.equal("09:05");
    expect(cal.normalizeTime("00:00")).to.equal("00:00");
    expect(cal.normalizeTime("23:59")).to.equal("23:59");

    expect(cal.normalizeTime("24:00")).to.equal(null);
    expect(cal.normalizeTime("12:60")).to.equal(null);
    expect(cal.normalizeTime("3pm")).to.equal(null);
    expect(cal.normalizeTime("9:5")).to.equal(null);
  });

  it("toDateTime builds a Pacific time and rejects hours outside 0-23", () => {
    const dt = cal.toDateTime("2026-11-05", 15);
    expect(dt.hour).to.equal(15);
    expect(dt.zoneName).to.equal("America/Los_Angeles");
    expect(cal.formatTime(dt)).to.equal("Thu, Nov 5, 2026 at 3 PM PST");

    expect(() => cal.toDateTime("2026-11-05", 24)).to.throw("0 to 23");
    expect(() => cal.toDateTime("2026-11-05", -1)).to.throw("0 to 23");
    expect(() => cal.toDateTime("2026-11-05", 1.5)).to.throw("0 to 23");
    expect(() => cal.toDateTime("not-a-date", 3)).to.throw("not a valid date");
  });

  it("hourLabel turns 0-23 into 12-hour labels", () => {
    expect(cal.hourLabel(0)).to.equal("12 AM");
    expect(cal.hourLabel(9)).to.equal("9 AM");
    expect(cal.hourLabel(12)).to.equal("12 PM");
    expect(cal.hourLabel(15)).to.equal("3 PM");
  });

  it("getMonthGrid lays out February 2026 as exactly four full weeks", () => {
    // Feb 1, 2026 is a Sunday and the month has 28 days.
    const weeks = cal.getMonthGrid(2026, 2);
    expect(weeks).to.have.lengthOf(4);
    expect(weeks[0]).to.deep.equal([1, 2, 3, 4, 5, 6, 7]);
    expect(weeks[3]).to.deep.equal([22, 23, 24, 25, 26, 27, 28]);
    expect(() => cal.getMonthGrid(2026, 13)).to.throw("1 to 12");
  });
});
