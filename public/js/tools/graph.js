/**
 * Canvas-based distribution graph renderer.
 * Draws PDF curves, rejection regions, critical values, and test statistic.
 */
var SimGraph = (function () {
  "use strict";

  var canvas, ctx;
  var DPR = window.devicePixelRatio || 1;

  // Layout constants
  var MARGIN = { top: 30, right: 30, bottom: 50, left: 50 };
  var COLORS = {
    curve: "#333",
    reject: "rgba(220, 53, 69, 0.25)",
    rejectBorder: "rgba(220, 53, 69, 0.6)",
    critical: "#dc3545",
    statReject: "#dc3545",
    statAccept: "#28a745",
    axis: "#666",
    grid: "#eee",
    text: "#333",
    label: "#555"
  };

  /* -------------------------------------------------------
   * Init
   * ------------------------------------------------------- */

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
  }

  function resize() {
    if (!canvas) return;
    var parent = canvas.parentElement;
    var w = parent.clientWidth - 20;
    var h = 300;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* -------------------------------------------------------
   * Coordinate mapping
   * ------------------------------------------------------- */

  function plotW() { return (canvas.width / DPR) - MARGIN.left - MARGIN.right; }
  function plotH() { return (canvas.height / DPR) - MARGIN.top - MARGIN.bottom; }

  function mapX(x, xMin, xMax) {
    return MARGIN.left + (x - xMin) / (xMax - xMin) * plotW();
  }
  function mapY(y, yMax) {
    return MARGIN.top + plotH() - (y / yMax) * plotH();
  }

  /* -------------------------------------------------------
   * PDF functions (client-side, for drawing only)
   * ------------------------------------------------------- */

  function normalPdf(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  function tPdf(x, df) {
    var c = Math.exp(gammaLn((df + 1) / 2) - gammaLn(df / 2)) / Math.sqrt(df * Math.PI);
    return c * Math.pow(1 + x * x / df, -(df + 1) / 2);
  }

  function chi2Pdf(x, df) {
    if (x <= 0) return 0;
    var k2 = df / 2;
    return Math.exp((k2 - 1) * Math.log(x) - x / 2 - k2 * Math.LN2 - gammaLn(k2));
  }

  function fPdfCalc(x, d1, d2) {
    if (x <= 0) return 0;
    var h1 = d1 / 2, h2 = d2 / 2;
    return Math.exp(
      h1 * Math.log(d1) + h2 * Math.log(d2) +
      (h1 - 1) * Math.log(x) -
      (h1 + h2) * Math.log(d1 * x + d2) -
      gammaLn(h1) - gammaLn(h2) + gammaLn(h1 + h2)
    );
  }

  function gammaLn(z) {
    var c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    var x = c[0];
    for (var i = 1; i < 9; i++) x += c[i] / (z + i - 1);
    var t = z + 6.5;
    return 0.5 * Math.log(2 * Math.PI) + (z - 0.5) * Math.log(t) - t + Math.log(x);
  }

  /* -------------------------------------------------------
   * Get PDF function for result
   * ------------------------------------------------------- */

  function getPdf(result) {
    var statName = result.stat.name;
    var df = result.stat.df;

    if (statName === "z") return normalPdf;
    if (statName === "t") return function (x) { return tPdf(x, df.v || df); };
    if (statName === "\u03C7\u00B2" || statName === "chi2") return function (x) { return chi2Pdf(x, df.v || df); };
    if (statName === "F") return function (x) { return fPdfCalc(x, df.df1, df.df2); };
    return normalPdf;
  }

  /* -------------------------------------------------------
   * Determine plot range
   * ------------------------------------------------------- */

  function getRange(result) {
    var statName = result.stat.name;
    var statVal = result.stat.value;
    var df = result.stat.df;
    var crit = result.critical;

    if (statName === "z" || statName === "t") {
      var extent = Math.max(4, Math.abs(statVal) + 1, Math.abs(crit.left || 0) + 1, Math.abs(crit.right || 0) + 1);
      return { xMin: -extent, xMax: extent };
    }
    if (statName === "\u03C7\u00B2" || statName === "chi2") {
      var max = Math.max(statVal, crit.right || 0, (df.v || 1) * 2.5);
      return { xMin: 0, xMax: max + 2 };
    }
    if (statName === "F") {
      var max2 = Math.max(statVal, crit.right || 0, 4);
      return { xMin: 0, xMax: max2 * 1.3 };
    }
    return { xMin: -4, xMax: 4 };
  }

  /* -------------------------------------------------------
   * Draw
   * ------------------------------------------------------- */

  function draw(result) {
    if (!canvas || !ctx) return;

    // Exact tests (binom, poisson) — draw bar chart
    if (result.test_type === "binom" || result.test_type === "poisson") {
      drawExactTest(result);
      return;
    }

    resize();
    ctx.clearRect(0, 0, canvas.width / DPR, canvas.height / DPR);

    var pdf = getPdf(result);
    var range = getRange(result);
    var xMin = range.xMin, xMax = range.xMax;

    // Find yMax by sampling
    var yMax = 0;
    var steps = 400;
    var dx = (xMax - xMin) / steps;
    for (var i = 0; i <= steps; i++) {
      var xv = xMin + i * dx;
      var yv = pdf(xv);
      if (yv > yMax) yMax = yv;
    }
    yMax *= 1.15; // padding

    // Draw axes
    drawAxes(xMin, xMax, yMax);

    // Draw rejection regions (shaded)
    drawRejectionRegions(pdf, result.critical, xMin, xMax, yMax);

    // Draw PDF curve
    drawCurve(pdf, xMin, xMax, yMax);

    // Draw critical value lines
    drawCriticalLines(result.critical, yMax, xMin, xMax, pdf);

    // Draw test statistic line
    drawStatisticLine(result.stat.value, result.decision, yMax, xMin, xMax, pdf);

    // Draw labels
    drawLabels(result, xMin, xMax, yMax);

    // Update legend
    updateLegend(result);
  }

  function drawAxes(xMin, xMax, yMax) {
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1;

    // X axis
    var y0 = mapY(0, yMax);
    ctx.beginPath();
    ctx.moveTo(MARGIN.left, y0);
    ctx.lineTo(MARGIN.left + plotW(), y0);
    ctx.stroke();

    // Tick marks on X
    ctx.fillStyle = COLORS.label;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    var range = xMax - xMin;
    var tickStep = niceStep(range, 8);
    var tick = Math.ceil(xMin / tickStep) * tickStep;
    while (tick <= xMax) {
      var tx = mapX(tick, xMin, xMax);
      ctx.beginPath();
      ctx.moveTo(tx, y0);
      ctx.lineTo(tx, y0 + 5);
      ctx.stroke();
      ctx.fillText(tick.toFixed(tickStep < 1 ? 1 : 0), tx, y0 + 18);
      tick += tickStep;
    }
  }

  function drawCurve(pdf, xMin, xMax, yMax) {
    ctx.beginPath();
    ctx.strokeStyle = COLORS.curve;
    ctx.lineWidth = 2;
    var steps = 400;
    var dx = (xMax - xMin) / steps;
    for (var i = 0; i <= steps; i++) {
      var x = xMin + i * dx;
      var y = pdf(x);
      var px = mapX(x, xMin, xMax);
      var py = mapY(y, yMax);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  function drawRejectionRegions(pdf, critical, xMin, xMax, yMax) {
    var steps = 200;
    ctx.fillStyle = COLORS.reject;

    // Left rejection region
    if (critical.left != null) {
      ctx.beginPath();
      var x0 = xMin;
      ctx.moveTo(mapX(x0, xMin, xMax), mapY(0, yMax));
      var dx = (critical.left - xMin) / steps;
      for (var i = 0; i <= steps; i++) {
        var x = x0 + i * dx;
        ctx.lineTo(mapX(x, xMin, xMax), mapY(pdf(x), yMax));
      }
      ctx.lineTo(mapX(critical.left, xMin, xMax), mapY(0, yMax));
      ctx.closePath();
      ctx.fill();
    }

    // Right rejection region
    if (critical.right != null) {
      ctx.beginPath();
      ctx.moveTo(mapX(critical.right, xMin, xMax), mapY(0, yMax));
      var dx2 = (xMax - critical.right) / steps;
      for (var j = 0; j <= steps; j++) {
        var x2 = critical.right + j * dx2;
        ctx.lineTo(mapX(x2, xMin, xMax), mapY(pdf(x2), yMax));
      }
      ctx.lineTo(mapX(xMax, xMin, xMax), mapY(0, yMax));
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawCriticalLines(critical, yMax, xMin, xMax, pdf) {
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = COLORS.critical;
    ctx.lineWidth = 1.5;

    if (critical.left != null) {
      var cx = mapX(critical.left, xMin, xMax);
      var cy = mapY(pdf(critical.left), yMax);
      ctx.beginPath();
      ctx.moveTo(cx, mapY(0, yMax));
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
    if (critical.right != null) {
      var cx2 = mapX(critical.right, xMin, xMax);
      var cy2 = mapY(pdf(critical.right), yMax);
      ctx.beginPath();
      ctx.moveTo(cx2, mapY(0, yMax));
      ctx.lineTo(cx2, cy2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawStatisticLine(statValue, decision, yMax, xMin, xMax, pdf) {
    var color = decision === "reject" ? COLORS.statReject : COLORS.statAccept;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;

    var sx = mapX(statValue, xMin, xMax);
    var sy = mapY(pdf(statValue), yMax);

    ctx.beginPath();
    ctx.moveTo(sx, mapY(0, yMax));
    ctx.lineTo(sx, sy - 5);
    ctx.stroke();

    // Arrow head
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 10);
    ctx.lineTo(sx - 4, sy - 2);
    ctx.lineTo(sx + 4, sy - 2);
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(statValue.toFixed(4), sx, mapY(0, yMax) + 35);
  }

  function drawLabels(result, xMin, xMax, yMax) {
    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";

    // Critical value labels
    ctx.font = "10px sans-serif";
    ctx.fillStyle = COLORS.critical;
    ctx.textAlign = "center";
    var crit = result.critical;
    if (crit.left != null) {
      ctx.fillText(crit.left.toFixed(4), mapX(crit.left, xMin, xMax), MARGIN.top - 5);
    }
    if (crit.right != null) {
      ctx.fillText(crit.right.toFixed(4), mapX(crit.right, xMin, xMax), MARGIN.top - 5);
    }
  }

  function updateLegend(result) {
    var legend = document.getElementById("simGraphLegend");
    if (!legend) return;
    legend.innerHTML =
      '<span class="sim-legend-item"><span class="sim-legend-swatch" style="background:' + COLORS.reject + ';border:1px solid ' + COLORS.rejectBorder + '"></span> 棄却域</span>' +
      '<span class="sim-legend-item"><span class="sim-legend-line" style="border-color:' + COLORS.critical + ';border-style:dashed"></span> 棄却域</span>' +
      '<span class="sim-legend-item"><span class="sim-legend-line" style="border-color:' + (result.decision === "reject" ? COLORS.statReject : COLORS.statAccept) + '"></span> 検定統計量</span>';
  }

  /* -------------------------------------------------------
   * Exact test bar chart (binomial / poisson)
   * ------------------------------------------------------- */

  function drawExactTest(result) {
    resize();
    ctx.clearRect(0, 0, canvas.width / DPR, canvas.height / DPR);

    var observed = result.stat.value;
    var pValue = result.p_value;
    var decision = result.decision;

    // Simple info display for exact tests
    ctx.fillStyle = COLORS.text;
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";

    var cx = (canvas.width / DPR) / 2;
    var cy = (canvas.height / DPR) / 2;

    ctx.fillText("正確法による検定", cx, cy - 40);
    ctx.font = "12px sans-serif";
    ctx.fillText("観測値: " + observed, cx, cy - 10);
    ctx.fillText("p値: " + (pValue != null ? pValue.toFixed(4) : "N/A"), cx, cy + 15);

    var color = decision === "reject" ? COLORS.statReject : COLORS.statAccept;
    ctx.fillStyle = color;
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(result.decision_text, cx, cy + 50);

    updateLegend(result);
  }

  /* -------------------------------------------------------
   * Utility
   * ------------------------------------------------------- */

  function niceStep(range, maxTicks) {
    var rough = range / maxTicks;
    var mag = Math.pow(10, Math.floor(Math.log10(rough)));
    var norm = rough / mag;
    var nice;
    if (norm <= 1.5) nice = 1;
    else if (norm <= 3) nice = 2;
    else if (norm <= 7) nice = 5;
    else nice = 10;
    return nice * mag;
  }

  return {
    init: init,
    draw: draw,
    resize: resize
  };
})();
