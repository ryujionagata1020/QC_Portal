/**
 * Statistical distribution functions (PDF, CDF)
 * Pure math — no side effects, no I/O.
 */

"use strict";

const SQRT2PI = Math.sqrt(2 * Math.PI);
const LN_SQRT2PI = 0.5 * Math.log(2 * Math.PI);

/* -------------------------------------------------------
 * Gamma / Beta helpers
 * ------------------------------------------------------- */

/**
 * Log-gamma via Lanczos approximation (g=7, n=9).
 */
function gammaLn(z) {
  if (z <= 0) return Infinity;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  let x = c[0];
  for (let i = 1; i < 9; i++) {
    x += c[i] / (z + i - 1);
  }
  const t = z + 6.5; // g + 0.5
  return LN_SQRT2PI + (z - 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Regularized incomplete beta function I_x(a, b)
 * using the continued-fraction expansion (Lentz method).
 */
function betaIncomplete(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use symmetry transform when x > (a+1)/(a+b+2)
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - betaIncomplete(1 - x, b, a);
  }

  const lnBeta = gammaLn(a) + gammaLn(b) - gammaLn(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta) / a;

  // Lentz continued fraction
  const maxIter = 200;
  const eps = 1e-14;
  let f = 1, c = 1, d = 0;

  for (let m = 0; m <= maxIter; m++) {
    let numerator;
    if (m === 0) {
      numerator = 1; // a_0
    } else {
      const k = m;
      const m2 = Math.floor((k + 1) / 2);
      if (k % 2 === 1) {
        // odd term
        const i = m2 - 1;
        numerator = -(a + i) * (a + b + i) * x / ((a + 2 * i) * (a + 2 * i + 1));
      } else {
        // even term
        const i = m2;
        numerator = i * (b - i) * x / ((a + 2 * i - 1) * (a + 2 * i));
      }
    }

    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;

    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;

    f *= c * d;
    if (Math.abs(c * d - 1) < eps) break;
  }

  return front * (f - 1);
}

/**
 * Regularized incomplete gamma function P(a, x)
 * (lower incomplete gamma / gamma(a)).
 */
function gammaPLower(a, x) {
  if (x <= 0) return 0;
  if (x >= a + 1) return 1 - gammaQUpper(a, x);

  // Series expansion
  let sum = 1 / a;
  let term = 1 / a;
  for (let n = 1; n < 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - gammaLn(a));
}

/**
 * Upper regularized incomplete gamma function Q(a, x) = 1 - P(a, x)
 * using continued fraction.
 */
function gammaQUpper(a, x) {
  if (x <= 0) return 1;
  if (x < a + 1) return 1 - gammaPLower(a, x);

  // Continued fraction (Lentz)
  let f = x - a + 1;
  if (Math.abs(f) < 1e-30) f = 1e-30;
  let c = f, d = 0;

  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a);
    const bn = x - a + 1 + 2 * i;
    d = bn + an * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    c = bn + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    const delta = c * d;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }

  return Math.exp(-x + a * Math.log(x) - gammaLn(a)) / f;
}

/* -------------------------------------------------------
 * Normal distribution
 * ------------------------------------------------------- */

function normalPdf(x) {
  return Math.exp(-0.5 * x * x) / SQRT2PI;
}

/**
 * Standard normal CDF (Abramowitz & Stegun 26.2.17, |error| < 7.5e-8).
 */
function normalCdf(x) {
  if (x >= 8) return 1;
  if (x <= -8) return 0;

  const neg = x < 0;
  const z = neg ? -x : x;

  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1 / (1 + p * z);
  const poly = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
  const pdf = normalPdf(z);
  const cdf = 1 - pdf * poly;

  return neg ? 1 - cdf : cdf;
}

/**
 * Inverse normal CDF (quantile) — rational approximation (Beasley-Springer-Moro).
 */
function normalInv(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239e0
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838e0, -2.549732539343734e0,
    4.374664141464968e0, 2.938163982698783e0
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996e0, 3.754408661907416e0
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

/* -------------------------------------------------------
 * Student's t distribution
 * ------------------------------------------------------- */

function tPdf(x, df) {
  const halfDfPlus = (df + 1) / 2;
  const halfDf = df / 2;
  return Math.exp(gammaLn(halfDfPlus) - gammaLn(halfDf) - 0.5 * Math.log(df * Math.PI))
       * Math.pow(1 + x * x / df, -halfDfPlus);
}

function tCdf(x, df) {
  if (df <= 0) return NaN;
  if (!isFinite(x)) return x > 0 ? 1 : 0;
  const t2 = x * x;
  const ib = betaIncomplete(df / (df + t2), df / 2, 0.5);
  return x >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

/* -------------------------------------------------------
 * Chi-squared distribution
 * ------------------------------------------------------- */

function chi2Pdf(x, df) {
  if (x <= 0) return 0;
  const k2 = df / 2;
  return Math.exp((k2 - 1) * Math.log(x) - x / 2 - k2 * Math.LN2 - gammaLn(k2));
}

function chi2Cdf(x, df) {
  if (x <= 0) return 0;
  return gammaPLower(df / 2, x / 2);
}

/* -------------------------------------------------------
 * F distribution
 * ------------------------------------------------------- */

function fPdf(x, df1, df2) {
  if (x <= 0) return 0;
  const half1 = df1 / 2;
  const half2 = df2 / 2;
  return Math.exp(
    half1 * Math.log(df1) + half2 * Math.log(df2)
    + (half1 - 1) * Math.log(x)
    - (half1 + half2) * Math.log(df1 * x + df2)
    - gammaLn(half1) - gammaLn(half2) + gammaLn(half1 + half2)
  );
}

function fCdf(x, df1, df2) {
  if (x <= 0) return 0;
  return betaIncomplete(df1 * x / (df1 * x + df2), df1 / 2, df2 / 2);
}

/* -------------------------------------------------------
 * Binomial distribution
 * ------------------------------------------------------- */

function binomialPmf(k, n, p) {
  if (k < 0 || k > n) return 0;
  const lnCoeff = gammaLn(n + 1) - gammaLn(k + 1) - gammaLn(n - k + 1);
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  return Math.exp(lnCoeff + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

function binomialCdf(k, n, p) {
  if (k < 0) return 0;
  if (k >= n) return 1;
  // Use regularized incomplete beta
  return 1 - betaIncomplete(p, k + 1, n - k);
}

/* -------------------------------------------------------
 * Poisson distribution
 * ------------------------------------------------------- */

function poissonPmf(k, lambda) {
  if (k < 0 || lambda <= 0) return 0;
  return Math.exp(k * Math.log(lambda) - lambda - gammaLn(k + 1));
}

function poissonCdf(k, lambda) {
  if (k < 0) return 0;
  if (lambda <= 0) return 1;
  return gammaQUpper(k + 1, lambda);
}

/* -------------------------------------------------------
 * Exports
 * ------------------------------------------------------- */

module.exports = {
  // helpers
  gammaLn,
  betaIncomplete,
  gammaPLower,
  gammaQUpper,
  // normal
  normalPdf,
  normalCdf,
  normalInv,
  // t
  tPdf,
  tCdf,
  // chi2
  chi2Pdf,
  chi2Cdf,
  // F
  fPdf,
  fCdf,
  // binomial
  binomialPmf,
  binomialCdf,
  // poisson
  poissonPmf,
  poissonCdf
};
