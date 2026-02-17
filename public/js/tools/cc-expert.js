/**
 * Expert mode for control chart simulator.
 * Auto-generates data points every 1s, injects anomalies.
 * User can pause/resume the line and report anomalies.
 */
var CCExpert = (function () {
  "use strict";

  var TICK_MS = 1000;
  var DETECT_WINDOW = 10;     // Data points of grace before miss
  var INITIAL_NORMAL = 20;    // Normal points before first anomaly
  var DISPLAY_WINDOW = 50;    // Show last N points on chart
  var ANOMALY_MIN_GAP = 10;   // Min points between anomalies
  var ANOMALY_MAX_GAP = 30;   // Max points between anomalies

  var state = {
    data: [],
    mean: 50,
    sigma: 5,
    isRunning: false,
    isPaused: false,
    tickTimer: null,
    elapsed: 0,
    grade: 2,

    // Anomaly tracking
    anomalyActive: false,
    anomalyDetected: false,
    anomalyRule: null,
    anomalyStartIndex: null,
    anomalyGenerator: null,
    nextAnomalyCountdown: 0,
    anomalyDuration: 0,
    anomalyMaxDuration: 0
  };

  var canvasId = null;
  var callbacks = {
    onStateUpdate: null,
    onFeedback: null
  };

  /**
   * Initialize expert mode.
   * @param {object} config - { canvasId, grade, onStateUpdate, onFeedback }
   */
  function init(config) {
    canvasId = config.canvasId;
    state.grade = config.grade || 2;
    callbacks.onStateUpdate = config.onStateUpdate || null;
    callbacks.onFeedback = config.onFeedback || null;

    CCChart.init(canvasId);
  }

  /**
   * Set grade level.
   * @param {number} grade
   */
  function setGrade(grade) {
    state.grade = grade;
  }

  /**
   * Start the line (begin generating data).
   */
  function start() {
    stop();

    state.data = [];
    state.elapsed = 0;
    state.isRunning = true;
    state.isPaused = false;
    state.anomalyActive = false;
    state.anomalyDetected = false;
    state.anomalyRule = null;
    state.anomalyGenerator = null;

    // Schedule first anomaly after initial normal period
    state.nextAnomalyCountdown = INITIAL_NORMAL;

    notifyState();
    state.tickTimer = setInterval(tick, TICK_MS);
  }

  /**
   * Stop the line completely.
   */
  function stop() {
    state.isRunning = false;
    if (state.tickTimer) {
      clearInterval(state.tickTimer);
      state.tickTimer = null;
    }
  }

  /**
   * Pause (stop ticking but keep state).
   */
  function pause() {
    if (!state.isRunning || state.isPaused) return;
    state.isPaused = true;
    if (state.tickTimer) {
      clearInterval(state.tickTimer);
      state.tickTimer = null;
    }
    notifyState();
  }

  /**
   * Resume after pause.
   */
  function resume() {
    if (!state.isRunning || !state.isPaused) return;
    state.isPaused = false;
    state.tickTimer = setInterval(tick, TICK_MS);
    notifyState();
  }

  /**
   * Main tick (called every TICK_MS).
   */
  function tick() {
    if (!state.isRunning || state.isPaused) return;

    state.elapsed += TICK_MS;

    // Generate next point
    var point;
    if (state.anomalyActive && state.anomalyGenerator) {
      point = state.anomalyGenerator();
      state.anomalyDuration++;
    } else {
      point = CCDataGen.boxMuller(state.mean, state.sigma);
    }
    state.data.push(point);

    // Check if it's time to start an anomaly
    if (!state.anomalyActive) {
      state.nextAnomalyCountdown--;
      if (state.nextAnomalyCountdown <= 0) {
        beginAnomaly();
      }
    }

    // Check for missed anomaly
    if (state.anomalyActive && !state.anomalyDetected) {
      var enabledRules = CCNelson.getRulesForGrade(state.grade);
      var displayData = getDisplayData();
      var violations = CCNelson.checkAll(displayData, state.mean, state.sigma, enabledRules);
      var hasDetectable = violations.length > 0;

      if (hasDetectable && state.anomalyDuration >= DETECT_WINDOW) {
        // Missed it
        handleMiss();
      } else if (state.anomalyDuration >= state.anomalyMaxDuration) {
        // Anomaly period ended, reset
        endAnomaly();
      }
    }

    // Draw chart
    var displayData = getDisplayData();
    CCChart.draw(canvasId, displayData, {
      mean: state.mean,
      sigma: state.sigma,
      showZoneLines: true,
      highlightIndices: []
    });

    notifyState();
  }

  /**
   * User reports an anomaly by pressing the button.
   */
  function reportAnomaly() {
    if (!state.isRunning || state.isPaused) return;

    if (state.anomalyActive && !state.anomalyDetected) {
      var enabledRules = CCNelson.getRulesForGrade(state.grade);
      var displayData = getDisplayData();
      var violations = CCNelson.checkAll(displayData, state.mean, state.sigma, enabledRules);

      if (violations.length > 0) {
        // Correct detection
        state.anomalyDetected = true;
        var ruleName = violations[0].name;
        showFlashFeedback({
          type: "correct",
          message: "正解！" + ruleName
        });
        endAnomaly();
        scheduleNextAnomaly();
      } else {
        // Too early - treat as false alarm
        handleFalseAlarm();
      }
    } else {
      // False alarm
      handleFalseAlarm();
    }

    notifyState();
  }

  // --- Internal helpers ---

  function beginAnomaly() {
    var enabledRules = CCNelson.getRulesForGrade(state.grade);
    var rule = enabledRules[Math.floor(Math.random() * enabledRules.length)];

    state.anomalyActive = true;
    state.anomalyDetected = false;
    state.anomalyRule = rule;
    state.anomalyStartIndex = state.data.length;
    state.anomalyDuration = 0;
    state.anomalyGenerator = CCDataGen.createAnomalyGenerator(rule, state.mean, state.sigma);

    var ruleInfo = CCNelson.RULES[rule];
    state.anomalyMaxDuration = (ruleInfo ? ruleInfo.minPoints : 10) + DETECT_WINDOW + 5;
  }

  function endAnomaly() {
    state.anomalyActive = false;
    state.anomalyDetected = false;
    state.anomalyRule = null;
    state.anomalyGenerator = null;
    state.anomalyDuration = 0;
  }

  function scheduleNextAnomaly() {
    state.nextAnomalyCountdown = ANOMALY_MIN_GAP + Math.floor(Math.random() * (ANOMALY_MAX_GAP - ANOMALY_MIN_GAP));
  }

  function handleMiss() {
    var ruleName = CCNelson.getRuleName(state.anomalyRule) || "異常";
    showFlashFeedback({
      type: "miss",
      message: "見逃し！" + ruleName
    });
    endAnomaly();
    scheduleNextAnomaly();
  }

  function handleFalseAlarm() {
    showFlashFeedback({
      type: "false_alarm",
      message: "空振り！異常はありません"
    });
  }

  function getDisplayData() {
    if (state.data.length <= DISPLAY_WINDOW) return state.data.slice();
    return state.data.slice(-DISPLAY_WINDOW);
  }

  function showFlashFeedback(feedback) {
    if (callbacks.onFeedback) callbacks.onFeedback(feedback);
  }

  function notifyState() {
    if (callbacks.onStateUpdate) {
      callbacks.onStateUpdate({
        elapsed: state.elapsed,
        isRunning: state.isRunning,
        isPaused: state.isPaused,
        dataCount: state.data.length
      });
    }
  }

  function formatTime(ms) {
    var totalSec = Math.floor(ms / 1000);
    var min = Math.floor(totalSec / 60);
    var sec = totalSec % 60;
    return min + ":" + (sec < 10 ? "0" : "") + sec;
  }

  return {
    init: init,
    setGrade: setGrade,
    start: start,
    stop: stop,
    pause: pause,
    resume: resume,
    reportAnomaly: reportAnomaly,
    formatTime: formatTime
  };
})();
