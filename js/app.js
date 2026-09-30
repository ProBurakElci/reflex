/*
 * Wiring.
 *
 * The rule the page follows: the clock starts at the moment the colour is on
 * screen, not when the timer fired. So the timestamp is taken inside a
 * requestAnimationFrame callback after the paint that made it green. Taking it
 * any earlier flatters everybody by a frame.
 */
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const stage = $("#stage");
  const title = $("#stage-title");
  const sub = $("#stage-sub");
  const big = $("#stage-big");
  const summary = $("#summary");

  const game = Reflex.createGame();
  let timer = null;
  let lastSummary = null;

  const COPY = {
    idle: { title: "How fast are you?", sub: "Click when the screen turns green", big: "" },
    waiting: { title: "Wait...", sub: "not yet", big: "" },
    ready: { title: "NOW", sub: "", big: "" },
    tooSoon: { title: "Too soon", sub: "click to run that round again", big: "" },
    tooSlow: { title: "That one got away", sub: "click to run that round again", big: "" },
  };

  function setStage(state, overrides) {
    const copy = Object.assign({}, COPY[state] || COPY.idle, overrides || {});
    stage.className = "stage stage-" + state;
    title.textContent = copy.title;
    sub.textContent = copy.sub;
    big.textContent = copy.big;
  }

  function clearTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function startRound() {
    summary.hidden = true;
    const wait = game.begin();
    setStage("waiting", { sub: "round " + (game.round + 1) + " of " + game.config.rounds });

    clearTimer();
    timer = setTimeout(function () {
      requestAnimationFrame(function () {
        setStage("ready");
        requestAnimationFrame(function () {
          game.arm(performance.now());
        });
      });
    }, wait);
  }

  function showResult(ms) {
    setStage("result", {
      title: ms + " ms",
      sub: "click for the next round",
      big: "",
    });
  }

  function renderBenchmarks(average) {
    const list = $("#benchmarks");
    list.textContent = "";

    const rows = Reflex.BENCHMARKS.map(function (b) {
      return { ms: b.ms, label: b.label, you: false };
    });
    if (average !== null && average !== undefined) {
      rows.push({ ms: average, label: "you, just now", you: true });
    }
    rows.sort(function (a, b) { return a.ms - b.ms; });

    for (const row of rows) {
      const li = document.createElement("li");
      if (row.you) li.className = "you";

      const label = document.createElement("span");
      label.textContent = row.label;
      const value = document.createElement("b");
      value.textContent = row.ms + " ms";

      li.appendChild(label);
      li.appendChild(value);
      list.appendChild(li);
    }
  }

  /** A personal best, kept in this browser and nowhere else. */
  function rememberBest(best) {
    let previous = null;
    try {
      previous = Number(localStorage.getItem("reflex-best")) || null;
      if (!previous || best < previous) localStorage.setItem("reflex-best", String(best));
    } catch (err) {
      return; // private windows block storage; the page works fine without it
    }

    const line = $("#best-ever");
    if (previous && best >= previous) {
      line.hidden = false;
      line.textContent = "Your best on this device: " + previous + " ms.";
    } else if (previous) {
      line.hidden = false;
      line.textContent = "New personal best - the old one was " + previous + " ms.";
    } else {
      line.hidden = true;
    }
  }

  function finish() {
    const s = Reflex.stats(game.times);
    const benchmark = Reflex.nearestBenchmark(s.average);
    const verdict = Reflex.verdict(s.average);

    lastSummary = {
      times: game.times.slice(),
      average: s.average,
      best: s.best,
      worst: s.worst,
      verdict: verdict,
      benchmark: benchmark,
      falseStarts: game.falseStarts,
    };

    setStage("done", {
      title: s.average + " ms",
      sub: "average over " + s.count + " rounds",
      big: "",
    });

    $("#summary-verdict").textContent = verdict;
    $("#fig-average").textContent = s.average;
    $("#fig-best").textContent = s.best;
    $("#fig-worst").textContent = s.worst;

    const rounds = $("#rounds");
    rounds.textContent = "";
    game.times.forEach(function (ms, i) {
      const li = document.createElement("li");
      li.textContent = "#" + (i + 1) + "  " + ms + " ms";
      if (ms === s.best) li.className = "best";
      rounds.appendChild(li);
    });

    const compare = $("#compare");
    compare.textContent = "";
    compare.appendChild(document.createTextNode("Your average is closest to "));
    const strong = document.createElement("b");
    strong.textContent = benchmark.label;
    compare.appendChild(strong);
    compare.appendChild(document.createTextNode(" (" + benchmark.ms + " ms)."));

    const falseStarts = $("#false-starts");
    if (game.falseStarts) {
      falseStarts.hidden = false;
      falseStarts.textContent = game.falseStarts === 1
        ? "One false start - that round did not count."
        : game.falseStarts + " false starts - those rounds did not count.";
    } else {
      falseStarts.hidden = true;
    }

    renderBenchmarks(s.average);
    rememberBest(s.best);

    summary.hidden = false;
    summary.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------------- input ---------------- */

  function press() {
    const now = performance.now();

    if (game.state === "idle" || game.state === "done") {
      if (game.state === "done") game.reset();
      startRound();
      return;
    }

    if (game.state === "tooSoon" || game.state === "tooSlow" || game.state === "result") {
      startRound();
      return;
    }

    const outcome = game.press(now);

    if (outcome.type === "tooSoon") {
      clearTimer();
      setStage("tooSoon");
      return;
    }

    if (outcome.type === "tooSlow") {
      // Not a reaction - a walk-away. The round is repeated so one lapse does
      // not decide the average.
      setStage("tooSlow", { sub: "that round did not count - click to redo it" });
      return;
    }

    if (outcome.type === "hit") {
      if (outcome.done) finish();
      else showResult(outcome.ms);
    }
  }

  stage.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    press();
  });

  document.addEventListener("keydown", function (event) {
    if (event.code !== "Space" && event.code !== "Enter") return;
    if (event.target.tagName === "BUTTON" && event.target !== stage) return;
    event.preventDefault();
    press();
  });

  $("#again").addEventListener("click", function (event) {
    event.stopPropagation();
    game.reset();
    summary.hidden = true;
    startRound();
  });

  $("#download").addEventListener("click", function (event) {
    event.stopPropagation();
    if (!lastSummary) return;

    const canvas = $("#card-canvas");
    ScoreCard.draw(canvas, lastSummary);

    canvas.toBlob(function (blob) {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "my-reaction-time.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    }, "image/png");
  });

  /* ---------------- start ---------------- */

  setStage("idle");
  renderBenchmarks(null);
})();
