/**
 * DMCanvas — Canvas drawing toolkit for the Distribution Map.
 * Handles DPR scaling, coordinate mapping, curve drawing, axes, and mini-PDF thumbnails.
 * Manages multiple canvases via a registry pattern (same as CCChart).
 */
var DMCanvas = (function () {
  "use strict";

  var DPR = window.devicePixelRatio || 1;
  var registry = {};
  var active = null;

  var DEFAULT_MARGIN = { top: 30, right: 30, bottom: 50, left: 50 };

  /* -------------------------------------------------------
   * Registry management
   * ------------------------------------------------------- */

  function init(canvasId) {
    var c = document.getElementById(canvasId);
    if (!c) return;
    registry[canvasId] = { canvas: c, ctx: c.getContext("2d") };
    use(canvasId);
  }

  function use(canvasId) {
    active = registry[canvasId] || null;
  }

  function canvas() { return active ? active.canvas : null; }
  function ctx() { return active ? active.ctx : null; }

  /* -------------------------------------------------------
   * Resize with DPR
   * ------------------------------------------------------- */

  function resize(canvasId, height) {
    var entry = registry[canvasId];
    if (!entry) return { w: 0, h: 0 };
    var c = entry.canvas;
    var parent = c.parentElement;
    var w = parent.clientWidth;
    var h = height || 400;
    c.style.width = w + "px";
    c.style.height = h + "px";
    c.width = w * DPR;
    c.height = h * DPR;
    entry.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { w: w, h: h };
  }

  /* -------------------------------------------------------
   * Coordinate mapping
   * ------------------------------------------------------- */

  function plotW(w, margin) {
    var m = margin || DEFAULT_MARGIN;
    return w - m.left - m.right;
  }

  function plotH(h, margin) {
    var m = margin || DEFAULT_MARGIN;
    return h - m.top - m.bottom;
  }

  function mapX(x, xMin, xMax, w, margin) {
    var m = margin || DEFAULT_MARGIN;
    return m.left + (x - xMin) / (xMax - xMin) * plotW(w, m);
  }

  function mapY(y, yMax, h, margin) {
    var m = margin || DEFAULT_MARGIN;
    return m.top + plotH(h, m) - (y / yMax) * plotH(h, m);
  }

  /* -------------------------------------------------------
   * Drawing primitives
   * ------------------------------------------------------- */

  function clear(w, h) {
    var c = ctx();
    if (!c) return;
    c.clearRect(0, 0, w, h);
  }

  function drawCurve(c, pdf, xMin, xMax, yMax, w, h, margin, color, lineWidth) {
    var m = margin || DEFAULT_MARGIN;
    c.beginPath();
    c.strokeStyle = color || "#333";
    c.lineWidth = lineWidth || 2;
    var steps = 300;
    var dx = (xMax - xMin) / steps;
    for (var i = 0; i <= steps; i++) {
      var x = xMin + i * dx;
      var y = pdf(x);
      if (!isFinite(y)) y = 0;
      var px = mapX(x, xMin, xMax, w, m);
      var py = mapY(y, yMax, h, m);
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
  }

  function drawFilledCurve(c, pdf, xMin, xMax, yMax, w, h, margin, color) {
    var m = margin || DEFAULT_MARGIN;
    c.beginPath();
    c.fillStyle = color || "rgba(100,100,200,0.15)";
    var steps = 300;
    var dx = (xMax - xMin) / steps;
    c.moveTo(mapX(xMin, xMin, xMax, w, m), mapY(0, yMax, h, m));
    for (var i = 0; i <= steps; i++) {
      var x = xMin + i * dx;
      var y = pdf(x);
      if (!isFinite(y)) y = 0;
      c.lineTo(mapX(x, xMin, xMax, w, m), mapY(y, yMax, h, m));
    }
    c.lineTo(mapX(xMax, xMin, xMax, w, m), mapY(0, yMax, h, m));
    c.closePath();
    c.fill();
  }

  function drawAxes(c, xMin, xMax, yMax, w, h, margin) {
    var m = margin || DEFAULT_MARGIN;
    c.strokeStyle = "#666";
    c.lineWidth = 1;

    // X axis
    var y0 = mapY(0, yMax, h, m);
    c.beginPath();
    c.moveTo(m.left, y0);
    c.lineTo(m.left + plotW(w, m), y0);
    c.stroke();

    // Tick marks
    c.fillStyle = "#888";
    c.font = "11px sans-serif";
    c.textAlign = "center";
    var range = xMax - xMin;
    var tickStep = niceStep(range, 8);
    var tick = Math.ceil(xMin / tickStep) * tickStep;
    while (tick <= xMax) {
      var tx = mapX(tick, xMin, xMax, w, m);
      c.beginPath();
      c.moveTo(tx, y0);
      c.lineTo(tx, y0 + 5);
      c.stroke();
      c.fillText(tick.toFixed(tickStep < 1 ? 1 : 0), tx, y0 + 18);
      tick += tickStep;
    }
  }

  /* -------------------------------------------------------
   * Mini PDF for map thumbnails
   * ------------------------------------------------------- */

  function drawMiniPdf(c, x, y, w, h, pdf, xMin, xMax, color) {
    var steps = 120;
    var dx = (xMax - xMin) / steps;
    var yMax = 0;
    for (var i = 0; i <= steps; i++) {
      var val = pdf(xMin + i * dx);
      if (isFinite(val) && val > yMax) yMax = val;
    }
    if (yMax === 0) return;
    yMax *= 1.1;

    // Filled area
    c.beginPath();
    c.fillStyle = color.replace(")", ",0.12)").replace("rgb", "rgba");
    c.moveTo(x, y + h);
    for (var j = 0; j <= steps; j++) {
      var xv = xMin + j * dx;
      var yv = pdf(xv);
      if (!isFinite(yv)) yv = 0;
      var px = x + (j / steps) * w;
      var py = y + h - (yv / yMax) * h;
      c.lineTo(px, py);
    }
    c.lineTo(x + w, y + h);
    c.closePath();
    c.fill();

    // Stroke line
    c.beginPath();
    c.strokeStyle = color;
    c.lineWidth = 1.5;
    for (var k = 0; k <= steps; k++) {
      var xv2 = xMin + k * dx;
      var yv2 = pdf(xv2);
      if (!isFinite(yv2)) yv2 = 0;
      var px2 = x + (k / steps) * w;
      var py2 = y + h - (yv2 / yMax) * h;
      if (k === 0) c.moveTo(px2, py2);
      else c.lineTo(px2, py2);
    }
    c.stroke();
  }

  /* -------------------------------------------------------
   * Mini PMF for discrete distribution thumbnails (bar chart)
   * ------------------------------------------------------- */

  function drawMiniPmf(c, x, y, w, h, pmf, xMin, xMax, color) {
    var lo = Math.max(0, Math.floor(xMin));
    var hi = Math.ceil(xMax);
    var count = hi - lo + 1;
    if (count <= 0) return;

    // Find yMax
    var yMax = 0;
    for (var i = lo; i <= hi; i++) {
      var val = pmf(i);
      if (isFinite(val) && val > yMax) yMax = val;
    }
    if (yMax === 0) return;
    yMax *= 1.1;

    var barW = Math.max(1, (w / count) * 0.6);
    var gap = w / count;

    // Bars
    for (var j = lo; j <= hi; j++) {
      var val = pmf(j);
      if (!isFinite(val)) val = 0;
      var barH = (val / yMax) * h;
      var bx = x + (j - lo + 0.5) * gap - barW / 2;
      var by = y + h - barH;

      // Filled bar
      c.fillStyle = color.replace(")", ",0.25)").replace("rgb", "rgba");
      c.fillRect(bx, by, barW, barH);

      // Bar outline
      c.strokeStyle = color;
      c.lineWidth = 1;
      c.strokeRect(bx, by, barW, barH);
    }
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

  /* -------------------------------------------------------
   * Public API
   * ------------------------------------------------------- */

  return {
    DPR: DPR,
    init: init,
    use: use,
    canvas: canvas,
    ctx: ctx,
    resize: resize,
    clear: clear,
    mapX: mapX,
    mapY: mapY,
    plotW: plotW,
    plotH: plotH,
    drawCurve: drawCurve,
    drawFilledCurve: drawFilledCurve,
    drawAxes: drawAxes,
    drawMiniPdf: drawMiniPdf,
    drawMiniPmf: drawMiniPmf,
    DEFAULT_MARGIN: DEFAULT_MARGIN
  };
})();
