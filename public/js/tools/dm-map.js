/**
 * DMMap — Interactive relationship map for the Distribution Family Map.
 * Renders 20 distribution nodes (7 discrete + 13 continuous) with thumbnail
 * PDFs/PMFs and connecting arrows showing mathematical relationships.
 * Supports click/hover hit-testing on nodes and arrows.
 */
var DMMap = (function () {
  "use strict";

  var CANVAS_ID = "dmMapCanvas";
  var DPR = window.devicePixelRatio || 1;
  var canvasEl = null;
  var ctxRef = null;
  var cW = 0;
  var cH = 0;

  var callbacks = {
    onNodeClick: null,
    onArrowClick: null
  };

  var hoveredNode = null;
  var hoveredArrow = null;

  /* -------------------------------------------------------
   * Grade filter — which distributions are in scope
   * ------------------------------------------------------- */

  var GRADE_DISTS = {
    "3": ["normal", "std_normal", "binomial"],
    "2": ["normal", "std_normal", "binomial", "poisson", "t", "chi2", "f"],
    "1": ["normal", "std_normal", "binomial", "poisson", "uniform", "exponential", "mv_normal", "t", "chi2", "f"]
  };

  var activeGrade = "all"; // "all" | "3" | "2" | "1"

  /* -------------------------------------------------------
   * Scroll / pan state for large map
   * ------------------------------------------------------- */

  var scrollY = 0;
  var isDragging = false;
  var dragStartY = 0;
  var dragStartScroll = 0;
  var mapTotalH = 0;

  /* -------------------------------------------------------
   * Node definitions — 20 distributions
   * Layout: 6 rows, positioned on a normalized grid
   * ------------------------------------------------------- */

  var NODE_W = 130;
  var NODE_H = 95;
  var THUMB_W = 100;
  var THUMB_H = 50;

  // Colors: discrete = orange family, continuous = blue family
  var C_DISC = "#e67e22";   // discrete orange
  var C_CONT = "#5b8def";   // continuous blue
  var C_SPEC = {
    hypergeometric: "#d35400",
    bernoulli:      "#e67e22",
    binomial:       "#f39c12",
    multinomial:    "#e74c3c",
    poisson:        "#e74c3c",
    geometric:      "#d35400",
    neg_binomial:   "#c0392b",
    normal:         "#3498db",
    std_normal:     "#5b8def",
    lognormal:      "#8e44ad",
    mv_normal:      "#2980b9",
    exponential:    "#16a085",
    gamma:          "#1abc9c",
    chi2:           "#e67e22",
    t:              "#27ae60",
    f:              "#c0392b",
    beta:           "#9b59b6",
    uniform:        "#34495e",
    weibull:        "#2c3e50",
    cauchy:         "#7f8c8d"
  };

  // Node positions (cx, cy as fraction of canvas)
  // Layout designed so arrows between connected nodes don't cross other nodes.
  // Min cx ≈ 0.10 and min cy ≈ 0.07 to keep cards fully within the canvas.
  // Row 0 (cy≈0.07): hypergeometric                                  uniform
  // Row 1 (cy≈0.20): bernoulli
  // Row 2 (cy≈0.33): binomial      multinomial      geometric
  // Row 3 (cy≈0.47): poisson   normal     neg_binomial   exponential
  // Row 4 (cy≈0.62): mv_normal  lognormal  std_normal  gamma  weibull
  // Row 5 (cy≈0.77): chi2          t          beta
  // Row 6 (cy≈0.92): f           cauchy

  var NODES = {
    // --- Discrete (orange) — left side ---
    hypergeometric: { cx: 0.14, cy: 0.07, label: "超幾何",       sub: "Hypergeometric", discrete: true },
    bernoulli:      { cx: 0.14, cy: 0.20, label: "ベルヌーイ",   sub: "Bernoulli",      discrete: true },
    binomial:       { cx: 0.14, cy: 0.33, label: "二項",         sub: "Binomial",       discrete: true },
    multinomial:    { cx: 0.32, cy: 0.33, label: "多項",         sub: "Multinomial",    discrete: true },
    poisson:        { cx: 0.10, cy: 0.47, label: "ポアソン",     sub: "Poisson",        discrete: true },
    geometric:      { cx: 0.50, cy: 0.33, label: "幾何",         sub: "Geometric",      discrete: true },
    neg_binomial:   { cx: 0.50, cy: 0.47, label: "負の二項",     sub: "Neg. Binomial",  discrete: true },

    // --- Continuous (blue) — right side + lower rows ---
    uniform:        { cx: 0.88, cy: 0.07, label: "一様",         sub: "Uniform",        discrete: false },
    normal:         { cx: 0.28, cy: 0.47, label: "正規",         sub: "Normal",         discrete: false },
    exponential:    { cx: 0.68, cy: 0.47, label: "指数",         sub: "Exponential",    discrete: false },
    mv_normal:      { cx: 0.11, cy: 0.62, label: "多変量正規",   sub: "MV Normal",      discrete: false },
    lognormal:      { cx: 0.29, cy: 0.62, label: "対数正規",     sub: "Lognormal",      discrete: false },
    std_normal:     { cx: 0.47, cy: 0.62, label: "標準正規",     sub: "Std. Normal",    discrete: false },
    gamma:          { cx: 0.65, cy: 0.62, label: "ガンマ",       sub: "Gamma",          discrete: false },
    weibull:        { cx: 0.82, cy: 0.62, label: "ワイブル",     sub: "Weibull",        discrete: false },
    chi2:           { cx: 0.40, cy: 0.77, label: "\u03C7\u00B2", sub: "Chi-squared",    discrete: false },
    t:              { cx: 0.58, cy: 0.77, label: "t",            sub: "Student's t",    discrete: false },
    beta:           { cx: 0.76, cy: 0.77, label: "ベータ",       sub: "Beta",           discrete: false },
    f:              { cx: 0.46, cy: 0.92, label: "F",            sub: "Fisher's F",     discrete: false },
    cauchy:         { cx: 0.68, cy: 0.92, label: "コーシー",     sub: "Cauchy",         discrete: false }
  };

  var nodeBounds = {};

  /* -------------------------------------------------------
   * Arrow (relationship) definitions — ~25 relationships
   * ------------------------------------------------------- */

  var ARROWS = [
    // Axis 1: Bernoulli / Binomial flow (left side, rows 0-3)
    { id: "hyper_bern",      from: "hypergeometric", to: "bernoulli",   label: "n=1",                  curvature: 0 },
    { id: "hyper_binom",     from: "hypergeometric", to: "binomial",    label: "N\u2192\u221E",        curvature: -1.1 },
    { id: "bern_binom",      from: "bernoulli",      to: "binomial",    label: "n\u56DE\u8A66\u884C",  curvature: 0 },
    { id: "binom_multinom",  from: "binomial",       to: "multinomial", label: "k\u30AB\u30C6\u30B4\u30EA", curvature: -0.5 },
    { id: "binom_poisson",   from: "binomial",       to: "poisson",     label: "n\u2192\u221E, p\u21920", curvature: -0.15 },
    { id: "binom_normal",    from: "binomial",       to: "normal",      label: "CLT",                    curvature: 0.15 },

    // Axis 2: Geometric / Exponential flow (middle, rows 1-4)
    { id: "bern_geom",       from: "bernoulli",      to: "geometric",   label: "\u521D\u6210\u529F\u307E\u3067", curvature: -0.2 },
    { id: "geom_negbin",     from: "geometric",      to: "neg_binomial", label: "r\u56DE\u6210\u529F", curvature: 0 },
    { id: "geom_exp",        from: "geometric",      to: "exponential",  label: "\u9023\u7D9A\u5316",  curvature: -0.15 },
    { id: "exp_gamma",       from: "exponential",    to: "gamma",       label: "\u03B1\u500B\u306E\u548C", curvature: 0.2 },
    { id: "negbin_gamma",    from: "neg_binomial",   to: "gamma",       label: "\u9023\u7D9A\u5316",   curvature: 0.15 },

    // Axis 3: Normal → Standard Normal derivatives (rows 3-6)
    { id: "norm_std",        from: "normal",         to: "std_normal",  label: "\u6A19\u6E96\u5316",    curvature: 0.15 },
    { id: "std_chi2",        from: "std_normal",     to: "chi2",        label: "Z\u00B2\u306E\u548C",  curvature: 0 },
    { id: "std_t",           from: "std_normal",     to: "t",           label: "Z/\u221A(\u03C7\u00B2/n)", curvature: 0.35 },
    { id: "chi2_f",          from: "chi2",           to: "f",           label: "\u6BD4",                 curvature: -0.15 },
    { id: "t_f",             from: "t",              to: "f",           label: "t\u00B2=F(1,n)",         curvature: 0.15 },

    // Gamma family connections (rows 4-5)
    { id: "gamma_chi2",      from: "gamma",          to: "chi2",        label: "\u03B1=k/2",            curvature: -0.45 },
    { id: "gamma_beta",      from: "gamma",          to: "beta",        label: "\u6BD4",                curvature: 0.15 },
    { id: "gamma_exp",       from: "gamma",          to: "exponential", label: "\u03B1=1",              curvature: 0.2 },

    // Normal family connections (rows 3-4)
    { id: "norm_lognorm",    from: "normal",         to: "lognormal",   label: "e^X",                   curvature: 0 },
    { id: "norm_mvnorm",     from: "normal",         to: "mv_normal",   label: "p\u6B21\u5143",        curvature: 0 },

    // Uniform connections (top-right to middle/lower, arc through sparse right side)
    { id: "unif_exp",        from: "uniform",        to: "exponential", label: "-ln(U)",                curvature: -0.15 },
    { id: "exp_weibull",     from: "exponential",    to: "weibull",     label: "k\u4E57\u5909\u63DB",  curvature: 0.15 },
    { id: "t_cauchy",        from: "t",              to: "cauchy",      label: "\u03BD=1",              curvature: 0.15 },
    { id: "unif_beta",       from: "uniform",        to: "beta",        label: "a=b=1",                curvature: 0.3 },
    { id: "poisson_normal",  from: "poisson",        to: "normal",      label: "\u03BB\u2192\u221E",   curvature: 0 }
  ];

  var arrowPaths = [];

  /* -------------------------------------------------------
   * Init
   * ------------------------------------------------------- */

  function init(config) {
    callbacks.onNodeClick = config.onNodeClick || null;
    callbacks.onArrowClick = config.onArrowClick || null;

    canvasEl = document.getElementById(CANVAS_ID);
    if (!canvasEl) return;
    ctxRef = canvasEl.getContext("2d");

    bindEvents();
    resizeAndDraw();
    window.addEventListener("resize", resizeAndDraw);
  }

  /* -------------------------------------------------------
   * Resize
   * ------------------------------------------------------- */

  function resizeAndDraw() {
    if (!canvasEl) return;
    var parent = canvasEl.parentElement;
    cW = parent.clientWidth;
    cH = Math.max(850, cW * 1.15);
    mapTotalH = cH;
    canvasEl.style.width = cW + "px";
    canvasEl.style.height = cH + "px";
    canvasEl.width = cW * DPR;
    canvasEl.height = cH * DPR;
    ctxRef.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Adjust node sizes for small screens
    if (cW < 500) {
      NODE_W = 95; NODE_H = 72; THUMB_W = 70; THUMB_H = 35;
    } else if (cW < 700) {
      NODE_W = 110; NODE_H = 80; THUMB_W = 82; THUMB_H = 40;
    } else {
      NODE_W = 130; NODE_H = 95; THUMB_W = 100; THUMB_H = 50;
    }

    draw();
  }

  function resize() {
    resizeAndDraw();
  }

  /* -------------------------------------------------------
   * Draw
   * ------------------------------------------------------- */

  function isNodeInGrade(key) {
    if (activeGrade === "all") return true;
    var list = GRADE_DISTS[activeGrade];
    return list && list.indexOf(key) !== -1;
  }

  function isArrowInGrade(arrow) {
    if (activeGrade === "all") return true;
    return isNodeInGrade(arrow.from) && isNodeInGrade(arrow.to);
  }

  function draw() {
    if (!ctxRef) return;
    var c = ctxRef;
    c.clearRect(0, 0, cW, cH);

    computeNodeBounds();
    drawArrows(c);

    for (var key in NODES) {
      drawNode(c, key);
    }
  }

  function computeNodeBounds() {
    nodeBounds = {};
    for (var key in NODES) {
      var n = NODES[key];
      var x = n.cx * cW - NODE_W / 2;
      var y = n.cy * cH - NODE_H / 2;
      // Clamp to canvas bounds so cards never go off-screen
      if (x < 2) x = 2;
      if (y < 2) y = 2;
      if (x + NODE_W > cW - 2) x = cW - NODE_W - 2;
      if (y + NODE_H > cH - 2) y = cH - NODE_H - 2;
      nodeBounds[key] = { x: x, y: y, w: NODE_W, h: NODE_H };
    }
  }

  /* -------------------------------------------------------
   * Draw a distribution node card
   * ------------------------------------------------------- */

  function drawNode(c, key) {
    var n = NODES[key];
    var b = nodeBounds[key];
    var color = C_SPEC[key] || (n.discrete ? C_DISC : C_CONT);
    var isHovered = (hoveredNode === key);
    var inGrade = isNodeInGrade(key);
    var dimmed = !inGrade;

    // Apply dimming via globalAlpha for out-of-scope nodes
    c.save();
    if (dimmed) c.globalAlpha = 0.25;

    // Shadow
    c.save();
    c.shadowColor = isHovered ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.08)";
    c.shadowBlur = isHovered ? 14 : 6;
    c.shadowOffsetY = isHovered ? 3 : 1;

    // Card background
    roundRect(c, b.x, b.y, b.w, b.h, 8);
    c.fillStyle = "#fff";
    c.fill();
    c.restore(); // restore shadow only

    // Border
    c.strokeStyle = isHovered ? color : "#e0e0e0";
    c.lineWidth = isHovered ? 2.5 : 1;
    roundRect(c, b.x, b.y, b.w, b.h, 8);
    c.stroke();

    // Color accent bar at top
    c.save();
    c.beginPath();
    c.moveTo(b.x + 8, b.y);
    c.lineTo(b.x + b.w - 8, b.y);
    c.quadraticCurveTo(b.x + b.w, b.y, b.x + b.w, b.y + 8);
    c.lineTo(b.x + b.w, b.y + 3);
    c.lineTo(b.x, b.y + 3);
    c.lineTo(b.x, b.y + 8);
    c.quadraticCurveTo(b.x, b.y, b.x + 8, b.y);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    c.restore();

    // Title
    c.fillStyle = "#333";
    c.font = "bold " + (NODE_W < 110 ? "10" : "12") + "px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "top";
    c.fillText(n.label, b.x + b.w / 2, b.y + 8);

    // Subtitle
    c.fillStyle = "#999";
    c.font = (NODE_W < 110 ? "8" : "9") + "px sans-serif";
    c.fillText(n.sub, b.x + b.w / 2, b.y + (NODE_W < 110 ? 20 : 23));

    // Thumbnail PDF/PMF — clip to card bounds to prevent overflow
    var thumbX = b.x + (b.w - THUMB_W) / 2;
    var thumbY = b.y + (NODE_W < 110 ? 30 : 36);

    c.save();
    c.beginPath();
    c.rect(b.x + 2, thumbY, b.w - 4, b.h - (thumbY - b.y) - 4);
    c.clip();

    var params = DMPdf.getDefaultParams(key);
    var pdf = DMPdf.getPdf(key, params);
    var range = DMPdf.getRange(key, params);

    if (n.discrete && key !== "multinomial" && key !== "mv_normal") {
      DMCanvas.drawMiniPmf(c, thumbX, thumbY, THUMB_W, THUMB_H, pdf, range.xMin, range.xMax, color);
    } else {
      DMCanvas.drawMiniPdf(c, thumbX, thumbY, THUMB_W, THUMB_H, pdf, range.xMin, range.xMax, color);
    }
    c.restore();

    c.restore(); // restore globalAlpha

    // Highlight border for in-grade nodes when filtering is active
    if (inGrade && activeGrade !== "all") {
      c.save();
      c.strokeStyle = color;
      c.lineWidth = 2.5;
      c.setLineDash([]);
      roundRect(c, b.x - 1, b.y - 1, b.w + 2, b.h + 2, 9);
      c.stroke();
      c.restore();
    }
  }

  /* -------------------------------------------------------
   * Draw arrows between nodes
   * ------------------------------------------------------- */

  function drawArrows(c) {
    arrowPaths = [];

    for (var i = 0; i < ARROWS.length; i++) {
      var arrow = ARROWS[i];
      var fromB = nodeBounds[arrow.from];
      var toB = nodeBounds[arrow.to];
      if (!fromB || !toB) continue;

      var fromCx = fromB.x + fromB.w / 2;
      var fromCy = fromB.y + fromB.h / 2;
      var toCx = toB.x + toB.w / 2;
      var toCy = toB.y + toB.h / 2;

      var startPt = getEdgePoint(fromB, toCx, toCy);
      var endPt = getEdgePoint(toB, fromCx, fromCy);

      // Control point for quadratic bezier
      var midX = (startPt.x + endPt.x) / 2;
      var midY = (startPt.y + endPt.y) / 2;
      var dx = endPt.x - startPt.x;
      var dy = endPt.y - startPt.y;
      var nx = -dy * (arrow.curvature || 0);
      var ny = dx * (arrow.curvature || 0);
      var cpX = midX + nx;
      var cpY = midY + ny;

      var isHovered = (hoveredArrow === arrow.id);
      var arrowInGrade = isArrowInGrade(arrow);
      var arrowDimmed = !arrowInGrade;

      c.save();
      if (arrowDimmed) c.globalAlpha = 0.15;

      // Draw the curve
      c.beginPath();
      c.moveTo(startPt.x, startPt.y);
      c.quadraticCurveTo(cpX, cpY, endPt.x, endPt.y);
      c.strokeStyle = isHovered ? "#8b6ccf" : (arrowInGrade && activeGrade !== "all" ? "rgba(100,100,100,0.6)" : "rgba(150,150,150,0.4)");
      c.lineWidth = isHovered ? 2.5 : (arrowInGrade && activeGrade !== "all" ? 2 : 1.5);
      c.setLineDash([]);
      c.stroke();

      // Arrowhead
      drawArrowhead(c, cpX, cpY, endPt.x, endPt.y,
        isHovered ? "#8b6ccf" : (arrowInGrade && activeGrade !== "all" ? "rgba(100,100,100,0.7)" : "rgba(150,150,150,0.5)"));

      // Label at midpoint of curve
      var labelX = 0.25 * startPt.x + 0.5 * cpX + 0.25 * endPt.x;
      var labelY = 0.25 * startPt.y + 0.5 * cpY + 0.25 * endPt.y;
      drawArrowLabel(c, arrow.label, labelX, labelY, isHovered);

      c.restore();

      arrowPaths.push({
        id: arrow.id,
        start: startPt,
        cp: { x: cpX, y: cpY },
        end: endPt,
        labelX: labelX,
        labelY: labelY,
        arrow: arrow
      });
    }
  }

  function drawArrowhead(c, fromX, fromY, toX, toY, color) {
    var angle = Math.atan2(toY - fromY, toX - fromX);
    var size = 8;
    c.save();
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(toX, toY);
    c.lineTo(toX - size * Math.cos(angle - 0.35), toY - size * Math.sin(angle - 0.35));
    c.lineTo(toX - size * Math.cos(angle + 0.35), toY - size * Math.sin(angle + 0.35));
    c.closePath();
    c.fill();
    c.restore();
  }

  function drawArrowLabel(c, text, x, y, isHovered) {
    c.font = (NODE_W < 110 ? "8" : "9") + "px sans-serif";
    var tw = c.measureText(text).width;
    var pad = 4;

    // Background pill
    c.fillStyle = isHovered ? "#f5f0ff" : "rgba(255,255,255,0.92)";
    c.strokeStyle = isHovered ? "#8b6ccf" : "#e0e0e0";
    c.lineWidth = 0.8;
    roundRect(c, x - tw / 2 - pad, y - 7, tw + pad * 2, 15, 7);
    c.fill();
    c.stroke();

    // Text
    c.fillStyle = isHovered ? "#6b4caf" : "#888";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, x, y + 0.5);
  }

  /* -------------------------------------------------------
   * Hit testing
   * ------------------------------------------------------- */

  function hitTestNode(pos) {
    for (var key in nodeBounds) {
      var b = nodeBounds[key];
      if (pos.x >= b.x && pos.x <= b.x + b.w &&
          pos.y >= b.y && pos.y <= b.y + b.h) {
        return key;
      }
    }
    return null;
  }

  function hitTestArrow(pos) {
    for (var i = 0; i < arrowPaths.length; i++) {
      var ap = arrowPaths[i];
      var dlx = pos.x - ap.labelX;
      var dly = pos.y - ap.labelY;
      if (Math.sqrt(dlx * dlx + dly * dly) < 30) return ap.id;
      if (distToQuadBezier(pos, ap.start, ap.cp, ap.end) < 10) return ap.id;
    }
    return null;
  }

  function distToQuadBezier(pos, p0, p1, p2) {
    var minDist = Infinity;
    var steps = 30;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var mt = 1 - t;
      var bx = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
      var by = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;
      var dx = pos.x - bx;
      var dy = pos.y - by;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  /* -------------------------------------------------------
   * Events
   * ------------------------------------------------------- */

  function bindEvents() {
    canvasEl.addEventListener("click", handleClick);
    canvasEl.addEventListener("mousemove", handleMouseMove);
    canvasEl.addEventListener("mouseleave", handleMouseLeave);
    canvasEl.addEventListener("touchstart", handleTouch, { passive: true });
  }

  function getCanvasPos(e) {
    var rect = canvasEl.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function handleClick(e) {
    var pos = getCanvasPos(e);
    var node = hitTestNode(pos);
    if (node) {
      if (callbacks.onNodeClick) callbacks.onNodeClick(node);
      return;
    }
    var arrowId = hitTestArrow(pos);
    if (arrowId) {
      var arrowDef = null;
      for (var i = 0; i < ARROWS.length; i++) {
        if (ARROWS[i].id === arrowId) { arrowDef = ARROWS[i]; break; }
      }
      if (arrowDef && callbacks.onArrowClick) callbacks.onArrowClick(arrowDef);
    }
  }

  function handleMouseMove(e) {
    var pos = getCanvasPos(e);
    var prevNode = hoveredNode;
    var prevArrow = hoveredArrow;

    hoveredNode = hitTestNode(pos);
    hoveredArrow = hoveredNode ? null : hitTestArrow(pos);

    canvasEl.style.cursor = (hoveredNode || hoveredArrow) ? "pointer" : "default";

    if (hoveredNode !== prevNode || hoveredArrow !== prevArrow) {
      draw();
    }
  }

  function handleMouseLeave() {
    if (hoveredNode || hoveredArrow) {
      hoveredNode = null;
      hoveredArrow = null;
      canvasEl.style.cursor = "default";
      draw();
    }
  }

  function handleTouch(e) {
    if (!e.touches.length) return;
    var touch = e.touches[0];
    var rect = canvasEl.getBoundingClientRect();
    var pos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };

    var node = hitTestNode(pos);
    if (node) {
      if (callbacks.onNodeClick) callbacks.onNodeClick(node);
      return;
    }
    var arrowId = hitTestArrow(pos);
    if (arrowId) {
      var arrowDef = null;
      for (var i = 0; i < ARROWS.length; i++) {
        if (ARROWS[i].id === arrowId) { arrowDef = ARROWS[i]; break; }
      }
      if (arrowDef && callbacks.onArrowClick) callbacks.onArrowClick(arrowDef);
    }
  }

  /* -------------------------------------------------------
   * Utility: edge point, rounded rect
   * ------------------------------------------------------- */

  function getEdgePoint(bounds, targetX, targetY) {
    var cx = bounds.x + bounds.w / 2;
    var cy = bounds.y + bounds.h / 2;
    var dx = targetX - cx;
    var dy = targetY - cy;
    var hw = bounds.w / 2;
    var hh = bounds.h / 2;

    if (dx === 0 && dy === 0) return { x: cx, y: cy };

    var scaleX = Math.abs(dx) > 0 ? hw / Math.abs(dx) : Infinity;
    var scaleY = Math.abs(dy) > 0 ? hh / Math.abs(dy) : Infinity;
    var scale = Math.min(scaleX, scaleY);

    return { x: cx + dx * scale, y: cy + dy * scale };
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  /* -------------------------------------------------------
   * Grade filter
   * ------------------------------------------------------- */

  function setGrade(grade) {
    activeGrade = grade;
    draw();
  }

  /* -------------------------------------------------------
   * Public API
   * ------------------------------------------------------- */

  return {
    init: init,
    draw: draw,
    resize: resize,
    setGrade: setGrade,
    NODES: NODES,
    ARROWS: ARROWS,
    GRADE_DISTS: GRADE_DISTS
  };
})();
