# How fast are you?

[![tests](https://github.com/ProBurakElci/reflex/actions/workflows/ci.yml/badge.svg)](https://github.com/ProBurakElci/reflex/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Click the moment the screen turns green. Five rounds, one number.**

### → [proburakelci.github.io/reflex](https://proburakelci.github.io/reflex/)

Then the number is put next to things you already have a feel for: one blink, a sprinter off the starting gun, a tired adult. And you can download a card with your five rounds on it.

Nothing is sent anywhere. There is no server to send it to.

## The two details that decide whether the number is honest

**When the clock starts.** The obvious way is to start timing when the timer fires. That is wrong by a frame or more, because the screen is not green yet — the browser has not painted. This page takes the timestamp inside a `requestAnimationFrame` callback *after* the paint that turned it green, so the clock starts when the colour is actually on screen. It costs everyone a few milliseconds of honesty.

**What counts as a reaction.** Two kinds of press are thrown away:

- pressing while the screen is still red is a false start, and the round is repeated
- pressing more than two seconds after it turns green is not a reaction either — the tab lost focus, or you walked away. One ten-second round would decide the whole average, so that round is repeated too.

Both are counted and reported, so nothing disappears quietly.

## Playing

Click, tap, or press `Space`. It works the same on a phone.

Your personal best is remembered in your own browser with `localStorage` — not on a server, and not shared with anyone. Clear your site data and it is gone.

## What the comparisons are

| | |
|---|---|
| 100 ms | the false-start threshold in athletics — a sprinter who "reacts" faster than this is assumed to have guessed |
| 150 ms | roughly how long one blink lasts |
| 200 ms | a sprinter off the starting gun |
| 250 ms | a typical adult, wide awake |
| 350 ms | a typical adult, tired |

These are published figures for simple visual reaction time. They are **not** data collected from people using this page — the page has no server and collects nothing.

## Tests

```bash
node test/run-tests.js
```

62 checks. The game is a state machine with a clock, and both halves are easy to get wrong, so every transition has a test: pressing before the light, pressing while a result is showing, pressing exactly on the two-second limit and one millisecond past it, a run that finishes, a run that is reset, and a whole game played badly with false starts and a walk-away in it.

The game logic lives in `js/reflex.js` with no browser in it, which is why all of that runs in Node by calling functions with made-up timestamps instead of by clicking at a screen and hoping.

## Structure

```
index.html      the page
styles.css      the look
js/reflex.js    the game: states, timing rules, statistics (no DOM)
js/card.js      the downloadable 1080x1350 score card
js/app.js       wiring, and the one paint-then-time rule that matters
```

## License

MIT — see [LICENSE](LICENSE).
