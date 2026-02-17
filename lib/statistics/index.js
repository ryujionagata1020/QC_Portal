/**
 * Statistics library — public API.
 */

"use strict";

const { runTest, validateInputs, getCalculationSteps } = require("./tests");
const { getCriticalValue, getTableSubset } = require("./critical-values");

module.exports = {
  runTest,
  validateInputs,
  getCalculationSteps,
  getCriticalValue,
  getTableSubset
};
