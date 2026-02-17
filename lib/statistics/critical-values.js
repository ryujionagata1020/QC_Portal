/**
 * Critical value lookup: JSON table first, interpolation / computation fallback.
 */

"use strict";

const path = require("path");
const dist = require("./distributions");

const dataDir = path.join(__dirname, "..", "..", "data");

const zTable  = require(path.join(dataDir, "critical_values_z.json")).values;
const tTable  = require(path.join(dataDir, "critical_values_t.json")).values;
const chi2Table = require(path.join(dataDir, "critical_values_chi2.json")).values;
const fTable  = require(path.join(dataDir, "critical_values_f.json")).values;

// Sorted df keys for interpolation
const tDfKeys   = Object.keys(tTable).filter(k => k !== "inf").map(Number).sort((a, b) => a - b);
const chi2DfKeys = Object.keys(chi2Table).map(Number).sort((a, b) => a - b);

/**
 * Return the alpha key to look up in the one-tail table.
 * For two-tail test at alpha, we look up alpha/2.
 * For one-tail, we look up alpha directly.
 */
function alphaKey(alpha, tail) {
  if (tail === "two") {
    return String(alpha / 2);
  }
  return String(alpha);
}

/**
 * Linear interpolation between two values.
 */
function lerp(x, x0, x1, y0, y1) {
  if (x1 === x0) return y0;
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}

/**
 * Find bracketing keys for interpolation.
 */
function bracket(sortedKeys, value) {
  let lo = sortedKeys[0];
  let hi = sortedKeys[sortedKeys.length - 1];
  for (let i = 0; i < sortedKeys.length - 1; i++) {
    if (sortedKeys[i] <= value && sortedKeys[i + 1] >= value) {
      lo = sortedKeys[i];
      hi = sortedKeys[i + 1];
      break;
    }
  }
  return { lo, hi };
}

/* -------------------------------------------------------
 * z critical values
 * ------------------------------------------------------- */

function getZCritical(alpha, tail) {
  const aKey = alphaKey(alpha, tail);
  if (zTable[aKey] !== undefined) {
    const cv = zTable[aKey];
    if (tail === "two") return { left: -cv, right: cv, source: "table" };
    if (tail === "right") return { left: null, right: cv, source: "table" };
    return { left: -cv, right: null, source: "table" };
  }
  // Compute via inverse normal
  const aVal = tail === "two" ? alpha / 2 : alpha;
  const cv = -dist.normalInv(aVal);
  if (tail === "two") return { left: -cv, right: cv, source: "computed" };
  if (tail === "right") return { left: null, right: cv, source: "computed" };
  return { left: -cv, right: null, source: "computed" };
}

/* -------------------------------------------------------
 * t critical values
 * ------------------------------------------------------- */

function lookupTValue(df, aKey) {
  const sdf = String(df);
  if (tTable[sdf] && tTable[sdf][aKey] !== undefined) {
    return { value: tTable[sdf][aKey], source: "table" };
  }
  return null;
}

function getTCritical(alpha, tail, df) {
  df = Math.round(df);
  const aKey = alphaKey(alpha, tail);

  // Exact lookup
  const exact = lookupTValue(df, aKey);
  if (exact) {
    return formatSymmetric(exact.value, tail, exact.source);
  }

  // Use z for very large df
  if (df > 120) {
    return getZCritical(alpha, tail);
  }

  // Interpolate
  const { lo, hi } = bracket(tDfKeys, df);
  const loEntry = tTable[String(lo)];
  const hiEntry = tTable[String(hi)];
  if (loEntry && hiEntry && loEntry[aKey] !== undefined && hiEntry[aKey] !== undefined) {
    const cv = lerp(df, lo, hi, loEntry[aKey], hiEntry[aKey]);
    return formatSymmetric(cv, tail, "interpolated");
  }

  // Final fallback: compute via inverse t (Newton refinement from z)
  const aVal = tail === "two" ? alpha / 2 : alpha;
  let cv = -dist.normalInv(aVal); // start from z
  // Newton iterations for t
  for (let i = 0; i < 20; i++) {
    const p = 1 - dist.tCdf(cv, df);
    const deriv = dist.tPdf(cv, df);
    if (Math.abs(deriv) < 1e-15) break;
    const delta = (p - aVal) / deriv;
    cv += delta;
    if (Math.abs(delta) < 1e-10) break;
  }
  return formatSymmetric(Math.abs(cv), tail, "computed");
}

/* -------------------------------------------------------
 * Chi-squared critical values
 * ------------------------------------------------------- */

function getChi2Critical(alpha, df) {
  df = Math.round(df);
  const aKey = String(alpha);

  const sdf = String(df);
  if (chi2Table[sdf] && chi2Table[sdf][aKey] !== undefined) {
    return { left: null, right: chi2Table[sdf][aKey], source: "table" };
  }

  // Interpolate
  if (df <= chi2DfKeys[chi2DfKeys.length - 1]) {
    const { lo, hi } = bracket(chi2DfKeys, df);
    const loEntry = chi2Table[String(lo)];
    const hiEntry = chi2Table[String(hi)];
    if (loEntry && hiEntry && loEntry[aKey] !== undefined && hiEntry[aKey] !== undefined) {
      const cv = lerp(df, lo, hi, loEntry[aKey], hiEntry[aKey]);
      return { left: null, right: cv, source: "interpolated" };
    }
  }

  // Wilson-Hilferty approximation for large df
  const z = -dist.normalInv(alpha);
  const cv = df * Math.pow(1 - 2 / (9 * df) + z * Math.sqrt(2 / (9 * df)), 3);
  return { left: null, right: cv, source: "computed" };
}

/* -------------------------------------------------------
 * F critical values
 * ------------------------------------------------------- */

function getFCritical(alpha, df1, df2) {
  df1 = Math.round(df1);
  df2 = Math.round(df2);
  const aKey = String(alpha);

  const key = `${df1}_${df2}`;
  if (fTable[key] && fTable[key][aKey] !== undefined) {
    return { left: null, right: fTable[key][aKey], source: "table" };
  }

  // Try to find approximate by nearest available df2
  const availableDf2ForDf1 = Object.keys(fTable)
    .filter(k => k.startsWith(`${df1}_`))
    .map(k => parseInt(k.split("_")[1], 10))
    .sort((a, b) => a - b);

  if (availableDf2ForDf1.length >= 2) {
    const { lo, hi } = bracket(availableDf2ForDf1, df2);
    const loKey = `${df1}_${lo}`;
    const hiKey = `${df1}_${hi}`;
    if (fTable[loKey] && fTable[hiKey] && fTable[loKey][aKey] !== undefined && fTable[hiKey][aKey] !== undefined) {
      const cv = lerp(df2, lo, hi, fTable[loKey][aKey], fTable[hiKey][aKey]);
      return { left: null, right: cv, source: "interpolated" };
    }
  }

  // Compute using bisection on fCdf
  let lo = 0, hi = 100;
  const target = 1 - alpha;
  // expand hi if needed
  while (dist.fCdf(hi, df1, df2) < target) hi *= 2;

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (dist.fCdf(mid, df1, df2) < target) {
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo < 1e-8) break;
  }
  return { left: null, right: (lo + hi) / 2, source: "computed" };
}

/* -------------------------------------------------------
 * Helpers
 * ------------------------------------------------------- */

function formatSymmetric(cv, tail, source) {
  cv = Math.abs(cv);
  if (tail === "two") return { left: -cv, right: cv, source };
  if (tail === "right") return { left: null, right: cv, source };
  return { left: -cv, right: null, source };
}

/* -------------------------------------------------------
 * Unified API
 * ------------------------------------------------------- */

/**
 * Get critical value(s) for a given distribution.
 * @param {string} distribution - "z", "t", "chi2", "f"
 * @param {object} params - { alpha, tail, df, df1, df2 }
 * @returns {{ left: number|null, right: number|null, source: string }}
 */
function getCriticalValue(distribution, params) {
  const { alpha, tail, df, df1, df2 } = params;

  switch (distribution) {
    case "z":
      return getZCritical(alpha, tail);
    case "t":
      return getTCritical(alpha, tail, df);
    case "chi2":
      return getChi2Critical(alpha, df);
    case "f":
      return getFCritical(alpha, df1, df2);
    default:
      throw new Error(`Unknown distribution: ${distribution}`);
  }
}

/* -------------------------------------------------------
 * Table data for visualization
 * ------------------------------------------------------- */

const ALPHA_LEVELS = ["0.10", "0.05", "0.025", "0.01", "0.005"];

/**
 * Get a subset of the t-distribution table around the given df.
 */
function getTTableSubset(targetDf, usedAlphaKey) {
  targetDf = Math.round(targetDf);
  const allDfKeys = Object.keys(tTable).filter(k => k !== "inf").map(Number).sort((a, b) => a - b);

  // Find rows around targetDf
  let startIdx = 0;
  for (let i = 0; i < allDfKeys.length; i++) {
    if (allDfKeys[i] >= targetDf) {
      startIdx = Math.max(0, i - 2);
      break;
    }
    if (i === allDfKeys.length - 1) startIdx = Math.max(0, i - 4);
  }
  const selectedDfs = allDfKeys.slice(startIdx, startIdx + 6);

  // Build table data
  const rows = [];
  selectedDfs.forEach(df => {
    const entry = tTable[String(df)];
    if (!entry) return;
    const row = { df: df, values: {}, isHighlighted: df === targetDf };
    ALPHA_LEVELS.forEach(a => {
      row.values[a] = entry[a] != null ? entry[a] : null;
    });
    rows.push(row);
  });

  return {
    distribution: "t",
    alphaLevels: ALPHA_LEVELS,
    usedAlpha: usedAlphaKey,
    usedDf: targetDf,
    rows: rows
  };
}

/**
 * Get a subset of the chi-squared table around the given df.
 */
function getChi2TableSubset(targetDf, usedAlpha) {
  targetDf = Math.round(targetDf);
  const allDfKeys = Object.keys(chi2Table).map(Number).sort((a, b) => a - b);
  const chi2Alphas = ["0.10", "0.05", "0.025", "0.01", "0.005"];

  let startIdx = 0;
  for (let i = 0; i < allDfKeys.length; i++) {
    if (allDfKeys[i] >= targetDf) {
      startIdx = Math.max(0, i - 2);
      break;
    }
    if (i === allDfKeys.length - 1) startIdx = Math.max(0, i - 4);
  }
  const selectedDfs = allDfKeys.slice(startIdx, startIdx + 6);

  const rows = [];
  selectedDfs.forEach(df => {
    const entry = chi2Table[String(df)];
    if (!entry) return;
    const row = { df: df, values: {}, isHighlighted: df === targetDf };
    chi2Alphas.forEach(a => {
      row.values[a] = entry[a] != null ? entry[a] : null;
    });
    rows.push(row);
  });

  return {
    distribution: "chi2",
    alphaLevels: chi2Alphas,
    usedAlpha: String(usedAlpha),
    usedDf: targetDf,
    rows: rows
  };
}

/**
 * Get a subset of the F-distribution table for given df1, df2.
 */
function getFTableSubset(targetDf1, targetDf2, usedAlpha) {
  targetDf1 = Math.round(targetDf1);
  targetDf2 = Math.round(targetDf2);
  const fAlphas = ["0.10", "0.05", "0.025", "0.01"];

  // Get available df2 values for this df1
  const availableDf2 = Object.keys(fTable)
    .filter(k => k.startsWith(`${targetDf1}_`))
    .map(k => parseInt(k.split("_")[1], 10))
    .sort((a, b) => a - b);

  if (availableDf2.length === 0) {
    return { distribution: "f", alphaLevels: fAlphas, usedAlpha: String(usedAlpha), usedDf1: targetDf1, usedDf2: targetDf2, rows: [] };
  }

  let startIdx = 0;
  for (let i = 0; i < availableDf2.length; i++) {
    if (availableDf2[i] >= targetDf2) {
      startIdx = Math.max(0, i - 2);
      break;
    }
    if (i === availableDf2.length - 1) startIdx = Math.max(0, i - 4);
  }
  const selectedDf2s = availableDf2.slice(startIdx, startIdx + 6);

  const rows = [];
  selectedDf2s.forEach(df2 => {
    const key = `${targetDf1}_${df2}`;
    const entry = fTable[key];
    if (!entry) return;
    const row = { df1: targetDf1, df2: df2, values: {}, isHighlighted: df2 === targetDf2 };
    fAlphas.forEach(a => {
      row.values[a] = entry[a] != null ? entry[a] : null;
    });
    rows.push(row);
  });

  return {
    distribution: "f",
    alphaLevels: fAlphas,
    usedAlpha: String(usedAlpha),
    usedDf1: targetDf1,
    usedDf2: targetDf2,
    rows: rows
  };
}

/**
 * Get z-distribution table (single row).
 */
function getZTableSubset(usedAlphaKey) {
  const zAlphas = ["0.10", "0.05", "0.025", "0.01", "0.005"];
  const row = { df: "∞", values: {}, isHighlighted: true };
  zAlphas.forEach(a => {
    row.values[a] = zTable[a] != null ? zTable[a] : null;
  });

  return {
    distribution: "z",
    alphaLevels: zAlphas,
    usedAlpha: usedAlphaKey,
    usedDf: "∞",
    rows: [row]
  };
}

/**
 * Get table subset for any distribution.
 */
function getTableSubset(distribution, params) {
  const { alpha, tail, df, df1, df2 } = params;
  const usedAlphaKey = tail === "two" ? String(alpha / 2) : String(alpha);

  switch (distribution) {
    case "z":
      return getZTableSubset(usedAlphaKey);
    case "t":
      return getTTableSubset(df, usedAlphaKey);
    case "chi2":
      return getChi2TableSubset(df, alpha);
    case "f":
      return getFTableSubset(df1, df2, alpha);
    default:
      return null;
  }
}

module.exports = {
  getCriticalValue,
  getZCritical,
  getTCritical,
  getChi2Critical,
  getFCritical,
  getTableSubset
};
