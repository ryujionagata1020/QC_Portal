/**
 * Canvas-based control chart renderer.
 * Supports multiple canvases via an internal registry.
 * Draws CL, UCL, LCL, zone shading, data points, and highlights.
 */
var CCChart = (function () {
  "use strict";

  var DPR = window.devicePixelRatio || 1;
  var registry = {}; // { canvasId: { canvas, ctx } }
  var active = null; // current { canvas, ctx }

  var MARGIN = { top: 30, right: 30, bottom: 50, left: 65 };

  var COLORS = {
    cl: "#8b6ccf",
    ucl: "#dc3545",
    lcl: "#dc3545",
    zoneA: "rgba(220, 53, 69, 0.07)",
    zoneB: "rgba(255, 152, 0, 0.07)",
    zoneC: "rgba(76, 175, 80, 0.07)",
    sigma1: "rgba(76, 175, 80, 0.3)",
    sigma2: "rgba(255, 152, 0, 0.3)",
    sigma3: "rgba(220, 53, 69, 0.3)",
    point: "#333",
    pointAnomaly: "#dc3545",
    line: "#bbb",
    highlight: "rgba(255, 235, 59, 0.35)",
    grid: "#eee",
    text: "#333",
    label: "#888",
    zoneLabelBg: "rgba(255,255,255,0.85)"
  };

  var POINT_RADIUS = 4;
  var POINT_RADIUS_ANOMALY = 6;

  /**
   * Register and initialise a canvas. Can be called multiple times.
   * @param {string} canvasId
   */
  function init(canvasId) {
    var c = document.getElementById(canvasId);
    if (!c) return;
    registry[canvasId] = { canvas: c, ctx: c.getContext("2d") };
    use(canvasId);
    resize();
  }

  /** Switch the active canvas context by id. */
  function use(canvasId) {
    active = registry[canvasId] || null;
  }

  function canvas() { return active ? active.canvas : null; }
  function ctx()    { return active ? active.ctx    : null; }

  function resize() {
    var c = canvas();
    if (!c) return;
    var parent = c.parentElement;
    var w = parent.clientWidth;
    var h = 340;
    c.style.width = w + "px";
    c.style.height = h + "px";
    c.width = w * DPR;
    c.height = h * DPR;
    ctx().setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function plotW() { return (canvas().width / DPR) - MARGIN.left - MARGIN.right; }
  function plotH() { return (canvas().height / DPR) - MARGIN.top - MARGIN.bottom; }

  function mapX(index, total) {
    if (total <= 1) return MARGIN.left + plotW() / 2;
    return MARGIN.left + (index / (total - 1)) * plotW();
  }

  function mapY(value, yMin, yMax) {
    return MARGIN.top + plotH() - ((value - yMin) / (yMax - yMin)) * plotH();
  }

  /**
   * Draw the control chart.
   * @param {string} canvasId - Which canvas to draw on
   * @param {number[]} data - Array of data points
   * @param {object} config
   */
  function draw(canvasId, data, config) {
    use(canvasId);
    if (!canvas() || !ctx()) return;
    resize();
    ctx().clearRect(0, 0, canvas().width / DPR, canvas().height / DPR);

    if (!data || data.length === 0) return;

    var mean = config.mean;
    var sigma = config.sigma;
    var maxIdx = config.maxIndex != null ? config.maxIndex : data.length - 1;
    var visibleData = data.slice(0, maxIdx + 1);
    var total = visibleData.length;

    // Y-axis range: mean +/- 4*sigma
    var yMin = mean - 4 * sigma;
    var yMax = mean + 4 * sigma;

    // Zone shading
    if (config.showZoneLines) {
      drawZoneShading(mean, sigma, yMin, yMax);
    }

    // Horizontal reference lines (always show CL, UCL, LCL)
    drawReferenceLines(mean, sigma, yMin, yMax, config.showZoneLines);

    // Highlight region (hint level 2)
    if (config.highlightRegionStart != null && config.highlightRegionEnd != null) {
      drawHighlightRegion(config.highlightRegionStart, config.highlightRegionEnd, total, yMin, yMax);
    }

    // Connecting lines
    drawConnectingLines(visibleData, total, yMin, yMax);

    // Data points
    var highlightSet = {};
    if (config.highlightIndices) {
      for (var h = 0; h < config.highlightIndices.length; h++) {
        highlightSet[config.highlightIndices[h]] = true;
      }
    }
    drawDataPoints(visibleData, total, yMin, yMax, highlightSet);

    // X-axis labels
    drawXAxis(total);

    // Y-axis labels
    drawYAxis(mean, sigma, yMin, yMax, config.showZoneLines);
  }

  function drawZoneShading(mean, sigma, yMin, yMax) {
    var x0 = MARGIN.left;
    var x1 = MARGIN.left + plotW();
    var c = ctx();

    // Zone C: within +/- 1-sigma (green)
    var y1sUp = mapY(mean + sigma, yMin, yMax);
    var y1sDown = mapY(mean - sigma, yMin, yMax);
    c.fillStyle = COLORS.zoneC;
    c.fillRect(x0, y1sUp, x1 - x0, y1sDown - y1sUp);

    // Zone B: 1-sigma to 2-sigma (orange)
    var y2sUp = mapY(mean + 2 * sigma, yMin, yMax);
    var y2sDown = mapY(mean - 2 * sigma, yMin, yMax);
    c.fillStyle = COLORS.zoneB;
    c.fillRect(x0, y2sUp, x1 - x0, y1sUp - y2sUp);
    c.fillRect(x0, y1sDown, x1 - x0, y2sDown - y1sDown);

    // Zone A: 2-sigma to 3-sigma (red)
    var y3sUp = mapY(mean + 3 * sigma, yMin, yMax);
    var y3sDown = mapY(mean - 3 * sigma, yMin, yMax);
    c.fillStyle = COLORS.zoneA;
    c.fillRect(x0, y3sUp, x1 - x0, y2sUp - y3sUp);
    c.fillRect(x0, y2sDown, x1 - x0, y3sDown - y2sDown);
  }

  function drawReferenceLines(mean, sigma, yMin, yMax, showZones) {
    var x0 = MARGIN.left;
    var x1 = MARGIN.left + plotW();
    var c = ctx();

    // CL (center line) - solid purple
    c.strokeStyle = COLORS.cl;
    c.lineWidth = 2;
    c.setLineDash([]);
    var yCL = mapY(mean, yMin, yMax);
    c.beginPath();
    c.moveTo(x0, yCL);
    c.lineTo(x1, yCL);
    c.stroke();

    // UCL / LCL - dashed red
    c.strokeStyle = COLORS.ucl;
    c.lineWidth = 1.5;
    c.setLineDash([8, 4]);
    var yUCL = mapY(mean + 3 * sigma, yMin, yMax);
    c.beginPath();
    c.moveTo(x0, yUCL);
    c.lineTo(x1, yUCL);
    c.stroke();

    var yLCL = mapY(mean - 3 * sigma, yMin, yMax);
    c.beginPath();
    c.moveTo(x0, yLCL);
    c.lineTo(x1, yLCL);
    c.stroke();

    // 1-sigma and 2-sigma lines (dotted, only when zones shown)
    if (showZones) {
      c.lineWidth = 0.8;
      c.setLineDash([3, 5]);

      // +/- 1-sigma
      c.strokeStyle = COLORS.sigma1;
      var y1u = mapY(mean + sigma, yMin, yMax);
      var y1d = mapY(mean - sigma, yMin, yMax);
      c.beginPath(); c.moveTo(x0, y1u); c.lineTo(x1, y1u); c.stroke();
      c.beginPath(); c.moveTo(x0, y1d); c.lineTo(x1, y1d); c.stroke();

      // +/- 2-sigma
      c.strokeStyle = COLORS.sigma2;
      var y2u = mapY(mean + 2 * sigma, yMin, yMax);
      var y2d = mapY(mean - 2 * sigma, yMin, yMax);
      c.beginPath(); c.moveTo(x0, y2u); c.lineTo(x1, y2u); c.stroke();
      c.beginPath(); c.moveTo(x0, y2d); c.lineTo(x1, y2d); c.stroke();
    }

    c.setLineDash([]);
  }

  function drawHighlightRegion(start, end, total, yMin, yMax) {
    var x0 = mapX(Math.max(0, start - 0.5), total);
    var x1 = mapX(Math.min(total - 1, end + 0.5), total);
    var y0 = MARGIN.top;
    var y1 = MARGIN.top + plotH();

    ctx().fillStyle = COLORS.highlight;
    ctx().fillRect(x0, y0, x1 - x0, y1 - y0);
  }

  function drawConnectingLines(data, total, yMin, yMax) {
    if (data.length < 2) return;
    var c = ctx();
    c.strokeStyle = COLORS.line;
    c.lineWidth = 1.5;
    c.setLineDash([]);
    c.beginPath();
    for (var i = 0; i < data.length; i++) {
      var px = mapX(i, total);
      var py = mapY(data[i], yMin, yMax);
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
  }

  function drawDataPoints(data, total, yMin, yMax, highlightSet) {
    var c = ctx();
    for (var i = 0; i < data.length; i++) {
      var px = mapX(i, total);
      var py = mapY(data[i], yMin, yMax);
      var isHighlighted = highlightSet[i];

      c.beginPath();
      if (isHighlighted) {
        c.arc(px, py, POINT_RADIUS_ANOMALY, 0, 2 * Math.PI);
        c.fillStyle = COLORS.pointAnomaly;
        c.fill();
        c.strokeStyle = "#fff";
        c.lineWidth = 2;
        c.stroke();
      } else {
        c.arc(px, py, POINT_RADIUS, 0, 2 * Math.PI);
        c.fillStyle = COLORS.point;
        c.fill();
      }
    }
  }

  function drawXAxis(total) {
    var c = ctx();
    c.fillStyle = COLORS.label;
    c.font = "11px sans-serif";
    c.textAlign = "center";
    var yBase = MARGIN.top + plotH() + 20;

    // Determine tick interval
    var interval = 1;
    if (total > 40) interval = 10;
    else if (total > 20) interval = 5;
    else if (total > 10) interval = 2;

    for (var i = 0; i < total; i += interval) {
      var px = mapX(i, total);
      c.fillText(String(i + 1), px, yBase);

      // Tick mark
      c.strokeStyle = COLORS.grid;
      c.lineWidth = 0.5;
      c.beginPath();
      c.moveTo(px, MARGIN.top + plotH());
      c.lineTo(px, MARGIN.top + plotH() + 4);
      c.stroke();
    }

    // X-axis label
    c.fillStyle = COLORS.label;
    c.font = "12px sans-serif";
    c.textAlign = "center";
    c.fillText("サンプル番号", MARGIN.left + plotW() / 2, MARGIN.top + plotH() + 40);
  }

  function drawYAxis(mean, sigma, yMin, yMax, showZones) {
    var c = ctx();
    c.font = "10px sans-serif";
    c.textAlign = "right";

    // CL label
    c.fillStyle = COLORS.cl;
    c.font = "bold 11px sans-serif";
    c.fillText("CL", MARGIN.left - 8, mapY(mean, yMin, yMax) + 4);

    // UCL / LCL labels
    c.fillStyle = COLORS.ucl;
    c.font = "bold 10px sans-serif";
    c.fillText("UCL", MARGIN.left - 8, mapY(mean + 3 * sigma, yMin, yMax) + 4);
    c.fillText("LCL", MARGIN.left - 8, mapY(mean - 3 * sigma, yMin, yMax) + 4);

    if (showZones) {
      c.fillStyle = COLORS.label;
      c.font = "9px sans-serif";

      // Zone labels on the right side
      var xLabel = MARGIN.left + plotW() + 5;
      c.textAlign = "left";

      var zones = [
        { y: mean + 2.5 * sigma, label: "A" },
        { y: mean + 1.5 * sigma, label: "B" },
        { y: mean + 0.5 * sigma, label: "C" },
        { y: mean - 0.5 * sigma, label: "C" },
        { y: mean - 1.5 * sigma, label: "B" },
        { y: mean - 2.5 * sigma, label: "A" }
      ];

      for (var i = 0; i < zones.length; i++) {
        var zy = mapY(zones[i].y, yMin, yMax);
        c.fillStyle = COLORS.zoneLabelBg;
        c.fillRect(xLabel - 2, zy - 7, 14, 14);
        c.fillStyle = COLORS.label;
        c.fillText(zones[i].label, xLabel, zy + 4);
      }

      // Sigma labels
      c.textAlign = "right";
      c.fillStyle = COLORS.label;
      c.font = "9px sans-serif";
      var sigmaLabels = [
        { y: mean + sigma, label: "+1\u03C3" },
        { y: mean + 2 * sigma, label: "+2\u03C3" },
        { y: mean - sigma, label: "-1\u03C3" },
        { y: mean - 2 * sigma, label: "-2\u03C3" }
      ];
      for (var j = 0; j < sigmaLabels.length; j++) {
        c.fillText(sigmaLabels[j].label, MARGIN.left - 8, mapY(sigmaLabels[j].y, yMin, yMax) + 3);
      }
    }
  }

  /**
   * Draw a placeholder when no data is available.
   * @param {string} canvasId
   * @param {string} [message]
   */
  function drawPlaceholder(canvasId, message) {
    use(canvasId);
    if (!canvas() || !ctx()) return;
    resize();
    var c = ctx();
    c.clearRect(0, 0, canvas().width / DPR, canvas().height / DPR);
    c.fillStyle = COLORS.label;
    c.font = "14px sans-serif";
    c.textAlign = "center";
    c.fillText(message || "管理図を表示するにはスタートを押してください",
      (canvas().width / DPR) / 2, (canvas().height / DPR) / 2);
  }

  function clear(canvasId) {
    use(canvasId);
    if (!canvas() || !ctx()) return;
    ctx().clearRect(0, 0, canvas().width / DPR, canvas().height / DPR);
  }

  return {
    init: init,
    draw: draw,
    drawPlaceholder: drawPlaceholder,
    clear: clear,
    resize: resize
  };
})();
