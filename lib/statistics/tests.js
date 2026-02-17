/**
 * 12 hypothesis test implementations.
 * Each test receives a standardized input and returns a standardized result.
 */

"use strict";

const dist = require("./distributions");
const cv   = require("./critical-values");

/* -------------------------------------------------------
 * Decision helper
 * ------------------------------------------------------- */

const DECISIONS = {
  reject: "帰無仮説を棄却。対立仮説を採用します。",
  fail_to_reject: "帰無仮説を棄却できません。"
};

function decide(statValue, critical, tail) {
  if (tail === "two") {
    return (statValue < critical.left || statValue > critical.right) ? "reject" : "fail_to_reject";
  }
  if (tail === "right") {
    return statValue > critical.right ? "reject" : "fail_to_reject";
  }
  // left
  return statValue < critical.left ? "reject" : "fail_to_reject";
}

function round4(v) {
  return Math.round(v * 10000) / 10000;
}

function buildResult(testType, statName, statValue, dfObj, critical, pValue, tail, notes, meta) {
  const decision = decide(statValue, critical, tail);
  return {
    test_type: testType,
    decision,
    decision_text: DECISIONS[decision],
    stat: { name: statName, value: round4(statValue), df: dfObj },
    critical: { left: critical.left != null ? round4(critical.left) : null, right: critical.right != null ? round4(critical.right) : null, source: critical.source },
    p_value: pValue != null ? round4(pValue) : null,
    meta: meta || {},
    notes: notes || []
  };
}

/* -------------------------------------------------------
 * P-value helpers
 * ------------------------------------------------------- */

function pValueT(t, df, tail) {
  if (tail === "two") return 2 * (1 - dist.tCdf(Math.abs(t), df));
  if (tail === "right") return 1 - dist.tCdf(t, df);
  return dist.tCdf(t, df);
}

function pValueZ(z, tail) {
  if (tail === "two") return 2 * (1 - dist.normalCdf(Math.abs(z)));
  if (tail === "right") return 1 - dist.normalCdf(z);
  return dist.normalCdf(z);
}

function pValueChi2(x, df) {
  return 1 - dist.chi2Cdf(x, df);
}

function pValueF(f, df1, df2) {
  return 1 - dist.fCdf(f, df1, df2);
}

/* -------------------------------------------------------
 * 1. t_1sample
 * ------------------------------------------------------- */

function t1Sample(input) {
  const { alpha, tail, params } = input;
  const { n, mean, sd, mu0 } = params;
  const df = n - 1;
  const se = sd / Math.sqrt(n);
  const t = (mean - mu0) / se;
  const critical = cv.getTCritical(alpha, tail, df);
  const p = pValueT(t, df, tail);
  const effectSize = Math.abs(mean - mu0) / sd; // Cohen's d
  return buildResult("t_1sample", "t", t, { v: df }, critical, p, tail,
    [`SE = ${round4(se)}`],
    { effect_size: round4(effectSize), se: round4(se) }
  );
}

/* -------------------------------------------------------
 * 2. t_paired
 * ------------------------------------------------------- */

function tPaired(input) {
  const { alpha, tail, params } = input;
  const { n, d_bar, sd_d } = params;
  const df = n - 1;
  const se = sd_d / Math.sqrt(n);
  const t = d_bar / se;
  const critical = cv.getTCritical(alpha, tail, df);
  const p = pValueT(t, df, tail);
  const effectSize = Math.abs(d_bar) / sd_d;
  return buildResult("t_paired", "t", t, { v: df }, critical, p, tail,
    [`SE = ${round4(se)}`],
    { effect_size: round4(effectSize), se: round4(se) }
  );
}

/* -------------------------------------------------------
 * 3. t_welch
 * ------------------------------------------------------- */

function tWelch(input) {
  const { alpha, tail, params } = input;
  const { n1, mean1, sd1, n2, mean2, sd2 } = params;
  const v1 = sd1 * sd1 / n1;
  const v2 = sd2 * sd2 / n2;
  const se = Math.sqrt(v1 + v2);
  const t = (mean1 - mean2) / se;

  // Welch-Satterthwaite df
  const dfNum = (v1 + v2) * (v1 + v2);
  const dfDen = (v1 * v1) / (n1 - 1) + (v2 * v2) / (n2 - 1);
  const df = dfNum / dfDen;

  const critical = cv.getTCritical(alpha, tail, df);
  const p = pValueT(t, Math.floor(df), tail);

  // Pooled SD for effect size
  const sp = Math.sqrt(((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2));
  const effectSize = sp > 0 ? Math.abs(mean1 - mean2) / sp : 0;

  return buildResult("t_welch", "t", t, { v: round4(df) }, critical, p, tail,
    [`Welch近似自由度 = ${round4(df)}`, `SE = ${round4(se)}`],
    { effect_size: round4(effectSize), se: round4(se), welch_df: round4(df) }
  );
}

/* -------------------------------------------------------
 * 4. t_equal_var
 * ------------------------------------------------------- */

function tEqualVar(input) {
  const { alpha, tail, params } = input;
  const { n1, mean1, sd1, n2, mean2, sd2 } = params;
  const df = n1 + n2 - 2;
  const sp2 = ((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / df;
  const sp = Math.sqrt(sp2);
  const se = sp * Math.sqrt(1 / n1 + 1 / n2);
  const t = (mean1 - mean2) / se;
  const critical = cv.getTCritical(alpha, tail, df);
  const p = pValueT(t, df, tail);
  const effectSize = sp > 0 ? Math.abs(mean1 - mean2) / sp : 0;
  return buildResult("t_equal_var", "t", t, { v: df }, critical, p, tail,
    [`プールド標準偏差 sp = ${round4(sp)}`, `SE = ${round4(se)}`],
    { effect_size: round4(effectSize), se: round4(se), pooled_sd: round4(sp) }
  );
}

/* -------------------------------------------------------
 * 5. prop_1
 * ------------------------------------------------------- */

function prop1(input) {
  const { alpha, tail, params } = input;
  const { n, x, p0 } = params;
  const pHat = x / n;
  const se = Math.sqrt(p0 * (1 - p0) / n);
  const z = (pHat - p0) / se;
  const critical = cv.getZCritical(alpha, tail);
  const p = pValueZ(z, tail);
  const notes = [];
  // Approximation condition check
  if (n * p0 < 5 || n * (1 - p0) < 5) {
    notes.push("注意: np₀ または n(1−p₀) < 5 のため正規近似が不正確な可能性があります。正確法（二項検定）の利用を推奨します。");
  } else {
    notes.push("近似条件OK: np₀ ≥ 5 かつ n(1−p₀) ≥ 5");
  }
  return buildResult("prop_1", "z", z, {}, critical, p, tail, notes,
    { p_hat: round4(pHat), se: round4(se) }
  );
}

/* -------------------------------------------------------
 * 6. prop_2
 * ------------------------------------------------------- */

function prop2(input) {
  const { alpha, tail, params } = input;
  const { n1, x1, n2, x2 } = params;
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pPool = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  const z = (p1 - p2) / se;
  const critical = cv.getZCritical(alpha, tail);
  const p = pValueZ(z, tail);
  const notes = [];
  if (n1 * pPool < 5 || n2 * pPool < 5 || n1 * (1 - pPool) < 5 || n2 * (1 - pPool) < 5) {
    notes.push("注意: 一部のセルで期待度数 < 5 のため正規近似が不正確な可能性があります。");
  } else {
    notes.push("近似条件OK");
  }
  return buildResult("prop_2", "z", z, {}, critical, p, tail, notes,
    { p1: round4(p1), p2: round4(p2), p_pooled: round4(pPool), se: round4(se) }
  );
}

/* -------------------------------------------------------
 * 7. chi2_gof (goodness-of-fit)
 * ------------------------------------------------------- */

function chi2Gof(input) {
  const { alpha, params } = input;
  const { observed, expected } = params;
  const k = observed.length;
  const df = k - 1;
  let chi2 = 0;
  const notes = [];
  let warnSmall = false;
  for (let i = 0; i < k; i++) {
    const e = expected[i];
    const o = observed[i];
    chi2 += (o - e) * (o - e) / e;
    if (e < 5) warnSmall = true;
  }
  if (warnSmall) {
    notes.push("注意: 期待度数が5未満のカテゴリがあります。");
  } else {
    notes.push("近似条件OK: すべての期待度数 ≥ 5");
  }
  const critical = cv.getChi2Critical(alpha, df);
  const p = pValueChi2(chi2, df);
  // Chi-squared GOF is always right-tail
  const decision = chi2 > critical.right ? "reject" : "fail_to_reject";
  return {
    test_type: "chi2_gof",
    decision,
    decision_text: DECISIONS[decision],
    stat: { name: "χ²", value: round4(chi2), df: { v: df } },
    critical: { left: null, right: round4(critical.right), source: critical.source },
    p_value: round4(p),
    meta: { k },
    notes
  };
}

/* -------------------------------------------------------
 * 8. chi2_indep (independence)
 * ------------------------------------------------------- */

function chi2Indep(input) {
  const { alpha, params } = input;
  const { rows, cols, observed } = params;
  const df = (rows - 1) * (cols - 1);

  // Calculate row/col totals
  const rowTotals = [];
  const colTotals = new Array(cols).fill(0);
  let grandTotal = 0;
  for (let r = 0; r < rows; r++) {
    let rowSum = 0;
    for (let c = 0; c < cols; c++) {
      rowSum += observed[r][c];
      colTotals[c] += observed[r][c];
    }
    rowTotals.push(rowSum);
    grandTotal += rowSum;
  }

  let chi2 = 0;
  const notes = [];
  let warnSmall = false;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const e = rowTotals[r] * colTotals[c] / grandTotal;
      const o = observed[r][c];
      chi2 += (o - e) * (o - e) / e;
      if (e < 5) warnSmall = true;
    }
  }
  if (warnSmall) {
    notes.push("注意: 期待度数が5未満のセルがあります。");
  } else {
    notes.push("近似条件OK: すべての期待度数 ≥ 5");
  }

  const critical = cv.getChi2Critical(alpha, df);
  const p = pValueChi2(chi2, df);
  const decision = chi2 > critical.right ? "reject" : "fail_to_reject";

  // Cramér's V
  const minDim = Math.min(rows, cols) - 1;
  const cramersV = minDim > 0 ? Math.sqrt(chi2 / (grandTotal * minDim)) : 0;

  return {
    test_type: "chi2_indep",
    decision,
    decision_text: DECISIONS[decision],
    stat: { name: "χ²", value: round4(chi2), df: { v: df } },
    critical: { left: null, right: round4(critical.right), source: critical.source },
    p_value: round4(p),
    meta: { rows, cols, cramers_v: round4(cramersV) },
    notes
  };
}

/* -------------------------------------------------------
 * 9. f_eqvar (equal-variance F test)
 * ------------------------------------------------------- */

function fEqVar(input) {
  const { alpha, tail, params } = input;
  const { n1, sd1, n2, sd2 } = params;
  const var1 = sd1 * sd1;
  const var2 = sd2 * sd2;

  // Always put larger variance in numerator
  let fVal, df1, df2;
  if (var1 >= var2) {
    fVal = var1 / var2;
    df1 = n1 - 1;
    df2 = n2 - 1;
  } else {
    fVal = var2 / var1;
    df1 = n2 - 1;
    df2 = n1 - 1;
  }

  // For two-sided F test, use alpha/2 for the right-tail
  const effectiveAlpha = tail === "two" ? alpha / 2 : alpha;
  const critical = cv.getFCritical(effectiveAlpha, df1, df2);
  const p = pValueF(fVal, df1, df2);
  const pTwoSided = tail === "two" ? 2 * Math.min(p, 1 - p) : p;

  const decision = fVal > critical.right ? "reject" : "fail_to_reject";
  return {
    test_type: "f_eqvar",
    decision,
    decision_text: DECISIONS[decision],
    stat: { name: "F", value: round4(fVal), df: { df1, df2 } },
    critical: { left: null, right: round4(critical.right), source: critical.source },
    p_value: round4(tail === "two" ? pTwoSided : p),
    meta: { var_ratio: round4(fVal) },
    notes: [`分散比 = ${round4(fVal)}`]
  };
}

/* -------------------------------------------------------
 * 10. anova_oneway (one-way ANOVA, summary data)
 * ------------------------------------------------------- */

function anovaOneway(input) {
  const { alpha, params } = input;
  const { k, groups } = params;

  let N = 0;
  let grandSum = 0;
  for (const g of groups) {
    N += g.n;
    grandSum += g.n * g.mean;
  }
  const grandMean = grandSum / N;

  let ssBetween = 0;
  let ssWithin = 0;
  for (const g of groups) {
    ssBetween += g.n * (g.mean - grandMean) * (g.mean - grandMean);
    ssWithin += (g.n - 1) * g.sd * g.sd;
  }

  const df1 = k - 1;
  const df2 = N - k;
  const msBetween = ssBetween / df1;
  const msWithin = ssWithin / df2;
  const fVal = msBetween / msWithin;

  const critical = cv.getFCritical(alpha, df1, df2);
  const p = pValueF(fVal, df1, df2);
  const decision = fVal > critical.right ? "reject" : "fail_to_reject";

  // Effect size: eta-squared
  const ssTotal = ssBetween + ssWithin;
  const etaSq = ssTotal > 0 ? ssBetween / ssTotal : 0;

  return {
    test_type: "anova_oneway",
    decision,
    decision_text: DECISIONS[decision],
    stat: { name: "F", value: round4(fVal), df: { df1, df2 } },
    critical: { left: null, right: round4(critical.right), source: critical.source },
    p_value: round4(p),
    meta: {
      ss_between: round4(ssBetween),
      ss_within: round4(ssWithin),
      ms_between: round4(msBetween),
      ms_within: round4(msWithin),
      eta_squared: round4(etaSq)
    },
    notes: [`群間SS = ${round4(ssBetween)}`, `群内SS = ${round4(ssWithin)}`]
  };
}

/* -------------------------------------------------------
 * 11. binom (exact binomial test)
 * ------------------------------------------------------- */

function binomTest(input) {
  const { alpha, tail, params } = input;
  const { n, x, p0 } = params;

  let pValue;
  if (tail === "right") {
    // P(X >= x) = 1 - P(X <= x-1)
    pValue = x > 0 ? 1 - dist.binomialCdf(x - 1, n, p0) : 1;
  } else if (tail === "left") {
    // P(X <= x)
    pValue = dist.binomialCdf(x, n, p0);
  } else {
    // Two-sided: sum probabilities <= P(X=x)
    const pObs = dist.binomialPmf(x, n, p0);
    let pVal = 0;
    for (let i = 0; i <= n; i++) {
      const pi = dist.binomialPmf(i, n, p0);
      if (pi <= pObs + 1e-12) {
        pVal += pi;
      }
    }
    pValue = Math.min(pVal, 1);
  }

  const decision = pValue <= alpha ? "reject" : "fail_to_reject";
  const pHat = x / n;

  const notes = ["正確法（二項検定）による判定"];
  if (n * p0 >= 5 && n * (1 - p0) >= 5) {
    notes.push("注記: np₀ ≥ 5 かつ n(1−p₀) ≥ 5 のため正規近似も使用可能です。");
  }

  return {
    test_type: "binom",
    decision,
    decision_text: DECISIONS[decision],
    stat: { name: "x", value: x, df: {} },
    critical: { left: null, right: null, source: "exact" },
    p_value: round4(pValue),
    meta: { n, p0, p_hat: round4(pHat) },
    notes
  };
}

/* -------------------------------------------------------
 * 12. poisson (exact Poisson test)
 * ------------------------------------------------------- */

function poissonTest(input) {
  const { alpha, tail, params } = input;
  const { observed, lambda0 } = params;

  let pValue;
  if (tail === "right") {
    pValue = observed > 0 ? 1 - dist.poissonCdf(observed - 1, lambda0) : 1;
  } else if (tail === "left") {
    pValue = dist.poissonCdf(observed, lambda0);
  } else {
    // Two-sided: sum probabilities <= P(X=observed)
    const pObs = dist.poissonPmf(observed, lambda0);
    let pVal = 0;
    const maxK = Math.max(Math.ceil(lambda0 * 5), observed * 3, 50);
    for (let i = 0; i <= maxK; i++) {
      const pi = dist.poissonPmf(i, lambda0);
      if (pi <= pObs + 1e-12) {
        pVal += pi;
      }
    }
    pValue = Math.min(pVal, 1);
  }

  const decision = pValue <= alpha ? "reject" : "fail_to_reject";

  return {
    test_type: "poisson",
    decision,
    decision_text: DECISIONS[decision],
    stat: { name: "x", value: observed, df: {} },
    critical: { left: null, right: null, source: "exact" },
    p_value: round4(pValue),
    meta: { observed, lambda0 },
    notes: ["正確法（ポアソン検定）による判定"]
  };
}

/* -------------------------------------------------------
 * Dispatcher
 * ------------------------------------------------------- */

const TEST_MAP = {
  t_1sample:     t1Sample,
  t_paired:      tPaired,
  t_welch:       tWelch,
  t_equal_var:   tEqualVar,
  prop_1:        prop1,
  prop_2:        prop2,
  chi2_gof:      chi2Gof,
  chi2_indep:    chi2Indep,
  f_eqvar:       fEqVar,
  anova_oneway:  anovaOneway,
  binom:         binomTest,
  poisson:       poissonTest
};

function runTest(input) {
  const fn = TEST_MAP[input.test_type];
  if (!fn) throw new Error(`Unknown test_type: ${input.test_type}`);
  return fn(input);
}

/* -------------------------------------------------------
 * Input validation
 * ------------------------------------------------------- */

function validateInputs(input) {
  const errors = [];
  const badges = [];

  if (!input.test_type || !TEST_MAP[input.test_type]) {
    errors.push({ field: "test_type", message: "不正な検定種別です。" });
    return { valid: false, errors, badges, derived: {} };
  }

  const alpha = parseFloat(input.alpha);
  if (![0.10, 0.05, 0.01].includes(alpha)) {
    errors.push({ field: "alpha", message: "有意水準は 0.10, 0.05, 0.01 のいずれかを選択してください。" });
  }

  const tail = input.tail;
  if (!["two", "right", "left"].includes(tail)) {
    errors.push({ field: "tail", message: "検定の方向は two, right, left のいずれかを選択してください。" });
  }

  // Chi-squared and ANOVA are always right-tail (internally)
  if (["chi2_gof", "chi2_indep", "anova_oneway"].includes(input.test_type) && tail !== "two") {
    // We silently allow it but note it
  }

  const p = input.params || {};
  const derived = {};

  switch (input.test_type) {
    case "t_1sample":
      validatePositiveInt(p.n, "n", errors);
      validateNumber(p.mean, "mean", errors);
      validatePositive(p.sd, "sd", errors);
      validateNumber(p.mu0, "mu0", errors);
      if (errors.length === 0) {
        derived.df = p.n - 1;
        derived.se = p.sd / Math.sqrt(p.n);
        derived.t_approx = (p.mean - p.mu0) / derived.se;
      }
      break;

    case "t_paired":
      validatePositiveInt(p.n, "n", errors);
      validateNumber(p.d_bar, "d_bar", errors);
      validatePositive(p.sd_d, "sd_d", errors);
      if (errors.length === 0) {
        derived.df = p.n - 1;
        derived.se = p.sd_d / Math.sqrt(p.n);
      }
      break;

    case "t_welch":
    case "t_equal_var":
      validatePositiveInt(p.n1, "n1", errors);
      validateNumber(p.mean1, "mean1", errors);
      validatePositive(p.sd1, "sd1", errors);
      validatePositiveInt(p.n2, "n2", errors);
      validateNumber(p.mean2, "mean2", errors);
      validatePositive(p.sd2, "sd2", errors);
      if (errors.length === 0) {
        if (input.test_type === "t_welch") {
          const v1 = p.sd1 * p.sd1 / p.n1;
          const v2 = p.sd2 * p.sd2 / p.n2;
          derived.se = Math.sqrt(v1 + v2);
          derived.df = ((v1 + v2) ** 2) / (v1 * v1 / (p.n1 - 1) + v2 * v2 / (p.n2 - 1));
        } else {
          derived.df = p.n1 + p.n2 - 2;
          const sp2 = ((p.n1 - 1) * p.sd1 ** 2 + (p.n2 - 1) * p.sd2 ** 2) / derived.df;
          derived.se = Math.sqrt(sp2 * (1 / p.n1 + 1 / p.n2));
        }
      }
      break;

    case "prop_1":
      validatePositiveInt(p.n, "n", errors);
      validateNonNegativeInt(p.x, "x", errors);
      validateProportion(p.p0, "p0", errors);
      if (p.x > p.n) errors.push({ field: "x", message: "成功数xはn以下にしてください。" });
      if (errors.length === 0) {
        derived.p_hat = p.x / p.n;
        derived.se = Math.sqrt(p.p0 * (1 - p.p0) / p.n);
        if (p.n * p.p0 < 5 || p.n * (1 - p.p0) < 5) {
          badges.push({ status: "warn", message: "np₀ または n(1−p₀) < 5: 正規近似が不正確な可能性" });
        } else {
          badges.push({ status: "ok", message: "近似条件OK" });
        }
      }
      break;

    case "prop_2":
      validatePositiveInt(p.n1, "n1", errors);
      validateNonNegativeInt(p.x1, "x1", errors);
      validatePositiveInt(p.n2, "n2", errors);
      validateNonNegativeInt(p.x2, "x2", errors);
      if (p.x1 > p.n1) errors.push({ field: "x1", message: "x1はn1以下にしてください。" });
      if (p.x2 > p.n2) errors.push({ field: "x2", message: "x2はn2以下にしてください。" });
      break;

    case "chi2_gof":
      if (!Array.isArray(p.observed) || p.observed.length < 2) {
        errors.push({ field: "observed", message: "観測度数は2カテゴリ以上必要です。" });
      }
      if (!Array.isArray(p.expected) || p.expected.length < 2) {
        errors.push({ field: "expected", message: "期待度数は2カテゴリ以上必要です。" });
      }
      if (Array.isArray(p.observed) && Array.isArray(p.expected) && p.observed.length !== p.expected.length) {
        errors.push({ field: "expected", message: "観測度数と期待度数のカテゴリ数が一致しません。" });
      }
      if (errors.length === 0) {
        derived.df = p.observed.length - 1;
        const hasSmallE = p.expected.some(e => e < 5);
        if (hasSmallE) badges.push({ status: "warn", message: "期待度数 < 5 のカテゴリがあります" });
        else badges.push({ status: "ok", message: "近似条件OK" });
      }
      break;

    case "chi2_indep":
      validatePositiveInt(p.rows, "rows", errors);
      validatePositiveInt(p.cols, "cols", errors);
      if (!Array.isArray(p.observed)) {
        errors.push({ field: "observed", message: "観測度数テーブルが必要です。" });
      } else if (p.observed.length !== p.rows) {
        errors.push({ field: "observed", message: "行数が一致しません。" });
      }
      if (errors.length === 0) {
        derived.df = (p.rows - 1) * (p.cols - 1);
      }
      break;

    case "f_eqvar":
      validatePositiveInt(p.n1, "n1", errors);
      validatePositive(p.sd1, "sd1", errors);
      validatePositiveInt(p.n2, "n2", errors);
      validatePositive(p.sd2, "sd2", errors);
      if (errors.length === 0) {
        const larger = Math.max(p.sd1, p.sd2);
        const smaller = Math.min(p.sd1, p.sd2);
        derived.f_approx = (larger * larger) / (smaller * smaller);
        derived.df1 = (p.sd1 >= p.sd2 ? p.n1 : p.n2) - 1;
        derived.df2 = (p.sd1 >= p.sd2 ? p.n2 : p.n1) - 1;
      }
      break;

    case "anova_oneway":
      validatePositiveInt(p.k, "k", errors);
      if (p.k < 3) errors.push({ field: "k", message: "群数kは3以上にしてください。" });
      if (!Array.isArray(p.groups) || p.groups.length !== p.k) {
        errors.push({ field: "groups", message: "群数とグループデータが一致しません。" });
      } else {
        p.groups.forEach((g, i) => {
          validatePositiveInt(g.n, `groups[${i}].n`, errors);
          validateNumber(g.mean, `groups[${i}].mean`, errors);
          validatePositive(g.sd, `groups[${i}].sd`, errors);
        });
      }
      if (errors.length === 0) {
        derived.df1 = p.k - 1;
        derived.df2 = p.groups.reduce((s, g) => s + g.n, 0) - p.k;
      }
      break;

    case "binom":
      validatePositiveInt(p.n, "n", errors);
      validateNonNegativeInt(p.x, "x", errors);
      validateProportion(p.p0, "p0", errors);
      if (p.x > p.n) errors.push({ field: "x", message: "xはn以下にしてください。" });
      break;

    case "poisson":
      validateNonNegativeInt(p.observed, "observed", errors);
      validatePositive(p.lambda0, "lambda0", errors);
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    badges,
    derived: errors.length === 0 ? derived : {}
  };
}

/* -------------------------------------------------------
 * Validation helpers
 * ------------------------------------------------------- */

function validatePositiveInt(val, field, errors) {
  if (val == null || !Number.isFinite(val) || val < 1 || Math.floor(val) !== val) {
    errors.push({ field, message: `${field}は1以上の整数を入力してください。` });
  }
}

function validateNonNegativeInt(val, field, errors) {
  if (val == null || !Number.isFinite(val) || val < 0 || Math.floor(val) !== val) {
    errors.push({ field, message: `${field}は0以上の整数を入力してください。` });
  }
}

function validatePositive(val, field, errors) {
  if (val == null || !Number.isFinite(val) || val <= 0) {
    errors.push({ field, message: `${field}は正の値を入力してください。` });
  }
}

function validateNumber(val, field, errors) {
  if (val == null || !Number.isFinite(val)) {
    errors.push({ field, message: `${field}は数値を入力してください。` });
  }
}

function validateProportion(val, field, errors) {
  if (val == null || !Number.isFinite(val) || val <= 0 || val >= 1) {
    errors.push({ field, message: `${field}は0〜1の範囲（両端除く）で入力してください。` });
  }
}

/* -------------------------------------------------------
 * Calculation steps generator
 * ------------------------------------------------------- */

function getCalculationSteps(input) {
  const { test_type, params } = input;
  const steps = [];

  switch (test_type) {
    case "t_1sample": {
      const { n, mean, sd, mu0 } = params;
      const s2 = round4(sd * sd);
      const se = sd / Math.sqrt(n);
      const t = (mean - mu0) / se;
      steps.push({
        title: "不偏分散 s² の確認",
        note: "母分散 σ² が未知のため、標本から求めた不偏分散 s² で推定します。",
        formula: `s^2 = ${sd}^2 = ${s2}`
      });
      steps.push({
        title: "標準誤差 SE の計算",
        formula: `SE = \\frac{s}{\\sqrt{n}} = \\frac{\\sqrt{${s2}}}{\\sqrt{${n}}} = \\frac{${sd}}{${round4(Math.sqrt(n))}} = ${round4(se)}`
      });
      steps.push({
        title: "t統計量の計算",
        formula: `t = \\frac{\\bar{x} - \\mu_0}{SE} = \\frac{${mean} - ${mu0}}{${round4(se)}} = \\frac{${round4(mean - mu0)}}{${round4(se)}} = ${round4(t)}`
      });
      steps.push({ result: { label: "検定統計量 t", value: round4(t) } });
      break;
    }

    case "t_paired": {
      const { n, d_bar, sd_d } = params;
      const s2d = round4(sd_d * sd_d);
      const se = sd_d / Math.sqrt(n);
      const t = d_bar / se;
      steps.push({
        title: "差の不偏分散 s²_d の確認",
        note: "対応のある差の母分散が未知のため、不偏分散 s²_d で推定します。",
        formula: `s_d^2 = ${sd_d}^2 = ${s2d}`
      });
      steps.push({
        title: "標準誤差 SE の計算",
        formula: `SE = \\frac{s_d}{\\sqrt{n}} = \\frac{\\sqrt{${s2d}}}{\\sqrt{${n}}} = \\frac{${sd_d}}{${round4(Math.sqrt(n))}} = ${round4(se)}`
      });
      steps.push({
        title: "t統計量の計算",
        formula: `t = \\frac{\\bar{d}}{SE} = \\frac{${d_bar}}{${round4(se)}} = ${round4(t)}`
      });
      steps.push({ result: { label: "検定統計量 t", value: round4(t) } });
      break;
    }

    case "t_welch": {
      const { n1, mean1, sd1, n2, mean2, sd2 } = params;
      const s1sq = round4(sd1 * sd1);
      const s2sq = round4(sd2 * sd2);
      const v1 = sd1 * sd1 / n1;
      const v2 = sd2 * sd2 / n2;
      const se = Math.sqrt(v1 + v2);
      const t = (mean1 - mean2) / se;
      const dfNum = (v1 + v2) * (v1 + v2);
      const dfDen = (v1 * v1) / (n1 - 1) + (v2 * v2) / (n2 - 1);
      const df = dfNum / dfDen;
      steps.push({
        title: "各群の不偏分散 s² の確認",
        note: "母分散 σ₁², σ₂² が未知のため、各群の不偏分散で推定します。",
        formula: `s_1^2 = ${sd1}^2 = ${s1sq}, \\quad s_2^2 = ${sd2}^2 = ${s2sq}`
      });
      steps.push({
        title: "標準誤差 SE の計算",
        formula: `SE = \\sqrt{\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}} = \\sqrt{\\frac{${s1sq}}{${n1}} + \\frac{${s2sq}}{${n2}}} = \\sqrt{${round4(v1)} + ${round4(v2)}} = ${round4(se)}`
      });
      steps.push({
        title: "t統計量の計算",
        formula: `t = \\frac{\\bar{x}_1 - \\bar{x}_2}{SE} = \\frac{${mean1} - ${mean2}}{${round4(se)}} = \\frac{${round4(mean1 - mean2)}}{${round4(se)}} = ${round4(t)}`
      });
      steps.push({
        title: "Welch-Satterthwaite の自由度",
        formula: `df = \\frac{\\left(\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}\\right)^2}{\\frac{(s_1^2/n_1)^2}{n_1-1} + \\frac{(s_2^2/n_2)^2}{n_2-1}} = ${round4(df)}`
      });
      steps.push({ result: { label: "検定統計量 t", value: round4(t) } });
      break;
    }

    case "t_equal_var": {
      const { n1, mean1, sd1, n2, mean2, sd2 } = params;
      const s1sq = round4(sd1 * sd1);
      const s2sq = round4(sd2 * sd2);
      const df = n1 + n2 - 2;
      const sp2 = ((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / df;
      const sp = Math.sqrt(sp2);
      const se = sp * Math.sqrt(1 / n1 + 1 / n2);
      const t = (mean1 - mean2) / se;
      steps.push({
        title: "各群の不偏分散 s² の確認",
        note: "母分散 σ² が未知（ただし等分散を仮定）のため、2群の不偏分散をプールして推定します。",
        formula: `s_1^2 = ${sd1}^2 = ${s1sq}, \\quad s_2^2 = ${sd2}^2 = ${s2sq}`
      });
      steps.push({
        title: "プールド分散 s²ₚ の計算",
        formula: `s_p^2 = \\frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1+n_2-2} = \\frac{(${n1}-1) \\times ${s1sq} + (${n2}-1) \\times ${s2sq}}{${df}} = ${round4(sp2)}`
      });
      steps.push({
        title: "標準誤差 SE の計算",
        formula: `SE = s_p \\sqrt{\\frac{1}{n_1} + \\frac{1}{n_2}} = ${round4(sp)} \\times \\sqrt{\\frac{1}{${n1}} + \\frac{1}{${n2}}} = ${round4(se)}`
      });
      steps.push({
        title: "t統計量の計算",
        formula: `t = \\frac{\\bar{x}_1 - \\bar{x}_2}{SE} = \\frac{${mean1} - ${mean2}}{${round4(se)}} = \\frac{${round4(mean1 - mean2)}}{${round4(se)}} = ${round4(t)}`
      });
      steps.push({ result: { label: "検定統計量 t", value: round4(t) } });
      break;
    }

    case "prop_1": {
      const { n, x, p0 } = params;
      const pHat = x / n;
      const se = Math.sqrt(p0 * (1 - p0) / n);
      const z = (pHat - p0) / se;
      steps.push({
        title: "標本比率 p̂ の計算",
        formula: `\\hat{p} = \\frac{x}{n} = \\frac{${x}}{${n}} = ${round4(pHat)}`
      });
      steps.push({
        title: "標準誤差 SE の計算",
        formula: `SE = \\sqrt{\\frac{p_0(1-p_0)}{n}} = \\sqrt{\\frac{${p0} \\times ${round4(1 - p0)}}{${n}}} = ${round4(se)}`
      });
      steps.push({
        title: "z統計量の計算",
        formula: `z = \\frac{\\hat{p} - p_0}{SE} = \\frac{${round4(pHat)} - ${p0}}{${round4(se)}} = \\frac{${round4(pHat - p0)}}{${round4(se)}} = ${round4(z)}`
      });
      steps.push({ result: { label: "検定統計量 z", value: round4(z) } });
      break;
    }

    case "prop_2": {
      const { n1, x1, n2, x2 } = params;
      const p1 = x1 / n1;
      const p2 = x2 / n2;
      const pPool = (x1 + x2) / (n1 + n2);
      const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
      const z = (p1 - p2) / se;
      steps.push({
        title: "各群の標本比率",
        formula: `\\hat{p}_1 = \\frac{${x1}}{${n1}} = ${round4(p1)}, \\quad \\hat{p}_2 = \\frac{${x2}}{${n2}} = ${round4(p2)}`
      });
      steps.push({
        title: "プールド比率の計算",
        formula: `\\hat{p} = \\frac{x_1 + x_2}{n_1 + n_2} = \\frac{${x1} + ${x2}}{${n1} + ${n2}} = ${round4(pPool)}`
      });
      steps.push({
        title: "標準誤差 SE の計算",
        formula: `SE = \\sqrt{\\hat{p}(1-\\hat{p})\\left(\\frac{1}{n_1} + \\frac{1}{n_2}\\right)} = ${round4(se)}`
      });
      steps.push({
        title: "z統計量の計算",
        formula: `z = \\frac{\\hat{p}_1 - \\hat{p}_2}{SE} = \\frac{${round4(p1)} - ${round4(p2)}}{${round4(se)}} = ${round4(z)}`
      });
      steps.push({ result: { label: "検定統計量 z", value: round4(z) } });
      break;
    }

    case "chi2_gof": {
      const { observed, expected } = params;
      let chi2 = 0;
      const terms = [];
      for (let i = 0; i < observed.length; i++) {
        const diff = observed[i] - expected[i];
        const term = (diff * diff) / expected[i];
        chi2 += term;
        terms.push(`\\frac{(${observed[i]}-${expected[i]})^2}{${expected[i]}}`);
      }
      steps.push({
        title: "χ²統計量の計算",
        formula: `\\chi^2 = \\sum \\frac{(O_i - E_i)^2}{E_i} = ${terms.join(" + ")}`
      });
      steps.push({
        title: "計算結果",
        formula: `\\chi^2 = ${round4(chi2)}`
      });
      steps.push({
        title: "自由度",
        formula: `df = k - 1 = ${observed.length} - 1 = ${observed.length - 1}`
      });
      steps.push({ result: { label: "検定統計量 χ²", value: round4(chi2) } });
      break;
    }

    case "chi2_indep": {
      const obsTable = params.observed;
      const rows = params.rows;
      const cols = params.cols;
      const rowSums = obsTable.map(row => row.reduce((a, b) => a + b, 0));
      const colSums = new Array(cols).fill(0);
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) colSums[j] += obsTable[i][j];
      }
      const N = rowSums.reduce((a, b) => a + b, 0);

      steps.push({
        title: "期待度数の公式",
        formula: `E_{ij} = \\frac{f_{i\\cdot} \\times f_{\\cdot j}}{n}`
      });

      // Build cell-by-cell (O-E)²/E as a table
      const cellSteps = [];
      let chi2 = 0;
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const o = obsTable[i][j];
          const e = round4(rowSums[i] * colSums[j] / N);
          const term = round4((o - e) * (o - e) / e);
          chi2 += (o - e) * (o - e) / e;
          cellSteps.push({ o, e, term, row: i + 1, col: j + 1 });
        }
      }

      // Render as a deviation table
      steps.push({
        title: "各セルのズレ (O−E)²/E",
        table: { rows, cols, rowSums, colSums, N, cells: cellSteps }
      });

      const termFormulas = cellSteps.map(c => String(c.term));
      steps.push({
        title: "χ²統計量の合計",
        formula: `\\chi^2 = ${termFormulas.join(" + ")} = ${round4(chi2)}`
      });
      steps.push({
        title: "自由度",
        formula: `df = (r-1)(c-1) = (${rows}-1)(${cols}-1) = ${(rows - 1) * (cols - 1)}`
      });
      steps.push({ result: { label: "検定統計量 χ²", value: round4(chi2) } });
      break;
    }

    case "f_eqvar": {
      const { n1, sd1, n2, sd2 } = params;
      const var1 = round4(sd1 * sd1);
      const var2 = round4(sd2 * sd2);
      const larger = Math.max(var1, var2);
      const smaller = Math.min(var1, var2);
      const f = larger / smaller;
      const df1 = var1 >= var2 ? n1 - 1 : n2 - 1;
      const df2 = var1 >= var2 ? n2 - 1 : n1 - 1;
      steps.push({
        title: "不偏分散の計算",
        formula: `s_1^2 = ${sd1}^2 = ${var1}, \\quad s_2^2 = ${sd2}^2 = ${var2}`
      });
      steps.push({
        title: "F統計量の計算",
        formula: `F = \\frac{s_{\\text{大}}^2}{s_{\\text{小}}^2} = \\frac{${larger}}{${smaller}} = ${round4(f)}`
      });
      steps.push({
        title: "自由度",
        formula: `df_1 = ${df1}, \\quad df_2 = ${df2}`
      });
      steps.push({ result: { label: "検定統計量 F", value: round4(f) } });
      break;
    }

    case "anova_oneway": {
      const { groups } = params;
      const k = groups.length;
      let N = 0, grandSum = 0;
      groups.forEach(g => { N += g.n; grandSum += g.n * g.mean; });
      const grandMean = grandSum / N;
      let ssBetween = 0, ssWithin = 0;
      groups.forEach(g => {
        ssBetween += g.n * (g.mean - grandMean) ** 2;
        ssWithin += (g.n - 1) * g.sd ** 2;
      });
      const df1 = k - 1;
      const df2 = N - k;
      const msBetween = ssBetween / df1;
      const msWithin = ssWithin / df2;
      const f = msBetween / msWithin;
      steps.push({
        title: "全体平均の計算",
        formula: `\\bar{\\bar{x}} = \\frac{\\sum n_i \\bar{x}_i}{N} = ${round4(grandMean)}`
      });
      steps.push({
        title: "群間変動 SSB の計算",
        formula: `SS_B = \\sum n_i (\\bar{x}_i - \\bar{\\bar{x}})^2 = ${round4(ssBetween)}`
      });
      steps.push({
        title: "群内変動 SSW の計算",
        formula: `SS_W = \\sum (n_i - 1) s_i^2 = ${round4(ssWithin)}`
      });
      steps.push({
        title: "F統計量の計算",
        formula: `F = \\frac{MS_B}{MS_W} = \\frac{SS_B / (k-1)}{SS_W / (N-k)} = \\frac{${round4(msBetween)}}{${round4(msWithin)}} = ${round4(f)}`
      });
      steps.push({ result: { label: "検定統計量 F", value: round4(f) } });
      break;
    }

    case "binom": {
      const { n, x, p0 } = params;
      steps.push({
        title: "二項検定（正確法）",
        formula: `観測値: x = ${x}, \\quad 試行回数: n = ${n}, \\quad 帰無仮説の確率: p_0 = ${p0}`
      });
      steps.push({
        title: "標本比率",
        formula: `\\hat{p} = \\frac{x}{n} = \\frac{${x}}{${n}} = ${round4(x / n)}`
      });
      steps.push({
        title: "判定方法",
        formula: `P(X \\geq x) \\text{ または } P(X \\leq x) \\text{ を二項分布から直接計算}`
      });
      steps.push({ result: { label: "観測値 x", value: x } });
      break;
    }

    case "poisson": {
      const { observed, lambda0 } = params;
      steps.push({
        title: "ポアソン検定（正確法）",
        formula: `観測値: x = ${observed}, \\quad 帰無仮説の期待値: \\lambda_0 = ${lambda0}`
      });
      steps.push({
        title: "判定方法",
        formula: `P(X \\geq x) \\text{ または } P(X \\leq x) \\text{ をポアソン分布から直接計算}`
      });
      steps.push({ result: { label: "観測値 x", value: observed } });
      break;
    }
  }

  return { steps };
}

/* -------------------------------------------------------
 * Exports
 * ------------------------------------------------------- */

module.exports = {
  runTest,
  validateInputs,
  getCalculationSteps,
  TEST_MAP
};
