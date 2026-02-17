/**
 * Routes for the Tools section (hypothesis test simulation).
 * Mounted at /tools in app.js.
 */

"use strict";

const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const path = require("path");
const statistics = require("../lib/statistics");

// Rate limiter for simulation endpoint
const simulateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "リクエスト回数が上限に達しました。しばらくしてから再試行してください。" }
});

/* -------------------------------------------------------
 * Page route
 * ------------------------------------------------------- */

router.get("/simulate", (req, res) => {
  res.render("tools/simulate");
});

/* -------------------------------------------------------
 * API routes
 * ------------------------------------------------------- */

/**
 * POST /tools/api/simulate
 * Execute a hypothesis test.
 */
router.post("/api/simulate", simulateLimiter, (req, res) => {
  try {
    const input = req.body;
    const validation = statistics.validateInputs(input);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }
    const result = statistics.runTest(input);

    // Add table subset for visualization
    const distMap = { t: "t", z: "z", "χ²": "chi2", F: "f" };
    const distribution = distMap[result.stat.name] || null;
    if (distribution) {
      const tableParams = {
        alpha: input.alpha,
        tail: input.tail,
        df: result.stat.df.v,
        df1: result.stat.df.df1,
        df2: result.stat.df.df2
      };
      result.table_data = statistics.getTableSubset(distribution, tableParams);
    }

    res.json(result);
  } catch (err) {
    console.error("Simulation error:", err);
    res.status(500).json({ error: "計算中にエラーが発生しました。" });
  }
});

/**
 * POST /tools/api/validate
 * Validate inputs and return preview data (derived values, badges).
 */
router.post("/api/validate", (req, res) => {
  try {
    const input = req.body;
    const validation = statistics.validateInputs(input);
    res.json(validation);
  } catch (err) {
    console.error("Validation error:", err);
    res.status(500).json({ error: "検証中にエラーが発生しました。" });
  }
});

/**
 * POST /tools/api/calculate
 * Get step-by-step calculation for display.
 */
router.post("/api/calculate", (req, res) => {
  try {
    const input = req.body;
    const validation = statistics.validateInputs(input);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }
    const result = statistics.getCalculationSteps(input);
    res.json(result);
  } catch (err) {
    console.error("Calculation error:", err);
    res.status(500).json({ error: "計算中にエラーが発生しました。" });
  }
});

/**
 * GET /tools/api/critical-values
 * Get critical value for a given distribution and parameters.
 */
router.get("/api/critical-values", (req, res) => {
  try {
    const { distribution, df, df1, df2, alpha, tail } = req.query;
    const params = {
      alpha: parseFloat(alpha),
      tail: tail || "two",
      df: df ? parseFloat(df) : undefined,
      df1: df1 ? parseFloat(df1) : undefined,
      df2: df2 ? parseFloat(df2) : undefined
    };
    const result = statistics.getCriticalValue(distribution, params);
    res.json(result);
  } catch (err) {
    console.error("Critical value error:", err);
    res.status(400).json({ error: "無効なパラメータです。" });
  }
});

/**
 * GET /tools/api/contents/templates
 * Return text templates for UI.
 */
router.get("/api/contents/templates", (req, res) => {
  try {
    const templates = require(path.join(__dirname, "..", "data", "contents_templates.json"));
    res.json(templates);
  } catch (err) {
    console.error("Template load error:", err);
    res.status(500).json({ error: "テンプレートの読み込みに失敗しました。" });
  }
});

module.exports = router;
