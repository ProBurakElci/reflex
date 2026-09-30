/*
 * The score card, 1080x1350.
 *
 * It has to read at thumbnail size in a feed, so it carries one big number,
 * the five rounds, and the line that says what the number means.
 */
(function (global) {
  "use strict";

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function draw(canvas, summary) {
    const W = 1080;
    const H = 1350;
    const ctx = canvas.getContext("2d");
    canvas.width = W;
    canvas.height = H;

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0d1526");
    bg.addColorStop(1, "#070c17");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(W * 0.86, 140, 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a78bfa";
    ctx.beginPath();
    ctx.arc(70, H - 90, 210, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";

    ctx.fillStyle = "#92a3c0";
    ctx.font = "34px system-ui, 'Segoe UI', sans-serif";
    ctx.fillText("my reaction time", W / 2, 150);

    // the number
    const gradient = ctx.createLinearGradient(200, 200, 880, 480);
    gradient.addColorStop(0, "#22c55e");
    gradient.addColorStop(1, "#38bdf8");
    ctx.fillStyle = gradient;
    ctx.font = "800 300px system-ui, 'Segoe UI', sans-serif";
    ctx.fillText(String(summary.average), W / 2, 440);

    ctx.fillStyle = "#e8eefb";
    ctx.font = "56px system-ui, 'Segoe UI', sans-serif";
    ctx.fillText("milliseconds", W / 2, 510);

    ctx.fillStyle = "#a78bfa";
    ctx.font = "600 42px system-ui, 'Segoe UI', sans-serif";
    ctx.fillText(summary.verdict, W / 2, 596);

    // the rounds
    const count = summary.times.length || 1;
    const boxW = Math.min(168, Math.floor((W - 140 - (count - 1) * 18) / count));
    const gap = 18;
    const totalW = count * boxW + (count - 1) * gap;
    let x = (W - totalW) / 2;
    const y = 680;

    for (const ms of summary.times) {
      const isBest = ms === summary.best;

      ctx.fillStyle = "#111b2e";
      roundRect(ctx, x, y, boxW, 150, 20);
      ctx.fill();
      ctx.strokeStyle = isBest ? "#22c55e" : "#1e2b45";
      ctx.lineWidth = 3;
      roundRect(ctx, x, y, boxW, 150, 20);
      ctx.stroke();

      ctx.fillStyle = isBest ? "#22c55e" : "#e8eefb";
      ctx.font = "700 52px system-ui, 'Segoe UI', sans-serif";
      ctx.fillText(String(ms), x + boxW / 2, y + 90);

      ctx.fillStyle = "#64748b";
      ctx.font = "24px system-ui, 'Segoe UI', sans-serif";
      ctx.fillText("ms", x + boxW / 2, y + 124);

      x += boxW + gap;
    }

    // the comparison
    ctx.fillStyle = "#111b2e";
    roundRect(ctx, 70, 900, W - 140, 180, 24);
    ctx.fill();
    ctx.strokeStyle = "#1e2b45";
    ctx.lineWidth = 3;
    roundRect(ctx, 70, 900, W - 140, 180, 24);
    ctx.stroke();

    ctx.fillStyle = "#92a3c0";
    ctx.font = "30px system-ui, 'Segoe UI', sans-serif";
    ctx.fillText("about the same as", W / 2, 960);
    ctx.fillStyle = "#e8eefb";
    ctx.font = "600 40px system-ui, 'Segoe UI', sans-serif";
    ctx.fillText(summary.benchmark.label, W / 2, 1020);
    ctx.fillStyle = "#64748b";
    ctx.font = "28px system-ui, 'Segoe UI', sans-serif";
    ctx.fillText("(" + summary.benchmark.ms + " ms)", W / 2, 1058);

    ctx.fillStyle = "#92a3c0";
    ctx.font = "32px system-ui, 'Segoe UI', sans-serif";
    ctx.fillText("beat it:", W / 2, 1180);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "600 38px Consolas, monospace";
    ctx.fillText("proburakelci.github.io/reflex", W / 2, 1236);

    ctx.textAlign = "left";
    return canvas;
  }

  global.ScoreCard = { draw };
})(typeof window !== "undefined" ? window : globalThis);
