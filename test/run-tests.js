/*
 * Tests:  node test/run-tests.js
 *
 * A reaction test is a state machine with a clock, and both halves are easy to
 * get wrong: a press that arrives a millisecond before the light should not
 * count as a brilliant score, and a press while a result is on screen should
 * not silently start the next round. Every one of those transitions is here.
 */
"use strict";

const Reflex = require("../js/reflex.js");

let passed = 0;
let failed = 0;

function ok(label, condition) {
  if (condition) passed++;
  else {
    failed++;
    console.error("  FAILED: " + label);
  }
}

function eq(label, actual, expected) {
  ok(label + " (got " + JSON.stringify(actual) + ", expected " + JSON.stringify(expected) + ")",
    actual === expected);
}

function section(name) {
  console.log("\n" + name);
}

/** A game with a predictable delay, so the tests never depend on chance. */
function game(options) {
  return Reflex.createGame(Object.assign({ random: () => 0.5 }, options || {}));
}

/* ---------------- the delay ---------------- */

section("Choosing the delay");

const fixed = game();
eq("the delay sits between the bounds", fixed.begin(), Math.round(1400 + 0.5 * (4200 - 1400)));

const early = Reflex.createGame({ random: () => 0 });
eq("random 0 gives the minimum", early.begin(), 1400);

const late = Reflex.createGame({ random: () => 0.999999 });
ok("random 1 gives about the maximum", late.begin() >= 4199 && late.begin() <= 4200);

let alwaysInRange = true;
for (let i = 0; i < 2000; i++) {
  const g = Reflex.createGame();
  const wait = g.begin();
  if (wait < 1400 || wait > 4200) alwaysInRange = false;
}
ok("2,000 real random delays all sit in range", alwaysInRange);

/* ---------------- a clean round ---------------- */

section("A clean round");

const clean = game();
eq("starts idle", clean.state, "idle");
clean.begin();
eq("goes to waiting", clean.state, "waiting");

clean.arm(10000);
eq("arming turns it ready", clean.state, "ready");

const hit = clean.press(10237);
eq("a press counts as a hit", hit.type, "hit");
eq("and measures the gap", hit.ms, 237);
eq("the round advances", clean.round, 1);
eq("and it waits to show the result", clean.state, "result");

/* ---------------- pressing too soon ---------------- */

section("Pressing too soon");

const soon = game();
soon.begin();
const tooSoon = soon.press(10500);
eq("pressing while red is a false start", tooSoon.type, "tooSoon");
eq("no round is credited", soon.round, 0);
eq("nothing is timed", soon.times.length, 0);
eq("false starts are counted", soon.falseStarts, 1);
eq("and the state says so", soon.state, "tooSoon");

soon.next();
eq("the next round starts normally", soon.state, "waiting");
soon.arm(20000);
eq("and a good press now counts", soon.press(20210).ms, 210);

/* ---------------- presses that should do nothing ---------------- */

section("Presses that must not count");

const idle = game();
eq("pressing before the game starts is ignored", idle.press(5000).type, "ignored");

const showing = game();
showing.begin();
showing.arm(1000);
showing.press(1200);
eq("pressing while the result is shown is ignored", showing.press(1300).type, "ignored");
eq("and adds no time", showing.times.length, 1);

/* ---------------- finishing ---------------- */

section("Finishing a run");

const run = game({ rounds: 3 });
const timings = [240, 300, 190];
timings.forEach((ms, i) => {
  run.begin();
  run.arm(i * 10000);
  run.press(i * 10000 + ms);
});

eq("all rounds are recorded", run.times.length, 3);
eq("the game is done", run.state, "done");
eq("beginning again does nothing once done", run.begin(), null);
eq("and next() refuses too", run.next(), false);

run.reset();
eq("reset clears the times", run.times.length, 0);
eq("reset clears the round", run.round, 0);
eq("reset returns to idle", run.state, "idle");

/* ---------------- the numbers ---------------- */

section("The numbers");

const s = Reflex.stats([240, 300, 190, 260, 210]);
eq("counts the rounds", s.count, 5);
eq("finds the best", s.best, 190);
eq("finds the worst", s.worst, 300);
eq("averages them", s.average, 240);
eq("takes the median", s.median, 240);

const even = Reflex.stats([200, 300]);
eq("an even count averages the middle two", even.median, 250);

const single = Reflex.stats([275]);
eq("one round is its own best", single.best, 275);
eq("and its own average", single.average, 275);

const empty = Reflex.stats([]);
eq("no rounds means no average", empty.average, null);
eq("and no count", empty.count, 0);

/* ---------------- what the number means ---------------- */

section("What the number means");

eq("200 ms is closest to the sprinter mark", Reflex.nearestBenchmark(200).ms, 200);
eq("255 ms is closest to the typical mark", Reflex.nearestBenchmark(255).ms, 250);
eq("1000 ms falls back to the slowest mark", Reflex.nearestBenchmark(1000).ms, 350);
eq("no time has no benchmark", Reflex.nearestBenchmark(null), null);

ok("a fast average reads as fast", Reflex.verdict(170).includes("blink"));
ok("an average average says so", /average/.test(Reflex.verdict(280)));
ok("a slow average is gentle about it", typeof Reflex.verdict(600) === "string");
eq("no average has its own line", Reflex.verdict(null), "no rounds yet");

/* ---------------- a whole game, played badly ---------------- */

section("A full game with mistakes in it");

const messy = game({ rounds: 4 });
let clock = 0;
const script = [
  { falseStart: true },
  { ms: 310 },
  { falseStart: true },
  { ms: 245 },
  { ms: 198 },
  { ms: 265 },
];

for (const step of script) {
  if (messy.state === "done") break;
  messy.begin();
  clock += 5000;
  if (step.falseStart) {
    messy.press(clock - 100);
    messy.next();
    continue;
  }
  messy.arm(clock);
  messy.press(clock + step.ms);
  if (messy.state === "result") messy.next();
}

eq("only real reactions were timed", messy.times.length, 4);
eq("both false starts were counted", messy.falseStarts, 2);
eq("the run finished", messy.state, "done");
eq("the best round survived", Reflex.stats(messy.times).best, 198);
ok("no false start leaked into the times", messy.times.every((ms) => ms > 100));
/* ---------------- a press that never really came ---------------- */

section("Pressing far too late");

const lapsing = game({ tooSlow: 2000 });
lapsing.begin();
lapsing.arm(50000);
const lapse = lapsing.press(50000 + 9800);
eq("a 9.8 second press is not a reaction", lapse.type, "tooSlow");
eq("it is not timed", lapsing.times.length, 0);
eq("no round is credited", lapsing.round, 0);
eq("the lapse is counted", lapsing.lapses, 1);
eq("and the round can be run again", lapsing.next(), true);

const onEdge = game({ tooSlow: 2000 });
onEdge.begin();
onEdge.arm(0);
eq("exactly at the limit still counts", onEdge.press(2000).type, "hit");

const justOver = game({ tooSlow: 2000 });
justOver.begin();
justOver.arm(0);
eq("one millisecond over does not", justOver.press(2001).type, "tooSlow");

const recovered = game({ tooSlow: 2000, rounds: 2 });
recovered.begin();
recovered.arm(0);
recovered.press(8000);        // walked away from the screen
recovered.next();
recovered.arm(20000);
recovered.press(20230);       // came back
recovered.next();
recovered.arm(30000);
recovered.press(30210);
eq("only the real reactions were kept", recovered.times.length, 2);
eq("and one lapse was noted", recovered.lapses, 1);
eq("so the average is not wrecked", Reflex.stats(recovered.times).average, 220);

eq("reset clears lapses too", (function () {
  const g = game();
  g.begin();
  g.arm(0);
  g.press(9000);
  g.reset();
  return g.lapses;
})(), 0);

console.log("\n" + passed + " passed, " + failed + " failed.");
process.exit(failed ? 1 : 0);
