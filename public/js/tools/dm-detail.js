/**
 * DMDetail — Full-size distribution detail panel.
 * Renders the expanded PDF/PMF graph, manages parameter sliders,
 * overlays reference distributions, and shows educational formulas.
 * Supports all 20 distributions (7 discrete + 13 continuous).
 */
var DMDetail = (function () {
  "use strict";

  var CANVAS_ID = "dmDetailCanvas";
  var DPR = window.devicePixelRatio || 1;
  var canvasEl = null;
  var ctxRef = null;
  var cW = 0;
  var cH = 350;
  var MARGIN = { top: 30, right: 30, bottom: 50, left: 50 };

  var currentDist = null;
  var currentParams = {};
  var redrawScheduled = false;

  /* -------------------------------------------------------
   * Distribution metadata — all 20 distributions
   * ------------------------------------------------------- */

  var DIST_INFO = {
    // === Discrete ===
    hypergeometric: {
      title: "超幾何分布 (Hypergeometric)",
      color: "#d35400",
      formulaTitle: "確率質量関数",
      katex: "P(X=k) = \\frac{\\binom{K}{k}\\binom{N-K}{n-k}}{\\binom{N}{n}}",
      notes: "母集団N個中K個の当たりから、n個を非復元抽出したときの当たりの数。",
      discrete: true,
      params: [
        { key: "N", label: "母集団 (N)", min: 2, max: 200, step: 1, def: 50 },
        { key: "K", label: "当たり数 (K)", min: 1, max: 100, step: 1, def: 20 },
        { key: "n", label: "抽出数 (n)", min: 1, max: 50, step: 1, def: 10 }
      ]
    },
    bernoulli: {
      title: "ベルヌーイ分布 (Bernoulli)",
      color: "#e67e22",
      formulaTitle: "確率質量関数",
      katex: "P(X=k) = p^k (1-p)^{1-k}, \\quad k \\in \\{0,1\\}",
      notes: "成功確率pの1回の試行。二項分布(n=1)の特殊ケース。",
      discrete: true,
      params: [
        { key: "p", label: "成功確率 (p)", min: 0.01, max: 0.99, step: 0.01, def: 0.3 }
      ]
    },
    binomial: {
      title: "二項分布 (Binomial)",
      color: "#f39c12",
      formulaTitle: "確率質量関数",
      katex: "P(X=k) = \\binom{n}{k} p^k (1-p)^{n-k}",
      notes: "成功確率pのベルヌーイ試行をn回独立に繰り返したときの成功回数。nが大きいとき正規分布で近似可能（CLT）。",
      discrete: true,
      params: [
        { key: "n", label: "試行回数 (n)", min: 1, max: 100, step: 1, def: 20 },
        { key: "p", label: "成功確率 (p)", min: 0.01, max: 0.99, step: 0.01, def: 0.3 }
      ]
    },
    multinomial: {
      title: "多項分布 (Multinomial)",
      color: "#e74c3c",
      formulaTitle: "確率質量関数",
      katex: "P(\\mathbf{X}) = \\frac{n!}{x_1! \\cdots x_k!} p_1^{x_1} \\cdots p_k^{x_k}",
      notes: "二項分布のk個のカテゴリへの拡張。サイコロなど多値結果の試行に対応。",
      discrete: true,
      params: []
    },
    poisson: {
      title: "ポアソン分布 (Poisson)",
      color: "#e74c3c",
      formulaTitle: "確率質量関数",
      katex: "P(X=k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}",
      notes: "単位時間・単位面積あたりの発生回数をモデル化。二項分布のn\u2192\u221E, p\u21920の極限。",
      discrete: true,
      params: [
        { key: "lambda", label: "\u03BB (発生率)", min: 0.1, max: 30, step: 0.1, def: 5 }
      ]
    },
    geometric: {
      title: "幾何分布 (Geometric)",
      color: "#d35400",
      formulaTitle: "確率質量関数",
      katex: "P(X=k) = (1-p)^k \\, p, \\quad k = 0, 1, 2, \\ldots",
      notes: "初めて成功するまでの失敗回数。指数分布の離散版。「記憶喪失性」を持つ唯一の離散分布。",
      discrete: true,
      params: [
        { key: "p", label: "成功確率 (p)", min: 0.01, max: 0.99, step: 0.01, def: 0.3 }
      ]
    },
    neg_binomial: {
      title: "負の二項分布 (Neg. Binomial)",
      color: "#c0392b",
      formulaTitle: "確率質量関数",
      katex: "P(X=k) = \\binom{k+r-1}{k} p^r (1-p)^k",
      notes: "r回成功するまでの失敗回数。r=1で幾何分布。ガンマ分布の離散版。",
      discrete: true,
      params: [
        { key: "r", label: "成功回数 (r)", min: 1, max: 30, step: 1, def: 5 },
        { key: "p", label: "成功確率 (p)", min: 0.01, max: 0.99, step: 0.01, def: 0.4 }
      ]
    },

    // === Continuous ===
    normal: {
      title: "正規分布 (Normal)",
      color: "#3498db",
      formulaTitle: "確率密度関数",
      katex: "f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}",
      notes: "自然界で最も広く現れる分布。中心極限定理により、独立な確率変数の和は正規分布に収束する。",
      discrete: false,
      params: [
        { key: "mu", label: "平均 (\u03BC)", min: -10, max: 10, step: 0.1, def: 0 },
        { key: "sigma", label: "標準偏差 (\u03C3)", min: 0.1, max: 5, step: 0.1, def: 1 }
      ]
    },
    std_normal: {
      title: "標準正規分布 (Std. Normal)",
      color: "#5b8def",
      formulaTitle: "確率密度関数",
      katex: "f(x) = \\frac{1}{\\sqrt{2\\pi}} e^{-x^2/2}",
      notes: "平均0、分散1の正規分布。\u03C7\u00B2分布、t分布、F分布の基礎となる。",
      discrete: false,
      params: []
    },
    lognormal: {
      title: "対数正規分布 (Lognormal)",
      color: "#8e44ad",
      formulaTitle: "確率密度関数",
      katex: "f(x) = \\frac{1}{x\\sigma\\sqrt{2\\pi}} e^{-\\frac{(\\ln x - \\mu)^2}{2\\sigma^2}}",
      notes: "X\u223CN(\u03BC,\u03C3\u00B2)のとき、e^Xが従う分布。所得分布や故障時間などに現れる。",
      discrete: false,
      params: [
        { key: "mu", label: "\u03BC", min: -2, max: 2, step: 0.1, def: 0 },
        { key: "sigma", label: "\u03C3", min: 0.1, max: 2, step: 0.05, def: 0.5 }
      ]
    },
    mv_normal: {
      title: "多変量正規分布 (MV Normal)",
      color: "#2980b9",
      formulaTitle: "確率密度関数",
      katex: "f(\\mathbf{x}) = \\frac{1}{(2\\pi)^{p/2}|\\Sigma|^{1/2}} e^{-\\frac{1}{2}(\\mathbf{x}-\\boldsymbol{\\mu})^T \\Sigma^{-1} (\\mathbf{x}-\\boldsymbol{\\mu})}",
      notes: "正規分布のp次元拡張。多変量解析の基礎。1次元断面は正規分布。",
      discrete: false,
      params: []
    },
    exponential: {
      title: "指数分布 (Exponential)",
      color: "#16a085",
      formulaTitle: "確率密度関数",
      katex: "f(x) = \\lambda e^{-\\lambda x}, \\quad x \\geq 0",
      notes: "次のイベントまでの待ち時間をモデル化。「記憶喪失性」を持つ唯一の連続分布。ガンマ分布(\u03B1=1)の特殊ケース。",
      discrete: false,
      params: [
        { key: "lambda", label: "\u03BB (率パラメータ)", min: 0.1, max: 5, step: 0.1, def: 1 }
      ]
    },
    gamma: {
      title: "ガンマ分布 (Gamma)",
      color: "#1abc9c",
      formulaTitle: "確率密度関数",
      katex: "f(x) = \\frac{\\beta^\\alpha}{\\Gamma(\\alpha)} x^{\\alpha-1} e^{-\\beta x}",
      notes: "\u03B1個の独立な指数分布変数の和。\u03B1=k/2, \u03B2=1/2で\u03C7\u00B2(k)分布、\u03B1=1で指数分布。",
      discrete: false,
      params: [
        { key: "alpha", label: "\u03B1 (形状)", min: 0.5, max: 20, step: 0.5, def: 3 },
        { key: "beta", label: "\u03B2 (率)", min: 0.1, max: 5, step: 0.1, def: 1 }
      ]
    },
    chi2: {
      title: "\u03C7\u00B2分布 (Chi-squared)",
      color: "#e67e22",
      formulaTitle: "確率密度関数",
      katex: "f(x) = \\frac{x^{k/2-1} e^{-x/2}}{2^{k/2} \\Gamma(k/2)}",
      notes: "自由度kの標準正規変数の二乗和。適合度検定や分散の検定で使用。ガンマ分布(\u03B1=k/2, \u03B2=1/2)の特殊ケース。",
      discrete: false,
      params: [
        { key: "df", label: "自由度 (k)", min: 1, max: 50, step: 1, def: 5 }
      ],
      hasSlider: true,
      sliderLabel: "自由度 (k)"
    },
    t: {
      title: "t分布 (Student's t)",
      color: "#27ae60",
      formulaTitle: "確率密度関数",
      katex: "f(x) = \\frac{\\Gamma((\\nu+1)/2)}{\\sqrt{\\nu\\pi}\\,\\Gamma(\\nu/2)} \\left(1 + \\frac{x^2}{\\nu}\\right)^{-(\\nu+1)/2}",
      notes: "正規分布に似た釣鐘型だが、裾が重い。自由度が大きくなると標準正規分布に収束する。\u03BD=1でコーシー分布。",
      discrete: false,
      params: [
        { key: "df", label: "自由度 (\u03BD)", min: 1, max: 100, step: 1, def: 5 }
      ],
      hasSlider: true,
      sliderLabel: "自由度 (\u03BD)",
      showRefNormal: true
    },
    f: {
      title: "F分布 (Fisher's F)",
      color: "#c0392b",
      formulaTitle: "確率密度関数",
      katex: "f(x) = \\frac{\\sqrt{\\frac{(d_1 x)^{d_1} d_2^{d_2}}{(d_1 x + d_2)^{d_1+d_2}}}}{x\\,B(d_1/2,\\, d_2/2)}",
      notes: "2つの独立な\u03C7\u00B2変数の比。分散の等質性の検定や分散分析で使用。t\u00B2=F(1,n)。",
      discrete: false,
      params: [
        { key: "df1", label: "d\u2081 (分子自由度)", min: 1, max: 100, step: 1, def: 5 },
        { key: "df2", label: "d\u2082 (分母自由度)", min: 1, max: 100, step: 1, def: 10 }
      ]
    },
    beta: {
      title: "ベータ分布 (Beta)",
      color: "#9b59b6",
      formulaTitle: "確率密度関数",
      katex: "f(x) = \\frac{x^{a-1}(1-x)^{b-1}}{B(a,b)}, \\quad 0 < x < 1",
      notes: "[0,1]区間上の分布。a=b=1で一様分布。ガンマ分布変数の比から導かれる。ベイズ推定の事前分布として重要。",
      discrete: false,
      params: [
        { key: "a", label: "a (形状1)", min: 0.1, max: 20, step: 0.1, def: 2 },
        { key: "b", label: "b (形状2)", min: 0.1, max: 20, step: 0.1, def: 5 }
      ]
    },
    uniform: {
      title: "一様分布 (Uniform)",
      color: "#34495e",
      formulaTitle: "確率密度関数",
      katex: "f(x) = \\frac{1}{b-a}, \\quad a \\leq x \\leq b",
      notes: "区間[a,b]上で一定の密度を持つ。乱数生成の基礎。-ln(U)で指数分布を生成可能。",
      discrete: false,
      params: [
        { key: "a", label: "下限 (a)", min: -10, max: 9, step: 0.5, def: 0 },
        { key: "b", label: "上限 (b)", min: -9, max: 10, step: 0.5, def: 1 }
      ]
    },
    weibull: {
      title: "ワイブル分布 (Weibull)",
      color: "#2c3e50",
      formulaTitle: "確率密度関数",
      katex: "f(x) = \\frac{k}{\\lambda}\\left(\\frac{x}{\\lambda}\\right)^{k-1} e^{-(x/\\lambda)^k}",
      notes: "信頼性工学で寿命分析に使用。k=1で指数分布。k>1で故障率増加、k<1で故障率減少。",
      discrete: false,
      params: [
        { key: "k", label: "k (形状)", min: 0.5, max: 5, step: 0.1, def: 1.5 },
        { key: "lambda", label: "\u03BB (尺度)", min: 0.1, max: 5, step: 0.1, def: 1 }
      ]
    },
    cauchy: {
      title: "コーシー分布 (Cauchy)",
      color: "#7f8c8d",
      formulaTitle: "確率密度関数",
      katex: "f(x) = \\frac{1}{\\pi\\gamma\\left[1 + \\left(\\frac{x-x_0}{\\gamma}\\right)^2\\right]}",
      notes: "非常に裾が重い分布。平均・分散が存在しない。t分布の\u03BD=1の特殊ケース。",
      discrete: false,
      params: [
        { key: "x0", label: "x\u2080 (位置)", min: -5, max: 5, step: 0.1, def: 0 },
        { key: "gamma", label: "\u03B3 (尺度)", min: 0.1, max: 5, step: 0.1, def: 1 }
      ]
    }
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
   * Show a distribution
   * ------------------------------------------------------- */

  function show(dist, params) {
    currentDist = dist;
    var info = DIST_INFO[dist];
    if (!info) return;

    // Merge provided params with defaults
    currentParams = {};
    for (var i = 0; i < info.params.length; i++) {
      var p = info.params[i];
      currentParams[p.key] = (params && params[p.key] !== undefined) ? params[p.key] : p.def;
    }

    // Update title
    var titleEl = document.getElementById("dmDetailTitle");
    if (titleEl) titleEl.textContent = info.title;

    // Show/hide main slider area (for t/chi2 backward compat)
    var sliderArea = document.getElementById("dmSliderArea");
    if (sliderArea) {
      if (info.hasSlider) {
        sliderArea.style.display = "block";
        var labelEl = sliderArea.querySelector(".dm-slider-label span:first-child");
        if (labelEl) labelEl.textContent = (info.sliderLabel || "自由度 (n)") + ":";
        var slider = document.getElementById("dmSliderN");
        if (slider) {
          slider.value = currentParams.df || 5;
          document.getElementById("dmSliderValue").textContent = slider.value;
        }
        updateApproxNotice(currentParams.df || 5);
      } else {
        sliderArea.style.display = "none";
      }
    }

    // Build param controls
    updateParamControls(dist, currentParams);

    // Render formula with KaTeX
    renderFormula(info);

    // Educational notes
    var notesEl = document.getElementById("dmEduNotes");
    if (notesEl) notesEl.textContent = info.notes;

    // Draw the graph
    draw();
  }

  /* -------------------------------------------------------
   * Update from main slider (t/chi2)
   * ------------------------------------------------------- */

  function updateDf(df) {
    if (!currentDist) return;
    if (currentDist === "t" || currentDist === "chi2") {
      currentParams.df = df;
    }
    updateApproxNotice(df);
    scheduleRedraw();
  }

  function updateApproxNotice(df) {
    var notice = document.getElementById("dmApproxNotice");
    if (notice) {
      notice.style.display = (currentDist === "t" && df > 30) ? "block" : "none";
    }
  }

  /* -------------------------------------------------------
   * Parameter controls — generic for all distributions
   * ------------------------------------------------------- */

  function updateParamControls(dist, params) {
    var container = document.getElementById("dmParamControls");
    if (!container) return;

    var info = DIST_INFO[dist];
    if (!info || info.params.length === 0) {
      container.innerHTML = "";
      return;
    }

    // Skip params that are handled by the main slider
    var paramsToShow = info.params.filter(function (p) {
      return !(info.hasSlider && p.key === "df");
    });

    if (paramsToShow.length === 0) {
      container.innerHTML = "";
      return;
    }

    var html = "";
    for (var i = 0; i < paramsToShow.length; i++) {
      var p = paramsToShow[i];
      var val = params[p.key] !== undefined ? params[p.key] : p.def;
      html += '<div class="dm-param-group">' +
        '<span class="dm-param-label">' + escHtml(p.label) + ':</span>' +
        '<input type="number" class="dm-param-input" data-param="' + p.key + '"' +
        ' value="' + val + '" min="' + p.min + '" max="' + p.max + '" step="' + p.step + '">' +
        '</div>';
    }
    container.innerHTML = html;

    // Bind events
    var inputs = container.querySelectorAll(".dm-param-input");
    for (var j = 0; j < inputs.length; j++) {
      inputs[j].addEventListener("input", handleParamChange);
    }
  }

  function handleParamChange(e) {
    var key = e.target.getAttribute("data-param");
    var val = parseFloat(e.target.value);
    if (!isNaN(val) && key) {
      currentParams[key] = val;
      scheduleRedraw();
    }
  }

  /* -------------------------------------------------------
   * Draw
   * ------------------------------------------------------- */

  function draw() {
    if (!canvasEl || !ctxRef) return;
    var c = ctxRef;

    // Resize
    var parent = canvasEl.parentElement;
    cW = parent.clientWidth;
    canvasEl.style.width = cW + "px";
    canvasEl.style.height = cH + "px";
    canvasEl.width = cW * DPR;
    canvasEl.height = cH * DPR;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, cW, cH);

    if (!currentDist) return;

    var info = DIST_INFO[currentDist];
    if (!info) return;

    var pdf = DMPdf.getPdf(currentDist, currentParams);
    var range = DMPdf.getRange(currentDist, currentParams);
    var xMin = range.xMin;
    var xMax = range.xMax;
    var isDisc = info.discrete;

    // Compute yMax
    var yMax;
    if (isDisc) {
      yMax = DMPdf.getYMaxDiscrete(pdf, xMin, xMax);
    } else {
      yMax = DMPdf.getYMax(pdf, xMin, xMax);
    }

    // Also consider reference normal for t distribution
    if (currentDist === "t" && info.showRefNormal) {
      var normalYMax = DMPdf.getYMax(DMPdf.normalPdf, xMin, xMax);
      if (normalYMax > yMax) yMax = normalYMax;
    }

    // Background grid
    drawGrid(c, xMin, xMax, yMax);

    // For t-distribution: draw reference normal first
    if (currentDist === "t" && info.showRefNormal) {
      c.save();
      c.setLineDash([6, 4]);
      DMCanvas.drawCurve(c, DMPdf.normalPdf, xMin, xMax, yMax, cW, cH, MARGIN, "#aaa", 1.5);
      c.setLineDash([]);
      c.restore();

      c.fillStyle = "#aaa";
      c.font = "11px sans-serif";
      c.textAlign = "left";
      var refLabelX = DMCanvas.mapX(2.5, xMin, xMax, cW, MARGIN);
      var refLabelY = DMCanvas.mapY(DMPdf.normalPdf(2.5), yMax, cH, MARGIN) - 8;
      c.fillText("N(0,1)", refLabelX, refLabelY);
    }

    if (isDisc) {
      // Draw bars for discrete distributions
      drawDiscreteBars(c, pdf, xMin, xMax, yMax, info.color);
    } else {
      // Filled area
      var fillColor = hexToRgba(info.color, 0.12);
      drawFilledArea(c, pdf, xMin, xMax, yMax, fillColor);
      // Main curve
      DMCanvas.drawCurve(c, pdf, xMin, xMax, yMax, cW, cH, MARGIN, info.color, 2.5);
    }

    // Axes
    DMCanvas.drawAxes(c, xMin, xMax, yMax, cW, cH, MARGIN);

    // Distribution label
    c.fillStyle = info.color;
    c.font = "bold 13px sans-serif";
    c.textAlign = "right";
    c.fillText(getDistLabel(), cW - MARGIN.right - 5, MARGIN.top + 15);
  }

  function getDistLabel() {
    var d = currentDist;
    var p = currentParams;
    switch (d) {
      case "hypergeometric": return "Hyper(" + (p.N||50) + "," + (p.K||20) + "," + (p.n||10) + ")";
      case "bernoulli":      return "Bern(" + (p.p||0.3) + ")";
      case "binomial":       return "Bin(" + (p.n||20) + "," + (p.p||0.3) + ")";
      case "multinomial":    return "Multi";
      case "poisson":        return "Pois(" + (p.lambda||5) + ")";
      case "geometric":      return "Geom(" + (p.p||0.3) + ")";
      case "neg_binomial":   return "NB(" + (p.r||5) + "," + (p.p||0.4) + ")";
      case "normal":         return "N(" + (p.mu||0) + "," + (p.sigma||1) + ")";
      case "std_normal":     return "N(0,1)";
      case "lognormal":      return "LogN(" + (p.mu||0) + "," + (p.sigma||0.5) + ")";
      case "mv_normal":      return "MVN";
      case "exponential":    return "Exp(" + (p.lambda||1) + ")";
      case "gamma":          return "\u0393(" + (p.alpha||3) + "," + (p.beta||1) + ")";
      case "chi2":           return "\u03C7\u00B2(" + (p.df||5) + ")";
      case "t":              return "t(" + (p.df||5) + ")";
      case "f":              return "F(" + (p.df1||5) + "," + (p.df2||10) + ")";
      case "beta":           return "Beta(" + (p.a||2) + "," + (p.b||5) + ")";
      case "uniform":        return "U(" + (p.a||0) + "," + (p.b||1) + ")";
      case "weibull":        return "Weibull(" + (p.k||1.5) + "," + (p.lambda||1) + ")";
      case "cauchy":         return "Cauchy(" + (p.x0||0) + "," + (p.gamma||1) + ")";
      default:               return d;
    }
  }

  function drawGrid(c, xMin, xMax, yMax) {
    c.strokeStyle = "#f0f0f0";
    c.lineWidth = 1;
    var pW = cW - MARGIN.left - MARGIN.right;

    var ySteps = 5;
    for (var i = 1; i < ySteps; i++) {
      var yVal = (yMax / ySteps) * i;
      var py = DMCanvas.mapY(yVal, yMax, cH, MARGIN);
      c.beginPath();
      c.moveTo(MARGIN.left, py);
      c.lineTo(MARGIN.left + pW, py);
      c.stroke();
    }
  }

  function drawFilledArea(c, pdf, xMin, xMax, yMax, color) {
    c.beginPath();
    c.fillStyle = color;
    var steps = 300;
    var dx = (xMax - xMin) / steps;
    c.moveTo(DMCanvas.mapX(xMin, xMin, xMax, cW, MARGIN), DMCanvas.mapY(0, yMax, cH, MARGIN));
    for (var i = 0; i <= steps; i++) {
      var x = xMin + i * dx;
      var y = pdf(x);
      if (!isFinite(y)) y = 0;
      c.lineTo(DMCanvas.mapX(x, xMin, xMax, cW, MARGIN), DMCanvas.mapY(y, yMax, cH, MARGIN));
    }
    c.lineTo(DMCanvas.mapX(xMax, xMin, xMax, cW, MARGIN), DMCanvas.mapY(0, yMax, cH, MARGIN));
    c.closePath();
    c.fill();
  }

  function drawDiscreteBars(c, pmf, xMin, xMax, yMax, color) {
    var lo = Math.max(0, Math.floor(xMin));
    var hi = Math.ceil(xMax);
    var pW = cW - MARGIN.left - MARGIN.right;
    var count = hi - lo + 1;
    var barW = Math.max(2, Math.min(20, pW / count * 0.65));

    for (var x = lo; x <= hi; x++) {
      var val = pmf(x);
      if (!isFinite(val) || val <= 0) continue;

      var px = DMCanvas.mapX(x, xMin, xMax, cW, MARGIN);
      var py = DMCanvas.mapY(val, yMax, cH, MARGIN);
      var y0 = DMCanvas.mapY(0, yMax, cH, MARGIN);
      var barH = y0 - py;

      // Filled bar
      c.fillStyle = hexToRgba(color, 0.25);
      c.fillRect(px - barW / 2, py, barW, barH);

      // Outline
      c.strokeStyle = color;
      c.lineWidth = 1.5;
      c.strokeRect(px - barW / 2, py, barW, barH);

      // Value dot on top
      c.beginPath();
      c.arc(px, py, 3, 0, 2 * Math.PI);
      c.fillStyle = color;
      c.fill();
    }
  }

  /* -------------------------------------------------------
   * Formula rendering (KaTeX)
   * ------------------------------------------------------- */

  function renderFormula(info) {
    var titleEl = document.getElementById("dmFormulaTitle");
    var bodyEl = document.getElementById("dmFormulaBody");
    if (!titleEl || !bodyEl) return;

    titleEl.textContent = info.formulaTitle || "";

    if (typeof katex !== "undefined") {
      try {
        katex.render(info.katex, bodyEl, { displayMode: true, throwOnError: false });
      } catch (e) {
        bodyEl.textContent = info.katex;
      }
    } else {
      bodyEl.textContent = info.katex;
    }
  }

  /* -------------------------------------------------------
   * Scheduling
   * ------------------------------------------------------- */

  function scheduleRedraw() {
    if (redrawScheduled) return;
    redrawScheduled = true;
    requestAnimationFrame(function () {
      redrawScheduled = false;
      draw();
    });
  }

  /* -------------------------------------------------------
   * Hide
   * ------------------------------------------------------- */

  function hide() {
    currentDist = null;
  }

  /* -------------------------------------------------------
   * Utility
   * ------------------------------------------------------- */

  function hexToRgba(hex, alpha) {
    if (hex.indexOf("rgb") === 0) return hex; // already rgb
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function escHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* -------------------------------------------------------
   * Public API
   * ------------------------------------------------------- */

  return {
    init: init,
    show: show,
    draw: draw,
    hide: hide,
    updateDf: updateDf,
    scheduleRedraw: scheduleRedraw,
    getCurrentDist: function () { return currentDist; },
    getCurrentParams: function () { return Object.assign({}, currentParams); },
    DIST_INFO: DIST_INFO
  };
})();
