/**
 * DMPdf — Probability density/mass functions for the Distribution Family Map.
 * Covers 20 distributions: 7 discrete (PMF) + 13 continuous (PDF).
 * Self-contained: does not depend on SimGraph or any other module.
 */
var DMPdf = (function () {
  "use strict";

  /* -------------------------------------------------------
   * Gamma log (Lanczos approximation)
   * ------------------------------------------------------- */

  function gammaLn(z) {
    var c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    var x = c[0];
    for (var i = 1; i < 9; i++) x += c[i] / (z + i - 1);
    var t = z + 6.5;
    return 0.5 * Math.log(2 * Math.PI) + (z - 0.5) * Math.log(t) - t + Math.log(x);
  }

  function logFactorial(n) { return gammaLn(n + 1); }

  function binomCoeff(n, k) {
    if (k < 0 || k > n) return 0;
    return Math.exp(logFactorial(n) - logFactorial(k) - logFactorial(n - k));
  }

  /* -------------------------------------------------------
   * Discrete distributions (PMFs)
   * ------------------------------------------------------- */

  function bernoulliPmf(x, p) {
    if (x === 0) return 1 - p;
    if (x === 1) return p;
    return 0;
  }

  function binomialPmf(x, n, p) {
    if (x < 0 || x > n || x !== Math.floor(x)) return 0;
    return binomCoeff(n, x) * Math.pow(p, x) * Math.pow(1 - p, n - x);
  }

  function poissonPmf(x, lambda) {
    if (x < 0 || x !== Math.floor(x)) return 0;
    return Math.exp(x * Math.log(lambda) - lambda - logFactorial(x));
  }

  function geometricPmf(x, p) {
    if (x < 0 || x !== Math.floor(x)) return 0;
    return p * Math.pow(1 - p, x);
  }

  function negBinomialPmf(x, r, p) {
    if (x < 0 || x !== Math.floor(x)) return 0;
    return binomCoeff(x + r - 1, x) * Math.pow(p, r) * Math.pow(1 - p, x);
  }

  function hypergeometricPmf(x, N, K, n) {
    var lo = Math.max(0, n - (N - K));
    var hi = Math.min(n, K);
    if (x < lo || x > hi || x !== Math.floor(x)) return 0;
    return binomCoeff(K, x) * binomCoeff(N - K, n - x) / binomCoeff(N, n);
  }

  function multinomialCoeff() { return 0; } // placeholder — multinomial is conceptual node

  /* -------------------------------------------------------
   * Continuous distributions (PDFs)
   * ------------------------------------------------------- */

  function normalPdf(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  function normalPdfGen(x, mu, sigma) {
    var z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
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

  function fPdf(x, d1, d2) {
    if (x <= 0) return 0;
    var h1 = d1 / 2, h2 = d2 / 2;
    return Math.exp(
      h1 * Math.log(d1) + h2 * Math.log(d2) +
      (h1 - 1) * Math.log(x) -
      (h1 + h2) * Math.log(d1 * x + d2) -
      gammaLn(h1) - gammaLn(h2) + gammaLn(h1 + h2)
    );
  }

  function exponentialPdf(x, lambda) {
    if (x < 0) return 0;
    return lambda * Math.exp(-lambda * x);
  }

  function gammaPdf(x, alpha, beta) {
    if (x <= 0) return 0;
    return Math.exp(
      (alpha - 1) * Math.log(x) - beta * x +
      alpha * Math.log(beta) - gammaLn(alpha)
    );
  }

  function betaPdf(x, a, b) {
    if (x <= 0 || x >= 1) return 0;
    return Math.exp(
      (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) -
      gammaLn(a) - gammaLn(b) + gammaLn(a + b)
    );
  }

  function uniformPdf(x, a, b) {
    if (x < a || x > b) return 0;
    return 1 / (b - a);
  }

  function weibullPdf(x, k, lambda) {
    if (x <= 0) return 0;
    return (k / lambda) * Math.pow(x / lambda, k - 1) *
      Math.exp(-Math.pow(x / lambda, k));
  }

  function cauchyPdf(x, x0, gamma) {
    return 1 / (Math.PI * gamma * (1 + Math.pow((x - x0) / gamma, 2)));
  }

  function lognormalPdf(x, mu, sigma) {
    if (x <= 0) return 0;
    var z = (Math.log(x) - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (x * sigma * Math.sqrt(2 * Math.PI));
  }

  /* -------------------------------------------------------
   * Distribution metadata: type, range, bound function
   * ------------------------------------------------------- */

  var DIST_META = {
    // Discrete
    hypergeometric: { type: "discrete", defaultParams: { N: 50, K: 20, n: 10 } },
    bernoulli:      { type: "discrete", defaultParams: { p: 0.3 } },
    binomial:       { type: "discrete", defaultParams: { n: 20, p: 0.3 } },
    multinomial:    { type: "discrete", defaultParams: {} },
    poisson:        { type: "discrete", defaultParams: { lambda: 5 } },
    geometric:      { type: "discrete", defaultParams: { p: 0.3 } },
    neg_binomial:   { type: "discrete", defaultParams: { r: 5, p: 0.4 } },
    // Continuous
    normal:         { type: "continuous", defaultParams: { mu: 0, sigma: 1 } },
    std_normal:     { type: "continuous", defaultParams: {} },
    lognormal:      { type: "continuous", defaultParams: { mu: 0, sigma: 0.5 } },
    mv_normal:      { type: "continuous", defaultParams: {} },
    exponential:    { type: "continuous", defaultParams: { lambda: 1 } },
    gamma:          { type: "continuous", defaultParams: { alpha: 3, beta: 1 } },
    chi2:           { type: "continuous", defaultParams: { df: 5 } },
    t:              { type: "continuous", defaultParams: { df: 5 } },
    f:              { type: "continuous", defaultParams: { df1: 5, df2: 10 } },
    beta:           { type: "continuous", defaultParams: { a: 2, b: 5 } },
    uniform:        { type: "continuous", defaultParams: { a: 0, b: 1 } },
    weibull:        { type: "continuous", defaultParams: { k: 1.5, lambda: 1 } },
    cauchy:         { type: "continuous", defaultParams: { x0: 0, gamma: 1 } }
  };

  function getRange(dist, params) {
    switch (dist) {
      case "hypergeometric": return { xMin: 0, xMax: Math.min(params.n || 10, params.K || 20), discrete: true };
      case "bernoulli":      return { xMin: 0, xMax: 1, discrete: true };
      case "binomial":       return { xMin: 0, xMax: params.n || 20, discrete: true };
      case "multinomial":    return { xMin: 0, xMax: 10, discrete: true };
      case "poisson":        return { xMin: 0, xMax: Math.max((params.lambda || 5) * 2.5, 12), discrete: true };
      case "geometric":      return { xMin: 0, xMax: Math.max(15, Math.ceil(5 / (params.p || 0.3))), discrete: true };
      case "neg_binomial":   return { xMin: 0, xMax: Math.max(20, (params.r || 5) * 4), discrete: true };
      case "normal":         return { xMin: (params.mu || 0) - 4 * (params.sigma || 1), xMax: (params.mu || 0) + 4 * (params.sigma || 1) };
      case "std_normal":     return { xMin: -4.5, xMax: 4.5 };
      case "lognormal":      return { xMin: 0, xMax: Math.max(5, Math.exp((params.mu || 0) + 3 * (params.sigma || 0.5))) };
      case "mv_normal":      return { xMin: -4, xMax: 4 };
      case "exponential":    return { xMin: 0, xMax: Math.max(5, 5 / (params.lambda || 1)) };
      case "gamma":          return { xMin: 0, xMax: Math.max(10, (params.alpha || 3) / (params.beta || 1) * 3) };
      case "chi2":           return { xMin: 0, xMax: Math.max((params.df || 5) * 2.5, 10) };
      case "t":              return { xMin: -5, xMax: 5 };
      case "f":              return { xMin: 0, xMax: Math.max(5, ((params.df1 || 5) / (params.df2 || 10)) * 4 + 3) };
      case "beta":           return { xMin: 0, xMax: 1 };
      case "uniform":        return { xMin: (params.a || 0) - 0.5, xMax: (params.b || 1) + 0.5 };
      case "weibull":        return { xMin: 0, xMax: Math.max(4, (params.lambda || 1) * 3) };
      case "cauchy":         return { xMin: (params.x0 || 0) - 8, xMax: (params.x0 || 0) + 8 };
      default:               return { xMin: -4.5, xMax: 4.5 };
    }
  }

  function getPdf(dist, params) {
    switch (dist) {
      case "hypergeometric": return function (x) { return hypergeometricPmf(Math.round(x), params.N, params.K, params.n); };
      case "bernoulli":      return function (x) { return bernoulliPmf(Math.round(x), params.p); };
      case "binomial":       return function (x) { return binomialPmf(Math.round(x), params.n, params.p); };
      case "multinomial":    return function (x) { return binomialPmf(Math.round(x), 10, 0.3); };
      case "poisson":        return function (x) { return poissonPmf(Math.round(x), params.lambda); };
      case "geometric":      return function (x) { return geometricPmf(Math.round(x), params.p); };
      case "neg_binomial":   return function (x) { return negBinomialPmf(Math.round(x), params.r, params.p); };
      case "normal":         return function (x) { return normalPdfGen(x, params.mu || 0, params.sigma || 1); };
      case "std_normal":     return normalPdf;
      case "lognormal":      return function (x) { return lognormalPdf(x, params.mu || 0, params.sigma || 0.5); };
      case "mv_normal":      return normalPdf;
      case "exponential":    return function (x) { return exponentialPdf(x, params.lambda || 1); };
      case "gamma":          return function (x) { return gammaPdf(x, params.alpha || 3, params.beta || 1); };
      case "chi2":           return function (x) { return chi2Pdf(x, params.df); };
      case "t":              return function (x) { return tPdf(x, params.df); };
      case "f":              return function (x) { return fPdf(x, params.df1, params.df2); };
      case "beta":           return function (x) { return betaPdf(x, params.a || 2, params.b || 5); };
      case "uniform":        return function (x) { return uniformPdf(x, params.a || 0, params.b || 1); };
      case "weibull":        return function (x) { return weibullPdf(x, params.k || 1.5, params.lambda || 1); };
      case "cauchy":         return function (x) { return cauchyPdf(x, params.x0 || 0, params.gamma || 1); };
      default:               return normalPdf;
    }
  }

  function isDiscrete(dist) {
    var m = DIST_META[dist];
    return m ? m.type === "discrete" : false;
  }

  function getDefaultParams(dist) {
    var m = DIST_META[dist];
    return m ? Object.assign({}, m.defaultParams) : {};
  }

  /* -------------------------------------------------------
   * Compute yMax by sampling
   * ------------------------------------------------------- */

  function getYMax(pdf, xMin, xMax) {
    var yMax = 0;
    var steps = 400;
    var dx = (xMax - xMin) / steps;
    for (var i = 0; i <= steps; i++) {
      var y = pdf(xMin + i * dx);
      if (isFinite(y) && y > yMax) yMax = y;
    }
    return yMax * 1.15;
  }

  function getYMaxDiscrete(pmfFn, xMin, xMax) {
    var yMax = 0;
    for (var x = Math.max(0, Math.floor(xMin)); x <= Math.ceil(xMax); x++) {
      var y = pmfFn(x);
      if (isFinite(y) && y > yMax) yMax = y;
    }
    return yMax * 1.15;
  }

  /* -------------------------------------------------------
   * Public API
   * ------------------------------------------------------- */

  return {
    gammaLn: gammaLn, binomCoeff: binomCoeff,
    // Discrete PMFs
    bernoulliPmf: bernoulliPmf, binomialPmf: binomialPmf,
    poissonPmf: poissonPmf, geometricPmf: geometricPmf,
    negBinomialPmf: negBinomialPmf, hypergeometricPmf: hypergeometricPmf,
    // Continuous PDFs
    normalPdf: normalPdf, normalPdfGen: normalPdfGen,
    tPdf: tPdf, chi2Pdf: chi2Pdf, fPdf: fPdf,
    exponentialPdf: exponentialPdf, gammaPdf: gammaPdf,
    betaPdf: betaPdf, uniformPdf: uniformPdf,
    weibullPdf: weibullPdf, cauchyPdf: cauchyPdf,
    lognormalPdf: lognormalPdf,
    // Utilities
    getRange: getRange, getPdf: getPdf, getYMax: getYMax,
    getYMaxDiscrete: getYMaxDiscrete,
    isDiscrete: isDiscrete, getDefaultParams: getDefaultParams,
    DIST_META: DIST_META
  };
})();
