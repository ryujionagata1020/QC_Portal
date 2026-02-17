/**
 * Beginner mode orchestrator for control chart simulator.
 * Manages the quiz flow: question generation, answer evaluation,
 * hint system, and feedback display.
 */
var CCBeginner = (function () {
  "use strict";

  // State machine states
  var STATE = {
    IDLE: "idle",
    SHOWING_CHART: "showing_chart",
    AWAITING_RULE: "awaiting_rule",
    SHOWING_FEEDBACK: "showing_feedback"
  };

  var state = {
    phase: STATE.IDLE,
    currentData: [],
    mean: 50,
    sigma: 5,
    hasAnomaly: false,
    anomalyRule: null,
    anomalyIndices: [],
    hintLevel: 0,
    grade: 2,
    stats: {
      total: 0,
      correct: 0,
      miss: 0,
      falseAlarm: 0
    }
  };

  var canvasId = null;
  var callbacks = {
    onStateChange: null,
    onStatsUpdate: null,
    onFeedback: null
  };

  /**
   * Initialize beginner mode.
   * @param {object} config - { canvasId, grade, onStateChange, onStatsUpdate, onFeedback }
   */
  function init(config) {
    canvasId = config.canvasId;
    state.grade = config.grade || 2;
    callbacks.onStateChange = config.onStateChange || null;
    callbacks.onStatsUpdate = config.onStatsUpdate || null;
    callbacks.onFeedback = config.onFeedback || null;

    CCChart.init(canvasId);
    restoreStats();
  }

  /**
   * Set the grade (changes enabled rules).
   * @param {number} grade - 1, 2, or 3
   */
  function setGrade(grade) {
    state.grade = grade;
  }

  /**
   * Start a new question.
   */
  function startNewQuestion() {
    var numPoints = 25 + Math.floor(Math.random() * 6); // 25-30 points
    var enabledRules = CCNelson.getRulesForGrade(state.grade);

    // Ensure enough data points for the rule
    var maxRequired = 0;
    for (var i = 0; i < enabledRules.length; i++) {
      var r = CCNelson.RULES[enabledRules[i]];
      if (r && r.minPoints > maxRequired) maxRequired = r.minPoints;
    }
    if (numPoints < maxRequired + 8) numPoints = maxRequired + 8;

    // Generate base normal data
    state.currentData = CCDataGen.generateSeries(numPoints, state.mean, state.sigma);

    // 50/50 anomaly vs normal
    state.hasAnomaly = Math.random() < 0.5;
    state.anomalyRule = null;
    state.anomalyIndices = [];
    state.hintLevel = 0;

    if (state.hasAnomaly) {
      var result = CCDataGen.injectRandomAnomaly(state.currentData, enabledRules, {
        mean: state.mean,
        sigma: state.sigma
      });
      state.anomalyRule = result.rule;
      state.anomalyIndices = result.indices;

      // Verify the anomaly is actually detectable by the engine
      var violations = CCNelson.checkAll(state.currentData, state.mean, state.sigma, [result.rule]);
      if (violations.length === 0) {
        // Re-inject if detection failed (retry once)
        result = CCDataGen.injectAnomaly(state.currentData, result.rule, {
          mean: state.mean,
          sigma: state.sigma
        });
        state.anomalyIndices = result.indices;
      }
    }

    state.phase = STATE.SHOWING_CHART;
    notifyStateChange();

    // Draw chart without zone lines initially
    CCChart.draw(canvasId, state.currentData, {
      mean: state.mean,
      sigma: state.sigma,
      showZoneLines: false,
      highlightIndices: []
    });
  }

  /**
   * User submits answer: "normal" or "abnormal".
   * @param {string} answer - "normal" or "abnormal"
   */
  function submitAnswer(answer) {
    if (state.phase !== STATE.SHOWING_CHART) return;

    if (answer === "abnormal") {
      if (state.hasAnomaly) {
        // Correct detection - now ask which rule
        state.phase = STATE.AWAITING_RULE;
        notifyStateChange();
      } else {
        // False alarm (Type I error)
        state.stats.total++;
        state.stats.falseAlarm++;
        state.phase = STATE.SHOWING_FEEDBACK;
        notifyStateChange();
        showFeedbackResult({
          type: "false_alarm",
          title: "空振り（第一種の過誤）",
          message: "この管理図は正常です。正常な変動を異常と誤判定しました。",
          detail: "正常なプロセスでも、ランダムなばらつきにより異常に見えるパターンが生じることがあります。"
        });
      }
    } else {
      // Answered "normal"
      if (state.hasAnomaly) {
        // Miss (Type II error)
        state.stats.total++;
        state.stats.miss++;
        state.phase = STATE.SHOWING_FEEDBACK;
        notifyStateChange();
        showFeedbackResult({
          type: "miss",
          title: "見逃し（第二種の過誤）",
          message: CCNelson.getRuleName(state.anomalyRule) + " に該当する異常がありました。",
          detail: CCNelson.getRuleDetail(state.anomalyRule)
        });
        // Highlight anomaly points
        CCChart.draw(canvasId, state.currentData, {
          mean: state.mean,
          sigma: state.sigma,
          showZoneLines: true,
          highlightIndices: state.anomalyIndices
        });
      } else {
        // Correct: chart is indeed normal
        state.stats.total++;
        state.stats.correct++;
        state.phase = STATE.SHOWING_FEEDBACK;
        notifyStateChange();
        showFeedbackResult({
          type: "correct",
          title: "正解！",
          message: "この管理図は正常です。工程は管理状態にあります。",
          detail: ""
        });
      }
    }
    saveStats();
  }

  /**
   * User selects which Nelson rule they think applies.
   * @param {number} ruleNumber
   */
  function submitRule(ruleNumber) {
    if (state.phase !== STATE.AWAITING_RULE) return;

    state.stats.total++;
    state.phase = STATE.SHOWING_FEEDBACK;
    notifyStateChange();

    if (ruleNumber === state.anomalyRule) {
      // Correct rule
      state.stats.correct++;
      showFeedbackResult({
        type: "correct",
        title: "正解！",
        message: CCNelson.getRuleName(state.anomalyRule) + " を正しく特定しました。",
        detail: CCNelson.getRuleDetail(state.anomalyRule)
      });
    } else {
      // Wrong rule but detected anomaly
      state.stats.correct++; // Still count as partially correct (detected anomaly)
      showFeedbackResult({
        type: "partial",
        title: "異常の検出は正しいですが...",
        message: "適用ルールが異なります。正解は " + CCNelson.getRuleName(state.anomalyRule) + " です。",
        detail: CCNelson.getRuleDescription(state.anomalyRule) + "\n" + CCNelson.getRuleDetail(state.anomalyRule)
      });
    }

    // Show anomaly highlights
    CCChart.draw(canvasId, state.currentData, {
      mean: state.mean,
      sigma: state.sigma,
      showZoneLines: true,
      highlightIndices: state.anomalyIndices
    });
    saveStats();
  }

  /**
   * Show hint (progressive).
   * Level 1: show zone lines
   * Level 2: highlight suspicious region
   */
  function showHint() {
    if (state.phase !== STATE.SHOWING_CHART) return;

    state.hintLevel++;

    if (state.hintLevel === 1) {
      // Show zone lines
      CCChart.draw(canvasId, state.currentData, {
        mean: state.mean,
        sigma: state.sigma,
        showZoneLines: true,
        highlightIndices: []
      });
      return { level: 1, maxLevel: 2 };
    } else if (state.hintLevel >= 2) {
      // Highlight suspicious region
      var config = {
        mean: state.mean,
        sigma: state.sigma,
        showZoneLines: true,
        highlightIndices: []
      };

      if (state.hasAnomaly && state.anomalyIndices.length > 0) {
        var minIdx = state.anomalyIndices[0];
        var maxIdx = state.anomalyIndices[state.anomalyIndices.length - 1];
        config.highlightRegionStart = Math.max(0, minIdx - 1);
        config.highlightRegionEnd = Math.min(state.currentData.length - 1, maxIdx + 1);
      }
      CCChart.draw(canvasId, state.currentData, config);
      return { level: 2, maxLevel: 2, noAnomaly: !state.hasAnomaly };
    }

    return { level: state.hintLevel, maxLevel: 2 };
  }

  /**
   * Reset statistics.
   */
  function resetStats() {
    state.stats = { total: 0, correct: 0, miss: 0, falseAlarm: 0 };
    saveStats();
    if (callbacks.onStatsUpdate) callbacks.onStatsUpdate(state.stats);
  }

  function getStats() {
    return Object.assign({}, state.stats);
  }

  function getPhase() {
    return state.phase;
  }

  function getEnabledRules() {
    return CCNelson.getRulesForGrade(state.grade);
  }

  // --- Internal helpers ---

  function showFeedbackResult(feedback) {
    if (callbacks.onFeedback) callbacks.onFeedback(feedback);
    if (callbacks.onStatsUpdate) callbacks.onStatsUpdate(state.stats);
  }

  function notifyStateChange() {
    if (callbacks.onStateChange) callbacks.onStateChange(state.phase);
  }

  function saveStats() {
    try {
      localStorage.setItem("cc_beginner_stats", JSON.stringify(state.stats));
    } catch (e) { /* ignore */ }
  }

  function restoreStats() {
    try {
      var saved = JSON.parse(localStorage.getItem("cc_beginner_stats") || "null");
      if (saved && typeof saved.total === "number") {
        state.stats = saved;
      }
    } catch (e) { /* ignore */ }
  }

  return {
    init: init,
    setGrade: setGrade,
    startNewQuestion: startNewQuestion,
    submitAnswer: submitAnswer,
    submitRule: submitRule,
    showHint: showHint,
    resetStats: resetStats,
    getStats: getStats,
    getPhase: getPhase,
    getEnabledRules: getEnabledRules,
    STATE: STATE
  };
})();
