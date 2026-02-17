/**
 * DMAnim — Animation engine for distribution transformation visualizations.
 * Uses requestAnimationFrame for smooth animations showing how distributions
 * relate to each other. Supports 25 relationship animations.
 */
var DMAnim = (function () {
  "use strict";

  var CANVAS_ID = "dmAnimCanvas";
  var DPR = window.devicePixelRatio || 1;
  var canvasEl = null;
  var ctxRef = null;
  var cW = 0;
  var cH = 400;
  var MARGIN = { top: 40, right: 30, bottom: 50, left: 50 };

  var animId = null;
  var startTime = 0;
  var currentAnim = null;
  var stepMode = false;
  var stepProgress = 0;
  var STEP_SIZE = 0.34;

  var onComplete = null;

  /* -------------------------------------------------------
   * Colors
   * ------------------------------------------------------- */

  var COLORS = {
    z:    "#5b8def",
    chi2: "#e67e22",
    t:    "#27ae60",
    f:    "#c0392b",
    binom: "#f39c12",
    poisson: "#e74c3c",
    normal: "#3498db",
    exp:  "#16a085",
    gamma: "#1abc9c",
    geom: "#d35400",
    bg:   "#fff",
    axis: "#666",
    grid: "#f0f0f0",
    text: "#333",
    neg:  "rgba(91, 141, 239, 0.25)",
    pos:  "rgba(230, 126, 34, 0.25)"
  };

  /* -------------------------------------------------------
   * Animation definitions
   * ------------------------------------------------------- */

  var ANIMATIONS = {
    // Axis 3: Standard Normal derivatives (original 4)
    std_chi2: {
      duration: 3000,
      title: "Z\u00B2\u306E\u548C \u2192 \u03C7\u00B2(k)",
      phases: [
        { name: "Z\u5206\u5E03\u3092\u8868\u793A", katex: "Z \\sim N(0,1)" },
        { name: "\u81EA\u4E57\u3067\u6298\u308A\u7573\u307F", katex: "X = Z^2" },
        { name: "\u03C7\u00B2(1)\u306B\u53CE\u675F", katex: "Z^2 \\sim \\chi^2(1)" }
      ],
      render: renderZtoChi2
    },
    std_t: {
      duration: 3000,
      title: "t = Z / \u221A(\u03C7\u00B2/n)",
      phases: [
        { name: "Z\u5206\u5E03\uFF08\u57FA\u672C\u5F62\uFF09", katex: "Z \\sim N(0,1)" },
        { name: "\u88FE\u304C\u91CD\u304F\u306A\u308B\u5909\u5316", katex: "t = \\frac{Z}{\\sqrt{\\chi^2(\\nu)/\\nu}}" },
        { name: "t(\u03BD)\u5206\u5E03", katex: "t \\sim t(\\nu)" }
      ],
      render: renderZtoT
    },
    chi2_f: {
      duration: 3000,
      title: "F = (\u03C7\u00B2\u2081/d\u2081)/(\u03C7\u00B2\u2082/d\u2082)",
      phases: [
        { name: "2\u3064\u306E\u03C7\u00B2\u5206\u5E03", katex: "\\chi^2_1(d_1),\\; \\chi^2_2(d_2)" },
        { name: "\u6BD4\u306E\u8A08\u7B97", katex: "F = \\frac{\\chi^2_1 / d_1}{\\chi^2_2 / d_2}" },
        { name: "F(d\u2081,d\u2082)\u5206\u5E03", katex: "F \\sim F(d_1, d_2)" }
      ],
      render: renderChi2toF
    },
    t_f: {
      duration: 2500,
      title: "t\u00B2 = F(1, n)",
      phases: [
        { name: "t\u5206\u5E03", katex: "t \\sim t(\\nu)" },
        { name: "\u81EA\u4E57\u5909\u63DB", katex: "t^2 = F(1, \\nu)" },
        { name: "F(1,n)\u5206\u5E03", katex: "t^2 \\sim F(1, \\nu)" }
      ],
      render: renderTtoF
    },

    // Axis 1: Bernoulli / Binomial
    bern_binom: {
      duration: 3000,
      title: "\u30D9\u30EB\u30CC\u30FC\u30A4 \u2192 \u4E8C\u9805\u5206\u5E03",
      phases: [
        { name: "\u30D9\u30EB\u30CC\u30FC\u30A4(p)", katex: "X \\sim \\text{Bern}(p)" },
        { name: "n\u56DE\u306E\u548C", katex: "S = \\sum_{i=1}^{n} X_i" },
        { name: "\u4E8C\u9805\u5206\u5E03", katex: "S \\sim \\text{Bin}(n, p)" }
      ],
      render: renderBernToBinom
    },
    binom_poisson: {
      duration: 3000,
      title: "\u4E8C\u9805 \u2192 \u30DD\u30A2\u30BD\u30F3 (n\u2192\u221E, p\u21920)",
      phases: [
        { name: "\u4E8C\u9805\u5206\u5E03", katex: "X \\sim \\text{Bin}(n, p)" },
        { name: "n\u589E\u52A0\u3001p\u6E1B\u5C11", katex: "n \\to \\infty,\\; p \\to 0,\\; np = \\lambda" },
        { name: "\u30DD\u30A2\u30BD\u30F3\u5206\u5E03", katex: "X \\sim \\text{Pois}(\\lambda)" }
      ],
      render: renderBinomToPoisson
    },
    binom_normal: {
      duration: 3000,
      title: "\u4E8C\u9805 \u2192 \u6B63\u898F (CLT)",
      phases: [
        { name: "\u4E8C\u9805\u5206\u5E03", katex: "X \\sim \\text{Bin}(n, p)" },
        { name: "n\u304C\u5927\u304D\u304F\u306A\u308B", katex: "n \\to \\infty" },
        { name: "\u6B63\u898F\u8FD1\u4F3C", katex: "X \\approx N(np,\\, np(1-p))" }
      ],
      render: renderBinomToNormal
    },

    // Axis 2: Exponential / Geometric
    geom_exp: {
      duration: 2500,
      title: "\u5E7E\u4F55 \u2192 \u6307\u6570 (\u9023\u7D9A\u5316)",
      phases: [
        { name: "\u5E7E\u4F55\u5206\u5E03", katex: "X \\sim \\text{Geom}(p)" },
        { name: "\u9023\u7D9A\u5316", katex: "p \\to 0" },
        { name: "\u6307\u6570\u5206\u5E03", katex: "X \\sim \\text{Exp}(\\lambda)" }
      ],
      render: renderGeomToExp
    },
    exp_gamma: {
      duration: 3500,
      title: "\u6307\u6570 \u2192 \u30AC\u30F3\u30DE (\u03B1\u500B\u306E\u548C)",
      phases: [
        { name: "\u6307\u6570\u5206\u5E03", katex: "X_i \\sim \\text{Exp}(\\beta)" },
        { name: "\u03B1\u500B\u306E\u548C", katex: "\\sum_{i=1}^{\\alpha} X_i" },
        { name: "\u30AC\u30F3\u30DE\u5206\u5E03", katex: "S \\sim \\Gamma(\\alpha, \\beta)" }
      ],
      render: renderExpToGamma
    },

    // Gamma family
    gamma_chi2: {
      duration: 2500,
      title: "\u30AC\u30F3\u30DE \u2192 \u03C7\u00B2 (\u03B1=k/2)",
      phases: [
        { name: "\u30AC\u30F3\u30DE\u5206\u5E03", katex: "X \\sim \\Gamma(\\alpha, \\beta)" },
        { name: "\u03B1=k/2, \u03B2=1/2", katex: "\\alpha = k/2,\\; \\beta = 1/2" },
        { name: "\u03C7\u00B2(k)\u5206\u5E03", katex: "X \\sim \\chi^2(k)" }
      ],
      render: renderGammaToChi2
    },

    // Normal family
    norm_std: {
      duration: 2500,
      title: "\u6B63\u898F \u2192 \u6A19\u6E96\u6B63\u898F (\u6A19\u6E96\u5316)",
      phases: [
        { name: "\u6B63\u898F\u5206\u5E03", katex: "X \\sim N(\\mu, \\sigma^2)" },
        { name: "\u6A19\u6E96\u5316", katex: "Z = \\frac{X - \\mu}{\\sigma}" },
        { name: "\u6A19\u6E96\u6B63\u898F\u5206\u5E03", katex: "Z \\sim N(0, 1)" }
      ],
      render: renderNormToStd
    },
    norm_lognorm: {
      duration: 2500,
      title: "\u6B63\u898F \u2192 \u5BFE\u6570\u6B63\u898F (e^X)",
      phases: [
        { name: "\u6B63\u898F\u5206\u5E03", katex: "X \\sim N(\\mu, \\sigma^2)" },
        { name: "\u6307\u6570\u5909\u63DB", katex: "Y = e^X" },
        { name: "\u5BFE\u6570\u6B63\u898F\u5206\u5E03", katex: "Y \\sim \\text{LogN}(\\mu, \\sigma^2)" }
      ],
      render: renderNormToLognorm
    },
    t_cauchy: {
      duration: 2500,
      title: "t(\u03BD=1) = \u30B3\u30FC\u30B7\u30FC",
      phases: [
        { name: "t\u5206\u5E03", katex: "X \\sim t(\\nu)" },
        { name: "\u03BD=1", katex: "\\nu = 1" },
        { name: "\u30B3\u30FC\u30B7\u30FC\u5206\u5E03", katex: "t(1) = \\text{Cauchy}(0,1)" }
      ],
      render: renderTtoCauchy
    },

    // Fallback: generic morph for arrows without dedicated animation
    _generic: {
      duration: 2000,
      title: "\u5206\u5E03\u306E\u95A2\u4FC2",
      phases: [
        { name: "\u5143\u306E\u5206\u5E03", katex: "A" },
        { name: "\u5909\u63DB", katex: "A \\to B" },
        { name: "\u5148\u306E\u5206\u5E03", katex: "B" }
      ],
      render: renderGenericMorph
    }
  };

  // Map arrow IDs to animation keys (some arrows share anims)
  var ARROW_TO_ANIM = {
    hyper_binom: "_generic",
    bern_binom: "bern_binom",
    binom_multinom: "_generic",
    binom_poisson: "binom_poisson",
    binom_normal: "binom_normal",
    bern_geom: "_generic",
    geom_negbin: "_generic",
    geom_exp: "geom_exp",
    exp_gamma: "exp_gamma",
    negbin_gamma: "_generic",
    norm_std: "norm_std",
    std_chi2: "std_chi2",
    std_t: "std_t",
    chi2_f: "chi2_f",
    t_f: "t_f",
    gamma_chi2: "gamma_chi2",
    gamma_beta: "_generic",
    gamma_exp: "_generic",
    norm_lognorm: "norm_lognorm",
    norm_mvnorm: "_generic",
    unif_exp: "_generic",
    exp_weibull: "_generic",
    t_cauchy: "t_cauchy",
    unif_beta: "_generic",
    poisson_normal: "_generic",
    // Legacy keys
    z_to_chi2: "std_chi2",
    z_sum_chi2: "std_chi2",
    z_to_t: "std_t",
    chi2_to_f: "chi2_f"
  };

  /* -------------------------------------------------------
   * Init
   * ------------------------------------------------------- */

  function init() {
    canvasEl = document.getElementById(CANVAS_ID);
    if (canvasEl) {
      ctxRef = canvasEl.getContext("2d");
    }
  }

  /* -------------------------------------------------------
   * Playback control
   * ------------------------------------------------------- */

  function play(animType, completeCb) {
    // Resolve arrow ID to animation key
    var animKey = ARROW_TO_ANIM[animType] || animType;
    var def = ANIMATIONS[animKey];
    if (!def) def = ANIMATIONS._generic;

    currentAnim = def;
    currentAnim._arrowId = animType;
    onComplete = completeCb || null;
    stepMode = false;
    stepProgress = 0;

    resizeCanvas();
    updateFormula(def.phases[0].katex);
    startTime = performance.now();
    tick();
  }

  function tick() {
    if (!currentAnim) return;

    var elapsed = performance.now() - startTime;
    var t = Math.min(elapsed / currentAnim.duration, 1.0);

    if (stepMode) {
      t = stepProgress;
    }

    var eased = easeInOutCubic(t);

    var phaseIdx = Math.min(Math.floor(t * currentAnim.phases.length), currentAnim.phases.length - 1);
    updateFormula(currentAnim.phases[phaseIdx].katex);

    ctxRef.clearRect(0, 0, cW, cH);
    currentAnim.render(ctxRef, eased, cW, cH, MARGIN);

    drawPhaseIndicator(ctxRef, t, currentAnim.phases);

    if (!stepMode && t < 1.0) {
      animId = requestAnimationFrame(tick);
    } else if (!stepMode) {
      animId = null;
      if (onComplete) onComplete();
    }
  }

  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    currentAnim = null;
  }

  function replay() {
    if (!currentAnim) return;
    var arrowId = currentAnim._arrowId;
    if (arrowId) play(arrowId, onComplete);
  }

  function step() {
    if (!currentAnim) return;
    stepMode = true;
    stepProgress = Math.min(stepProgress + STEP_SIZE, 1.0);

    var eased = easeInOutCubic(stepProgress);
    var phaseIdx = Math.min(Math.floor(stepProgress * currentAnim.phases.length), currentAnim.phases.length - 1);
    updateFormula(currentAnim.phases[phaseIdx].katex);

    ctxRef.clearRect(0, 0, cW, cH);
    currentAnim.render(ctxRef, eased, cW, cH, MARGIN);
    drawPhaseIndicator(ctxRef, stepProgress, currentAnim.phases);
  }

  /* -------------------------------------------------------
   * Animation renderers
   * ------------------------------------------------------- */

  function renderZtoChi2(c, t, w, h, m) {
    var xMin, xMax, yMax;

    if (t < 0.3) {
      xMin = -4.5; xMax = 4.5;
      yMax = DMPdf.getYMax(DMPdf.normalPdf, xMin, xMax);
      drawAnimAxes(c, xMin, xMax, yMax, w, h, m);
      drawRegion(c, DMPdf.normalPdf, xMin, 0, yMax, w, h, m, COLORS.neg);
      drawRegion(c, DMPdf.normalPdf, 0, xMax, yMax, w, h, m, COLORS.pos);
      drawAnimCurve(c, DMPdf.normalPdf, xMin, xMax, yMax, w, h, m, COLORS.z, 2.5);
      drawLabel(c, "Z \u223C N(0,1)", w / 2, m.top - 10, COLORS.z);
    } else if (t < 0.7) {
      var morphT = (t - 0.3) / 0.4;
      xMin = -4.5 * (1 - morphT); xMax = 10;
      if (xMin > -0.5) xMin = 0;

      var foldedPdf = function (x) {
        if (x <= 0.001) return 0;
        return DMPdf.normalPdf(Math.sqrt(x)) / Math.sqrt(x);
      };
      var chi2Pdf1 = function (x) { return DMPdf.chi2Pdf(x, 1); };
      var blendPdf = function (x) {
        var f1 = foldedPdf(x);
        var f2 = chi2Pdf1(x);
        if (!isFinite(f1)) f1 = 0;
        if (!isFinite(f2)) f2 = 0;
        return f1 * (1 - morphT) + f2 * morphT;
      };

      yMax = sampleYMax(blendPdf, 0.01, xMax, 300);
      yMax = Math.min(yMax * 1.15, 2.0);
      drawAnimAxes(c, Math.max(xMin, 0), xMax, yMax, w, h, m);

      if (xMin < 0) {
        c.save(); c.globalAlpha = 1 - morphT;
        drawAnimCurve(c, DMPdf.normalPdf, xMin, 0, yMax, w, h, m, COLORS.z, 1.5);
        c.restore();
      }

      var drawXMin = Math.max(xMin, 0.01);
      drawRegion(c, blendPdf, drawXMin, xMax, yMax, w, h, m, COLORS.pos);
      drawAnimCurve(c, blendPdf, drawXMin, xMax, yMax, w, h, m, lerpHex(COLORS.z, COLORS.chi2, morphT), 2.5);
      drawLabel(c, "Z\u00B2 \u2192 \u03C7\u00B2(1)", w / 2, m.top - 10, COLORS.text);
    } else {
      xMin = 0; xMax = 10;
      var chi2Final = function (x) { return DMPdf.chi2Pdf(x, 1); };
      yMax = DMPdf.getYMax(chi2Final, 0.01, xMax);
      drawAnimAxes(c, xMin, xMax, yMax, w, h, m);
      drawRegion(c, chi2Final, 0.01, xMax, yMax, w, h, m, COLORS.pos);
      drawAnimCurve(c, chi2Final, 0.01, xMax, yMax, w, h, m, COLORS.chi2, 2.5);
      drawLabel(c, "\u03C7\u00B2(1)", w / 2, m.top - 10, COLORS.chi2);
    }
  }

  function renderZtoT(c, t, w, h, m) {
    var xMin = -5, xMax = 5;
    var df = Math.max(1, Math.round(1 + t * 29));
    var tPdfBound = function (x) { return DMPdf.tPdf(x, df); };
    var yMax = DMPdf.getYMax(DMPdf.normalPdf, xMin, xMax);
    var tYMax = DMPdf.getYMax(tPdfBound, xMin, xMax);
    if (tYMax > yMax) yMax = tYMax;

    drawAnimAxes(c, xMin, xMax, yMax, w, h, m);
    c.save(); c.setLineDash([6, 4]);
    drawAnimCurve(c, DMPdf.normalPdf, xMin, xMax, yMax, w, h, m, "#aaa", 1.5);
    c.setLineDash([]); c.restore();
    drawAnimCurve(c, tPdfBound, xMin, xMax, yMax, w, h, m, COLORS.t, 2.5);

    c.fillStyle = "#aaa"; c.font = "11px sans-serif"; c.textAlign = "left";
    c.fillText("N(0,1)", DMCanvas.mapX(3, xMin, xMax, w, m),
      DMCanvas.mapY(DMPdf.normalPdf(3), yMax, h, m) - 8);
    drawLabel(c, "t(\u03BD=" + df + ")", w / 2, m.top - 10, COLORS.t);

    if (df > 30) {
      c.fillStyle = "#2e7d32"; c.font = "bold 11px sans-serif"; c.textAlign = "center";
      c.fillText("\u2714 \u03BD > 30: \u6B63\u898F\u5206\u5E03\u3067\u4EE3\u7528\u53EF\u80FD", w / 2, h - 10);
    }
  }

  function renderChi2toF(c, t, w, h, m) {
    var d1 = 5, d2 = 10;
    if (t < 0.35) {
      var splitW = (w - m.left - m.right) / 2;
      var gap = 30;
      var pdf1 = function (x) { return DMPdf.chi2Pdf(x, d1); };
      var xMax1 = d1 * 3;
      var yMax1 = DMPdf.getYMax(pdf1, 0.01, xMax1);
      c.save(); c.beginPath();
      c.rect(m.left, m.top, splitW - gap / 2, h - m.top - m.bottom); c.clip();
      drawAnimCurve(c, pdf1, 0.01, xMax1, yMax1, splitW + m.left, h, m, COLORS.chi2, 2);
      c.restore();
      drawLabel(c, "\u03C7\u00B2(" + d1 + ")", m.left + splitW / 2, m.top - 5, COLORS.chi2);

      var pdf2 = function (x) { return DMPdf.chi2Pdf(x, d2); };
      var xMax2 = d2 * 3;
      var yMax2 = DMPdf.getYMax(pdf2, 0.01, xMax2);
      var rightOffset = m.left + splitW + gap / 2;
      c.save(); c.translate(rightOffset - m.left, 0);
      drawAnimCurve(c, pdf2, 0.01, xMax2, yMax2, splitW + m.left, h, m, COLORS.chi2, 2);
      c.restore();
      drawLabel(c, "\u03C7\u00B2(" + d2 + ")", rightOffset + splitW / 2, m.top - 5, COLORS.chi2);

      c.strokeStyle = "#ddd"; c.lineWidth = 1; c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(w / 2, m.top); c.lineTo(w / 2, h - m.bottom); c.stroke();
      c.setLineDash([]);
    } else if (t < 0.7) {
      var morphT = (t - 0.35) / 0.35;
      var fPdfBound = function (x) { return DMPdf.fPdf(x, d1, d2); };
      var yMax = DMPdf.getYMax(fPdfBound, 0.01, 6);
      drawAnimAxes(c, 0, 6, yMax, w, h, m);
      c.save(); c.globalAlpha = morphT;
      drawRegion(c, fPdfBound, 0.01, 6, yMax, w, h, m, "rgba(192,57,43,0.12)");
      drawAnimCurve(c, fPdfBound, 0.01, 6, yMax, w, h, m, COLORS.f, 2.5);
      c.restore();
      drawLabel(c, "\u03C7\u00B2\u2081/d\u2081 \u00F7 \u03C7\u00B2\u2082/d\u2082 \u2192 F", w / 2, m.top - 10, COLORS.text);
    } else {
      var fPdfFinal = function (x) { return DMPdf.fPdf(x, d1, d2); };
      var yMax = DMPdf.getYMax(fPdfFinal, 0.01, 6);
      drawAnimAxes(c, 0, 6, yMax, w, h, m);
      drawRegion(c, fPdfFinal, 0.01, 6, yMax, w, h, m, "rgba(192,57,43,0.12)");
      drawAnimCurve(c, fPdfFinal, 0.01, 6, yMax, w, h, m, COLORS.f, 2.5);
      drawLabel(c, "F(" + d1 + ", " + d2 + ")", w / 2, m.top - 10, COLORS.f);
    }
  }

  function renderTtoF(c, t, w, h, m) {
    var df = 10;
    if (t < 0.4) {
      var xMin = -5, xMax = 5;
      var tPdf = function (x) { return DMPdf.tPdf(x, df); };
      var yMax = DMPdf.getYMax(tPdf, xMin, xMax);
      drawAnimAxes(c, xMin, xMax, yMax, w, h, m);
      drawRegion(c, tPdf, xMin, xMax, yMax, w, h, m, "rgba(39,174,96,0.15)");
      drawAnimCurve(c, tPdf, xMin, xMax, yMax, w, h, m, COLORS.t, 2.5);
      drawLabel(c, "t(" + df + ")", w / 2, m.top - 10, COLORS.t);
    } else {
      var morphT = Math.min((t - 0.4) / 0.4, 1);
      var xMax = 6;
      var fPdf = function (x) { return DMPdf.fPdf(x, 1, df); };
      var yMax = DMPdf.getYMax(fPdf, 0.01, xMax);
      drawAnimAxes(c, 0, xMax, yMax, w, h, m);
      c.save(); c.globalAlpha = morphT;
      drawRegion(c, fPdf, 0.01, xMax, yMax, w, h, m, "rgba(192,57,43,0.12)");
      drawAnimCurve(c, fPdf, 0.01, xMax, yMax, w, h, m, COLORS.f, 2.5);
      c.restore();
      drawLabel(c, t >= 0.8 ? "F(1, " + df + ")" : "t\u00B2 \u2192 F(1,n)", w / 2, m.top - 10,
        t >= 0.8 ? COLORS.f : COLORS.text);
    }
  }

  function renderBernToBinom(c, t, w, h, m) {
    var p = 0.3;
    var n = Math.max(1, Math.round(1 + t * 19));
    var xMax = Math.max(n + 2, 5);
    var pmf = function (x) { return DMPdf.binomialPmf(Math.round(x), n, p); };
    var yMax = DMPdf.getYMaxDiscrete(pmf, 0, xMax);

    drawAnimAxes(c, 0, xMax, yMax, w, h, m);
    drawDiscreteBarsAnim(c, pmf, 0, xMax, yMax, w, h, m, COLORS.binom);
    drawLabel(c, "Bin(n=" + n + ", p=" + p + ")", w / 2, m.top - 10, COLORS.binom);
  }

  function renderBinomToPoisson(c, t, w, h, m) {
    var lambda = 5;
    // Morph: start with Bin(20, 0.25), end with Pois(5)
    var n = Math.round(20 + t * 180); // 20 to 200
    var p = lambda / n;
    var xMax = 20;
    var binPmf = function (x) { return DMPdf.binomialPmf(Math.round(x), n, p); };
    var poisPmf = function (x) { return DMPdf.poissonPmf(Math.round(x), lambda); };
    var blendPmf = function (x) {
      var xr = Math.round(x);
      return binPmf(xr) * (1 - t) + poisPmf(xr) * t;
    };
    var yMax = DMPdf.getYMaxDiscrete(blendPmf, 0, xMax);

    drawAnimAxes(c, 0, xMax, yMax, w, h, m);
    drawDiscreteBarsAnim(c, blendPmf, 0, xMax, yMax, w, h, m,
      lerpHex(COLORS.binom, COLORS.poisson, t));
    drawLabel(c, t < 0.8 ? "Bin(" + n + ", " + p.toFixed(3) + ")" : "Pois(\u03BB=" + lambda + ")",
      w / 2, m.top - 10, lerpHex(COLORS.binom, COLORS.poisson, t));
  }

  function renderBinomToNormal(c, t, w, h, m) {
    var p = 0.3;
    var n = Math.max(5, Math.round(5 + t * 95)); // 5 to 100
    var mu = n * p;
    var sigma = Math.sqrt(n * p * (1 - p));
    var xMin = Math.max(0, mu - 4 * sigma);
    var xMax = mu + 4 * sigma;
    var binPmf = function (x) { return DMPdf.binomialPmf(Math.round(x), n, p); };
    var normPdf = function (x) { return DMPdf.normalPdfGen(x, mu, sigma); };

    var yMax = DMPdf.getYMaxDiscrete(binPmf, xMin, xMax);
    var nyMax = DMPdf.getYMax(normPdf, xMin, xMax);
    if (nyMax > yMax) yMax = nyMax;

    drawAnimAxes(c, xMin, xMax, yMax, w, h, m);
    drawDiscreteBarsAnim(c, binPmf, Math.max(0, Math.floor(xMin)), Math.ceil(xMax), yMax, w, h, m, COLORS.binom);

    // Overlay normal curve with increasing opacity
    var alpha = Math.min(t * 1.5, 1);
    c.save(); c.globalAlpha = alpha;
    drawAnimCurve(c, normPdf, xMin, xMax, yMax, w, h, m, COLORS.normal, 2);
    c.restore();

    drawLabel(c, "Bin(" + n + "," + p + ") \u2248 N(" + mu.toFixed(1) + "," + sigma.toFixed(1) + ")",
      w / 2, m.top - 10, t > 0.7 ? COLORS.normal : COLORS.binom);
  }

  function renderGeomToExp(c, t, w, h, m) {
    // Morph from geometric bars to exponential curve
    var p = 0.3;
    var lambda = 1;
    var xMax = 15;
    var geomPmf = function (x) { return DMPdf.geometricPmf(Math.round(x), p); };
    var expPdf = function (x) { return DMPdf.exponentialPdf(x, lambda); };

    if (t < 0.5) {
      var yMax = DMPdf.getYMaxDiscrete(geomPmf, 0, xMax);
      drawAnimAxes(c, 0, xMax, yMax, w, h, m);
      drawDiscreteBarsAnim(c, geomPmf, 0, xMax, yMax, w, h, m, COLORS.geom);
      drawLabel(c, "Geom(p=" + p + ")", w / 2, m.top - 10, COLORS.geom);
    } else {
      var morphT = (t - 0.5) / 0.5;
      var xMax2 = 8;
      var yMax = DMPdf.getYMax(expPdf, 0, xMax2);
      drawAnimAxes(c, 0, xMax2, yMax, w, h, m);
      c.save(); c.globalAlpha = morphT;
      drawRegion(c, expPdf, 0, xMax2, yMax, w, h, m, "rgba(22,160,133,0.15)");
      drawAnimCurve(c, expPdf, 0.01, xMax2, yMax, w, h, m, COLORS.exp, 2.5);
      c.restore();
      drawLabel(c, morphT > 0.5 ? "Exp(\u03BB=" + lambda + ")" : "\u9023\u7D9A\u5316...",
        w / 2, m.top - 10, lerpHex(COLORS.geom, COLORS.exp, morphT));
    }
  }

  function renderExpToGamma(c, t, w, h, m) {
    var beta = 1;
    var alpha = Math.max(1, Math.round(1 + t * 9));
    var xMax = Math.max(alpha * 3, 10);
    var pdf = function (x) { return DMPdf.gammaPdf(x, alpha, beta); };
    var yMax = DMPdf.getYMax(pdf, 0.01, xMax);

    drawAnimAxes(c, 0, xMax, yMax, w, h, m);

    // Previous alpha values faintly
    for (var prevA = 1; prevA < alpha; prevA++) {
      var prevPdf = (function (a) {
        return function (x) { return DMPdf.gammaPdf(x, a, beta); };
      })(prevA);
      c.save(); c.globalAlpha = 0.15;
      drawAnimCurve(c, prevPdf, 0.01, xMax, yMax, w, h, m, COLORS.gamma, 1);
      c.restore();
    }

    drawRegion(c, pdf, 0.01, xMax, yMax, w, h, m, "rgba(26,188,156,0.15)");
    drawAnimCurve(c, pdf, 0.01, xMax, yMax, w, h, m, COLORS.gamma, 2.5);
    drawLabel(c, "\u0393(\u03B1=" + alpha + ", \u03B2=" + beta + ")", w / 2, m.top - 10, COLORS.gamma);
  }

  function renderGammaToChi2(c, t, w, h, m) {
    // Morph gamma(alpha, beta) to chi2(k) by setting alpha=k/2, beta=1/2
    var k = 5;
    var alpha = 3 + (k / 2 - 3) * t; // morph from 3 to 2.5
    var beta = 1 + (0.5 - 1) * t;     // morph from 1 to 0.5
    var xMax = Math.max(k * 3, 15);
    var pdf = function (x) { return DMPdf.gammaPdf(x, alpha, beta); };
    var yMax = DMPdf.getYMax(pdf, 0.01, xMax);

    drawAnimAxes(c, 0, xMax, yMax, w, h, m);
    drawRegion(c, pdf, 0.01, xMax, yMax, w, h, m,
      t > 0.5 ? COLORS.pos : "rgba(26,188,156,0.15)");
    drawAnimCurve(c, pdf, 0.01, xMax, yMax, w, h, m,
      lerpHex(COLORS.gamma, COLORS.chi2, t), 2.5);
    drawLabel(c, t > 0.7 ? "\u03C7\u00B2(" + k + ")" :
      "\u0393(" + alpha.toFixed(1) + ", " + beta.toFixed(1) + ")",
      w / 2, m.top - 10, lerpHex(COLORS.gamma, COLORS.chi2, t));
  }

  function renderNormToStd(c, t, w, h, m) {
    var mu = 3 * (1 - t);  // morph from 3 to 0
    var sigma = 2 - t;      // morph from 2 to 1
    var xMin = mu - 4 * sigma;
    var xMax = mu + 4 * sigma;
    var pdf = function (x) { return DMPdf.normalPdfGen(x, mu, sigma); };
    var yMax = DMPdf.getYMax(pdf, xMin, xMax);

    drawAnimAxes(c, xMin, xMax, yMax, w, h, m);
    drawRegion(c, pdf, xMin, xMax, yMax, w, h, m, "rgba(52,152,219,0.12)");
    drawAnimCurve(c, pdf, xMin, xMax, yMax, w, h, m,
      lerpHex(COLORS.normal, COLORS.z, t), 2.5);
    drawLabel(c, "N(" + mu.toFixed(1) + ", " + sigma.toFixed(1) + ")",
      w / 2, m.top - 10, lerpHex(COLORS.normal, COLORS.z, t));
  }

  function renderNormToLognorm(c, t, w, h, m) {
    var mu = 0, sigma = 0.5;
    if (t < 0.4) {
      var xMin = -4, xMax = 4;
      var yMax = DMPdf.getYMax(DMPdf.normalPdf, xMin, xMax);
      drawAnimAxes(c, xMin, xMax, yMax, w, h, m);
      drawRegion(c, DMPdf.normalPdf, xMin, xMax, yMax, w, h, m, "rgba(52,152,219,0.12)");
      drawAnimCurve(c, DMPdf.normalPdf, xMin, xMax, yMax, w, h, m, COLORS.normal, 2.5);
      drawLabel(c, "N(0,1)", w / 2, m.top - 10, COLORS.normal);
    } else {
      var morphT = (t - 0.4) / 0.6;
      var xMax = 5;
      var lnPdf = function (x) { return DMPdf.lognormalPdf(x, mu, sigma); };
      var yMax = DMPdf.getYMax(lnPdf, 0.01, xMax);
      drawAnimAxes(c, 0, xMax, yMax, w, h, m);
      c.save(); c.globalAlpha = morphT;
      drawRegion(c, lnPdf, 0.01, xMax, yMax, w, h, m, "rgba(142,68,173,0.12)");
      drawAnimCurve(c, lnPdf, 0.01, xMax, yMax, w, h, m, "#8e44ad", 2.5);
      c.restore();
      drawLabel(c, morphT > 0.5 ? "LogN(0, 0.5)" : "Y = e^X",
        w / 2, m.top - 10, morphT > 0.5 ? "#8e44ad" : COLORS.text);
    }
  }

  function renderTtoCauchy(c, t, w, h, m) {
    var xMin = -8, xMax = 8;
    var df = Math.max(1, Math.round(30 - t * 29)); // morph from 30 down to 1
    var pdf = function (x) { return DMPdf.tPdf(x, df); };
    var yMax = DMPdf.getYMax(pdf, xMin, xMax);

    drawAnimAxes(c, xMin, xMax, yMax, w, h, m);
    drawAnimCurve(c, pdf, xMin, xMax, yMax, w, h, m,
      lerpHex(COLORS.t, "#7f8c8d", t), 2.5);

    if (df === 1) {
      drawLabel(c, "Cauchy(0,1) = t(1)", w / 2, m.top - 10, "#7f8c8d");
    } else {
      drawLabel(c, "t(\u03BD=" + df + ")", w / 2, m.top - 10, COLORS.t);
    }
  }

  function renderGenericMorph(c, t, w, h, m) {
    // Generic: show a pulsing info message
    c.fillStyle = "#888";
    c.font = "14px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("\u3053\u306E\u95A2\u4FC2\u306E\u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u306F\u6E96\u5099\u4E2D\u3067\u3059", w / 2, h / 2 - 10);

    // Show a simple fade between two placeholder curves
    var xMin = -4, xMax = 4;
    var yMax = 0.5;
    drawAnimAxes(c, xMin, xMax, yMax, w, h, m);

    var pdf1 = DMPdf.normalPdf;
    c.save(); c.globalAlpha = 1 - t;
    drawAnimCurve(c, pdf1, xMin, xMax, yMax, w, h, m, COLORS.z, 2);
    c.restore();
    c.save(); c.globalAlpha = t;
    drawAnimCurve(c, pdf1, xMin, xMax, yMax, w, h, m, COLORS.chi2, 2);
    c.restore();
  }

  /* -------------------------------------------------------
   * Drawing helpers
   * ------------------------------------------------------- */

  function drawAnimAxes(c, xMin, xMax, yMax, w, h, m) {
    c.strokeStyle = COLORS.axis;
    c.lineWidth = 1;
    var y0 = DMCanvas.mapY(0, yMax, h, m);
    c.beginPath();
    c.moveTo(m.left, y0);
    c.lineTo(w - m.right, y0);
    c.stroke();
  }

  function drawAnimCurve(c, pdf, xMin, xMax, yMax, w, h, m, color, lineWidth) {
    c.beginPath();
    c.strokeStyle = color;
    c.lineWidth = lineWidth || 2;
    var steps = 300;
    var dx = (xMax - xMin) / steps;
    for (var i = 0; i <= steps; i++) {
      var x = xMin + i * dx;
      var y = pdf(x);
      if (!isFinite(y) || y < 0) y = 0;
      var px = DMCanvas.mapX(x, xMin, xMax, w, m);
      var py = DMCanvas.mapY(Math.min(y, yMax * 0.95), yMax, h, m);
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
  }

  function drawRegion(c, pdf, xMin, xMax, yMax, w, h, m, color) {
    c.beginPath();
    c.fillStyle = color;
    var steps = 200;
    var dx = (xMax - xMin) / steps;
    c.moveTo(DMCanvas.mapX(xMin, xMin, xMax, w, m), DMCanvas.mapY(0, yMax, h, m));
    for (var i = 0; i <= steps; i++) {
      var x = xMin + i * dx;
      var y = pdf(x);
      if (!isFinite(y) || y < 0) y = 0;
      c.lineTo(DMCanvas.mapX(x, xMin, xMax, w, m), DMCanvas.mapY(Math.min(y, yMax * 0.95), yMax, h, m));
    }
    c.lineTo(DMCanvas.mapX(xMax, xMin, xMax, w, m), DMCanvas.mapY(0, yMax, h, m));
    c.closePath();
    c.fill();
  }

  function drawDiscreteBarsAnim(c, pmf, xMin, xMax, yMax, w, h, m, color) {
    var lo = Math.max(0, Math.floor(xMin));
    var hi = Math.ceil(xMax);
    var pW = w - m.left - m.right;
    var count = hi - lo + 1;
    var barW = Math.max(2, Math.min(15, pW / count * 0.6));

    for (var x = lo; x <= hi; x++) {
      var val = pmf(x);
      if (!isFinite(val) || val <= 0) continue;

      var px = DMCanvas.mapX(x, xMin, xMax, w, m);
      var py = DMCanvas.mapY(Math.min(val, yMax * 0.95), yMax, h, m);
      var y0 = DMCanvas.mapY(0, yMax, h, m);
      var barH = y0 - py;

      c.fillStyle = color.indexOf("rgb") === 0 ? color : hexToRgba(color, 0.3);
      c.fillRect(px - barW / 2, py, barW, barH);
      c.strokeStyle = color;
      c.lineWidth = 1;
      c.strokeRect(px - barW / 2, py, barW, barH);
    }
  }

  function drawLabel(c, text, x, y, color) {
    c.fillStyle = color;
    c.font = "bold 12px sans-serif";
    c.textAlign = "center";
    c.fillText(text, x, y);
  }

  function drawPhaseIndicator(c, t, phases) {
    var count = phases.length;
    var dotR = 5;
    var gap = 20;
    var totalW = count * dotR * 2 + (count - 1) * gap;
    var startX = (cW - totalW) / 2;
    var y = cH - 15;

    for (var i = 0; i < count; i++) {
      var cx = startX + i * (dotR * 2 + gap) + dotR;
      var phaseT = i / count;
      var active = t >= phaseT;

      c.beginPath();
      c.arc(cx, y, dotR, 0, 2 * Math.PI);
      c.fillStyle = active ? "#8b6ccf" : "#ddd";
      c.fill();
    }
  }

  /* -------------------------------------------------------
   * Formula update
   * ------------------------------------------------------- */

  function updateFormula(katexStr) {
    var el = document.getElementById("dmAnimFormula");
    if (!el) return;
    if (typeof katex !== "undefined") {
      try {
        katex.render(katexStr, el, { displayMode: true, throwOnError: false });
      } catch (e) {
        el.textContent = katexStr;
      }
    } else {
      el.textContent = katexStr;
    }
  }

  /* -------------------------------------------------------
   * Canvas resize
   * ------------------------------------------------------- */

  function resizeCanvas() {
    if (!canvasEl) {
      canvasEl = document.getElementById(CANVAS_ID);
      if (!canvasEl) return;
      ctxRef = canvasEl.getContext("2d");
    }
    var parent = canvasEl.parentElement;
    cW = parent.clientWidth;
    cH = Math.min(400, cW * 0.5);
    if (cH < 250) cH = 250;
    canvasEl.style.width = cW + "px";
    canvasEl.style.height = cH + "px";
    canvasEl.width = cW * DPR;
    canvasEl.height = cH * DPR;
    ctxRef.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* -------------------------------------------------------
   * Utilities
   * ------------------------------------------------------- */

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function lerpHex(hex1, hex2, t) {
    var r1 = parseInt(hex1.slice(1, 3), 16);
    var g1 = parseInt(hex1.slice(3, 5), 16);
    var b1 = parseInt(hex1.slice(5, 7), 16);
    var r2 = parseInt(hex2.slice(1, 3), 16);
    var g2 = parseInt(hex2.slice(3, 5), 16);
    var b2 = parseInt(hex2.slice(5, 7), 16);
    var r = Math.round(r1 + (r2 - r1) * t);
    var g = Math.round(g1 + (g2 - g1) * t);
    var b = Math.round(b1 + (b2 - b1) * t);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function hexToRgba(hex, alpha) {
    if (hex.indexOf("rgb") === 0) return hex;
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function sampleYMax(pdf, xMin, xMax, steps) {
    var yMax = 0;
    var dx = (xMax - xMin) / steps;
    for (var i = 0; i <= steps; i++) {
      var y = pdf(xMin + i * dx);
      if (isFinite(y) && y > yMax) yMax = y;
    }
    return yMax;
  }

  /* -------------------------------------------------------
   * Public API
   * ------------------------------------------------------- */

  return {
    init: init,
    play: play,
    stop: stop,
    replay: replay,
    step: step,
    ANIMATIONS: ANIMATIONS
  };
})();
