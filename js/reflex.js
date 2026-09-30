/*
 * The game, with no browser in it.
 *
 * Everything that decides what happens - when the light turns green, whether a
 * press counted, what the numbers mean at the end - lives here, so it can be
 * tested by calling functions with made-up timestamps instead of by clicking
 * at a screen and hoping.
 *
 * The browser's job is only to draw the state and to report two things: a
 * timestamp when the light turned, and a timestamp when the person pressed.
 */
(function (global) {
  "use strict";

  const DEFAULTS = {
    rounds: 5,
    minWait: 1400,   // ms before the light can turn
    maxWait: 4200,   // and the latest it will
    tooSlow: 2000,   // a press later than this is a lapse, not a reaction
  };

  /*
   * Reference points, so a number means something.
   * These are published figures for simple visual reaction time, not data
   * collected from anybody using this page - the page has no server to
   * collect anything with.
   */
  const BENCHMARKS = [
    { ms: 100, label: "the false-start threshold in athletics" },
    { ms: 150, label: "one blink" },
    { ms: 200, label: "a sprinter off the starting gun" },
    { ms: 250, label: "a typical adult, wide awake" },
    { ms: 350, label: "a typical adult, tired" },
  ];

  function createGame(options) {
    const config = Object.assign({}, DEFAULTS, options || {});
    const random = config.random || Math.random;

    const game = {
      state: "idle",      // idle -> waiting -> ready -> (result) -> ... -> done
      round: 0,
      times: [],
      falseStarts: 0,
      lapses: 0,
      readyAt: null,
      waitFor: null,
      lastTime: null,
      config,
    };

    /** Begins a round: the light goes red and a delay is chosen. */
    game.begin = function () {
      if (game.state === "done") return null;
      game.state = "waiting";
      game.readyAt = null;
      game.lastTime = null;
      game.waitFor = Math.round(
        config.minWait + random() * (config.maxWait - config.minWait)
      );
      return game.waitFor;
    };

    /** The delay elapsed: the light turns green at `now`. */
    game.arm = function (now) {
      if (game.state !== "waiting") return false;
      game.state = "ready";
      game.readyAt = now;
      return true;
    };

    /**
     * A press. Returns what it meant:
     *   { type: "tooSoon" }               pressed before the light turned
     *   { type: "hit", ms, round }        a counted reaction
     *   { type: "ignored" }               pressed while a result was on screen
     */
    game.press = function (now) {
      if (game.state === "waiting") {
        game.falseStarts++;
        game.state = "tooSoon";
        return { type: "tooSoon" };
      }

      if (game.state !== "ready") return { type: "ignored" };

      const ms = Math.max(0, Math.round(now - game.readyAt));

      // A press this late is not a reaction: the tab lost focus, or somebody
      // walked away. Counting it would wreck the average, which is the whole
      // number this page exists to show, so the round is repeated instead.
      if (ms > config.tooSlow) {
        game.lapses++;
        game.state = "tooSlow";
        return { type: "tooSlow", ms: ms };
      }

      game.times.push(ms);
      game.round++;
      game.lastTime = ms;
      game.state = game.round >= config.rounds ? "done" : "result";

      return { type: "hit", ms, round: game.round, done: game.state === "done" };
    };

    /** After a false start or a shown result, go back for another round. */
    game.next = function () {
      if (game.state === "done") return false;
      return game.begin() !== null;
    };

    game.reset = function () {
      game.state = "idle";
      game.round = 0;
      game.times = [];
      game.falseStarts = 0;
      game.lapses = 0;
      game.readyAt = null;
      game.waitFor = null;
      game.lastTime = null;
    };

    return game;
  }

  /** Best, average and median of the rounds played. */
  function stats(times) {
    if (!times.length) {
      return { count: 0, best: null, worst: null, average: null, median: null };
    }

    const sorted = times.slice().sort((a, b) => a - b);
    const sum = times.reduce((total, value) => total + value, 0);
    const middle = Math.floor(sorted.length / 2);

    return {
      count: times.length,
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      average: Math.round(sum / times.length),
      median: sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2),
    };
  }

  /** The closest reference point, so the number lands. */
  function nearestBenchmark(ms) {
    if (ms === null || ms === undefined) return null;
    let closest = BENCHMARKS[0];
    for (const benchmark of BENCHMARKS) {
      if (Math.abs(benchmark.ms - ms) < Math.abs(closest.ms - ms)) closest = benchmark;
    }
    return closest;
  }

  /** One line for the end of the run. */
  function verdict(average) {
    if (average === null || average === undefined) return "no rounds yet";
    if (average < 180) return "faster than most people can blink";
    if (average < 220) return "sprinter territory";
    if (average < 260) return "quick";
    if (average < 320) return "right about average";
    if (average < 400) return "unhurried";
    return "were you looking at something else?";
  }

  const Reflex = { createGame, stats, nearestBenchmark, verdict, BENCHMARKS, DEFAULTS };

  global.Reflex = Reflex;
  if (typeof module !== "undefined" && module.exports) module.exports = Reflex;
})(typeof window !== "undefined" ? window : globalThis);
