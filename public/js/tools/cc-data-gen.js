/**
 * Data generation module for control chart simulator.
 * Uses Box-Muller transform for normal distribution random numbers.
 * Provides anomaly injection for both beginner and expert modes.
 */
var CCDataGen = (function () {
  "use strict";

  /**
   * Box-Muller transform: generates a normally distributed random number.
   * @param {number} mu - Mean
   * @param {number} sigma - Standard deviation
   * @returns {number}
   */
  function boxMuller(mu, sigma) {
    var u1 = Math.random();
    var u2 = Math.random();
    if (u1 === 0) u1 = 1e-10;
    var z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * sigma + mu;
  }

  /**
   * Generate a series of normally distributed data points.
   * @param {number} count - Number of points
   * @param {number} mu - Mean
   * @param {number} sigma - Standard deviation
   * @returns {number[]}
   */
  function generateSeries(count, mu, sigma) {
    var data = [];
    for (var i = 0; i < count; i++) {
      data.push(boxMuller(mu, sigma));
    }
    return data;
  }

  /**
   * Inject an anomaly into existing data for a specific Nelson rule.
   * Returns the modified data and the indices of anomaly points.
   * @param {number[]} data - Existing data array (will be modified in place)
   * @param {number} ruleNumber - Which Nelson rule to trigger (1-8)
   * @param {object} config - { mean, sigma }
   * @returns {{ rule: number, indices: number[] }}
   */
  function injectAnomaly(data, ruleNumber, config) {
    var mean = config.mean;
    var sigma = config.sigma;
    var indices = [];
    var startIdx, i, direction;

    switch (ruleNumber) {
      case 1: // 1 point beyond 3-sigma
        startIdx = 10 + Math.floor(Math.random() * (data.length - 15));
        direction = Math.random() > 0.5 ? 1 : -1;
        data[startIdx] = mean + direction * (3.2 + Math.random() * 0.8) * sigma;
        indices = [startIdx];
        break;

      case 2: // 9 consecutive points same side of CL
        startIdx = 5 + Math.floor(Math.random() * Math.max(1, data.length - 18));
        direction = Math.random() > 0.5 ? 1 : -1;
        for (i = 0; i < 9; i++) {
          var idx = startIdx + i;
          if (idx < data.length) {
            data[idx] = mean + direction * (0.3 + Math.random() * 0.7) * sigma;
            indices.push(idx);
          }
        }
        break;

      case 3: // 6 consecutive points trending up or down
        startIdx = 5 + Math.floor(Math.random() * Math.max(1, data.length - 15));
        direction = Math.random() > 0.5 ? 1 : -1;
        var baseVal = mean - direction * 1.5 * sigma;
        for (i = 0; i < 6; i++) {
          var tIdx = startIdx + i;
          if (tIdx < data.length) {
            baseVal += direction * (0.3 + Math.random() * 0.3) * sigma;
            data[tIdx] = baseVal;
            indices.push(tIdx);
          }
        }
        break;

      case 4: // 14 alternating points (zigzag)
        startIdx = 3 + Math.floor(Math.random() * Math.max(1, data.length - 20));
        var prevVal = data[startIdx] || mean;
        for (i = 0; i < 14; i++) {
          var aIdx = startIdx + i;
          if (aIdx < data.length) {
            var offset = (0.5 + Math.random() * 1.0) * sigma;
            if (i % 2 === 0) {
              data[aIdx] = prevVal + offset;
            } else {
              data[aIdx] = prevVal - offset;
            }
            prevVal = data[aIdx];
            indices.push(aIdx);
          }
        }
        break;

      case 5: // 2 of 3 consecutive points beyond 2-sigma (same side)
        startIdx = 8 + Math.floor(Math.random() * Math.max(1, data.length - 14));
        direction = Math.random() > 0.5 ? 1 : -1;
        // Set 2 of 3 points beyond 2-sigma
        data[startIdx] = mean + direction * (2.2 + Math.random() * 0.5) * sigma;
        data[startIdx + 1] = mean + direction * (0.2 + Math.random() * 0.5) * sigma; // normal
        data[startIdx + 2] = mean + direction * (2.3 + Math.random() * 0.5) * sigma;
        indices = [startIdx, startIdx + 1, startIdx + 2];
        break;

      case 6: // 4 of 5 consecutive points beyond 1-sigma (same side)
        startIdx = 8 + Math.floor(Math.random() * Math.max(1, data.length - 14));
        direction = Math.random() > 0.5 ? 1 : -1;
        for (i = 0; i < 5; i++) {
          var sIdx = startIdx + i;
          if (sIdx < data.length) {
            if (i === 2) {
              // 1 point within 1-sigma
              data[sIdx] = mean + direction * (0.2 + Math.random() * 0.5) * sigma;
            } else {
              // 4 points beyond 1-sigma
              data[sIdx] = mean + direction * (1.2 + Math.random() * 0.8) * sigma;
            }
            indices.push(sIdx);
          }
        }
        break;

      case 7: // 15 consecutive points within 1-sigma (both sides)
        startIdx = 3 + Math.floor(Math.random() * Math.max(1, data.length - 20));
        for (i = 0; i < 15; i++) {
          var lIdx = startIdx + i;
          if (lIdx < data.length) {
            data[lIdx] = mean + (Math.random() - 0.5) * 1.6 * sigma * 0.5;
            indices.push(lIdx);
          }
        }
        break;

      case 8: // 8 consecutive points outside 1-sigma (both sides of CL)
        startIdx = 5 + Math.floor(Math.random() * Math.max(1, data.length - 16));
        for (i = 0; i < 8; i++) {
          var dIdx = startIdx + i;
          if (dIdx < data.length) {
            var side = (i % 2 === 0) ? 1 : -1;
            data[dIdx] = mean + side * (1.2 + Math.random() * 0.8) * sigma;
            indices.push(dIdx);
          }
        }
        break;
    }

    return { rule: ruleNumber, indices: indices };
  }

  /**
   * Pick a random rule from the enabled set and inject an anomaly.
   * @param {number[]} data
   * @param {number[]} enabledRules - Array of rule numbers (e.g. [1,2,3])
   * @param {object} config - { mean, sigma }
   * @returns {{ rule: number, indices: number[] }}
   */
  function injectRandomAnomaly(data, enabledRules, config) {
    var rule = enabledRules[Math.floor(Math.random() * enabledRules.length)];
    return injectAnomaly(data, rule, config);
  }

  /**
   * Create an anomaly generator function for expert mode (real-time).
   * Returns a function that generates one data point per call.
   * @param {number} rule - Nelson rule number
   * @param {number} mu - Normal mean
   * @param {number} sigma - Normal sigma
   * @returns {function(): number}
   */
  function createAnomalyGenerator(rule, mu, sigma) {
    var callCount = 0;
    var direction = Math.random() > 0.5 ? 1 : -1;

    switch (rule) {
      case 1: // Spike beyond 3-sigma on first call, then normal
        return function () {
          callCount++;
          if (callCount === 1) {
            return mu + direction * (3.5 + Math.random() * 0.5) * sigma;
          }
          return boxMuller(mu, sigma);
        };

      case 2: // Shift mean to one side
        var shiftedMu = mu + direction * 1.2 * sigma;
        return function () {
          return boxMuller(shiftedMu, sigma * 0.5);
        };

      case 3: // Trend
        var step = direction * 0.35 * sigma;
        var base = mu - direction * 1.0 * sigma;
        return function () {
          callCount++;
          return base + step * callCount + (Math.random() - 0.5) * 0.2 * sigma;
        };

      case 4: // Alternating zigzag
        var center = mu;
        return function () {
          callCount++;
          var amp = (0.8 + Math.random() * 0.5) * sigma;
          return center + (callCount % 2 === 0 ? 1 : -1) * amp;
        };

      case 5: // Points near 2-sigma zone
        return function () {
          callCount++;
          if (callCount % 3 !== 2) {
            return mu + direction * (2.1 + Math.random() * 0.5) * sigma;
          }
          return boxMuller(mu, sigma);
        };

      case 6: // Points near 1-sigma zone
        return function () {
          callCount++;
          if (callCount % 5 !== 3) {
            return mu + direction * (1.2 + Math.random() * 0.6) * sigma;
          }
          return boxMuller(mu, sigma * 0.5);
        };

      case 7: // Cluster near center
        return function () {
          return mu + (Math.random() - 0.5) * 0.8 * sigma;
        };

      case 8: // Bimodal outside 1-sigma
        return function () {
          callCount++;
          var side = callCount % 2 === 0 ? 1 : -1;
          return mu + side * (1.3 + Math.random() * 0.7) * sigma;
        };

      default:
        return function () { return boxMuller(mu, sigma); };
    }
  }

  return {
    boxMuller: boxMuller,
    generateSeries: generateSeries,
    injectAnomaly: injectAnomaly,
    injectRandomAnomaly: injectRandomAnomaly,
    createAnomalyGenerator: createAnomalyGenerator
  };
})();
