/**
 * Main orchestrator for the control chart simulator.
 * Handles tab switching, mode switching, and event wiring.
 */
(function () {
  "use strict";

  var currentMode = "beginner"; // "beginner" or "expert"
  var feedbackTimer = null;

  document.addEventListener("DOMContentLoaded", function () {
    initTabs();
    initModeToggle();
    initGradeSelect();
    initBeginnerMode();
    initExpertMode();
    restoreSettings();
    initResizeHandler();
  });

  function initResizeHandler() {
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        CCChart.resizeAll();
      }, 150);
    });
  }

  /* -------------------------------------------------------
   * Tab switching (tools-level tabs)
   * ------------------------------------------------------- */

  function initTabs() {
    var tabs = document.querySelectorAll(".tools-tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = this.dataset.tab;
        switchTab(target);
        try { localStorage.setItem("tools_active_tab", target); } catch (e) { /* ignore */ }
      });
    });

    // Restore saved tab
    try {
      var savedTab = localStorage.getItem("tools_active_tab");
      if (savedTab) switchTab(savedTab);
    } catch (e) { /* ignore */ }
  }

  function switchTab(target) {
    document.querySelectorAll(".tools-tab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.tab === target);
    });
    document.querySelectorAll(".tools-tab-panel").forEach(function (p) {
      p.classList.toggle("active", p.dataset.tab === target);
    });

    // Pause expert mode when leaving cc tab
    if (target !== "cc") {
      CCExpert.pause();
    } else {
      CCExpert.resume();
    }

    // Distribution map lifecycle
    if (target === "dm") {
      if (typeof DMMap !== "undefined") DMMap.resize();
    } else {
      if (typeof DMAnim !== "undefined") DMAnim.stop();
    }
  }

  /* -------------------------------------------------------
   * Mode toggle (beginner / expert)
   * ------------------------------------------------------- */

  function initModeToggle() {
    var btns = document.querySelectorAll(".cc-mode-btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = this.dataset.mode;
        switchMode(mode);
        try { localStorage.setItem("cc_mode", mode); } catch (e) { /* ignore */ }
      });
    });
  }

  function switchMode(mode) {
    currentMode = mode;

    document.querySelectorAll(".cc-mode-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.mode === mode);
    });

    var beginnerPanel = document.getElementById("ccBeginnerPanel");
    var expertPanel = document.getElementById("ccExpertPanel");

    if (mode === "beginner") {
      beginnerPanel.classList.add("active");
      expertPanel.classList.remove("active");
      CCExpert.stop();
    } else {
      beginnerPanel.classList.remove("active");
      expertPanel.classList.add("active");
    }
  }

  /* -------------------------------------------------------
   * Grade selection
   * ------------------------------------------------------- */

  function initGradeSelect() {
    var select = document.getElementById("cc-grade");
    if (!select) return;
    select.addEventListener("change", function () {
      var grade = parseInt(this.value, 10);
      CCBeginner.setGrade(grade);
      CCExpert.setGrade(grade);
      updateRuleGrid(grade);
      try { localStorage.setItem("cc_grade", String(grade)); } catch (e) { /* ignore */ }
    });
  }

  /* -------------------------------------------------------
   * Beginner mode wiring
   * ------------------------------------------------------- */

  function initBeginnerMode() {
    CCBeginner.init({
      canvasId: "ccBeginnerCanvas",
      grade: getGrade(),
      onStateChange: handleBeginnerStateChange,
      onStatsUpdate: updateBeginnerStats,
      onFeedback: showBeginnerFeedback
    });

    // Start button
    var startBtn = document.getElementById("ccBtnStart");
    if (startBtn) {
      startBtn.addEventListener("click", function () {
        CCBeginner.startNewQuestion();
      });
    }

    // Normal / Abnormal buttons
    document.getElementById("ccBtnNormal").addEventListener("click", function () {
      CCBeginner.submitAnswer("normal");
    });
    document.getElementById("ccBtnAbnormal").addEventListener("click", function () {
      CCBeginner.submitAnswer("abnormal");
    });

    // Hint button
    document.getElementById("ccBtnHint").addEventListener("click", function () {
      var result = CCBeginner.showHint();
      if (result) {
        if (result.level >= result.maxLevel) {
          this.disabled = true;
          if (result.noAnomaly) {
            this.textContent = "ヒント: 正常の可能性が高いです";
          } else {
            this.textContent = "ヒント表示済み";
          }
        } else {
          this.textContent = "ヒント (" + result.level + "/" + result.maxLevel + ")";
        }
      }
    });

    // Next question button
    document.getElementById("ccBtnNext").addEventListener("click", function () {
      CCBeginner.startNewQuestion();
    });

    // Reset stats button
    var resetBtn = document.getElementById("ccBtnResetStats");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        CCBeginner.resetStats();
      });
    }

    // Rule grid (delegate)
    document.getElementById("ccRuleGrid").addEventListener("click", function (e) {
      var btn = e.target.closest(".cc-rule-btn");
      if (!btn) return;
      var ruleNum = parseInt(btn.dataset.rule, 10);
      CCBeginner.submitRule(ruleNum);
    });

    // Initialize rule grid and stats
    updateRuleGrid(getGrade());
    updateBeginnerStats(CCBeginner.getStats());

    // Draw placeholder
    CCChart.init("ccBeginnerCanvas");
    CCChart.drawPlaceholder("ccBeginnerCanvas", "「スタート」を押して問題を始めましょう");
  }

  function handleBeginnerStateChange(phase) {
    var answerRow = document.getElementById("ccAnswerRow");
    var ruleSelect = document.getElementById("ccRuleSelect");
    var feedback = document.getElementById("ccFeedback");
    var startRow = document.getElementById("ccStartRow");
    var hintBtn = document.getElementById("ccBtnHint");

    // Reset hint button
    hintBtn.disabled = false;
    hintBtn.textContent = "ヒント";

    switch (phase) {
      case CCBeginner.STATE.IDLE:
        answerRow.style.display = "none";
        ruleSelect.style.display = "none";
        feedback.style.display = "none";
        if (startRow) startRow.style.display = "flex";
        break;
      case CCBeginner.STATE.SHOWING_CHART:
        answerRow.style.display = "flex";
        ruleSelect.style.display = "none";
        feedback.style.display = "none";
        if (startRow) startRow.style.display = "none";
        break;
      case CCBeginner.STATE.AWAITING_RULE:
        answerRow.style.display = "none";
        ruleSelect.style.display = "block";
        feedback.style.display = "none";
        break;
      case CCBeginner.STATE.SHOWING_FEEDBACK:
        answerRow.style.display = "none";
        ruleSelect.style.display = "none";
        feedback.style.display = "block";
        break;
    }
  }

  function showBeginnerFeedback(fb) {
    var icon = document.getElementById("ccFeedbackIcon");
    var title = document.getElementById("ccFeedbackTitle");
    var msg = document.getElementById("ccFeedbackMsg");
    var detail = document.getElementById("ccFeedbackDetail");
    var card = document.getElementById("ccFeedback");

    card.className = "cc-feedback cc-feedback-" + fb.type;

    switch (fb.type) {
      case "correct":
        icon.textContent = "\u25CB"; // ○
        break;
      case "partial":
        icon.textContent = "\u25B3"; // △
        break;
      case "miss":
        icon.textContent = "\u00D7"; // ×
        break;
      case "false_alarm":
        icon.textContent = "\u00D7"; // ×
        break;
    }

    title.textContent = fb.title;
    msg.textContent = fb.message;
    detail.textContent = fb.detail || "";
    detail.style.display = fb.detail ? "block" : "none";
  }

  function updateBeginnerStats(stats) {
    document.getElementById("ccStatTotal").textContent = stats.total;
    document.getElementById("ccStatCorrect").textContent = stats.correct;
    document.getElementById("ccStatMiss").textContent = stats.miss;
    document.getElementById("ccStatFalse").textContent = stats.falseAlarm;
  }

  function updateRuleGrid(grade) {
    var grid = document.getElementById("ccRuleGrid");
    if (!grid) return;
    var rules = CCNelson.getRulesForGrade(grade);
    var html = "";
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      var info = CCNelson.RULES[r];
      html += '<button type="button" class="cc-rule-btn" data-rule="' + r + '">'
        + '<span class="cc-rule-num">ルール' + r + '</span>'
        + '<span class="cc-rule-text">'
        + '<span class="cc-rule-name">' + escHtml(info.shortName) + '</span>'
        + '<span class="cc-rule-desc">' + escHtml(info.desc) + '</span>'
        + '</span>'
        + '</button>';
    }
    grid.innerHTML = html;
  }

  /* -------------------------------------------------------
   * Expert mode wiring
   * ------------------------------------------------------- */

  function initExpertMode() {
    CCExpert.init({
      canvasId: "ccExpertCanvas",
      grade: getGrade(),
      onStateUpdate: updateExpertUI,
      onFeedback: showExpertFeedback
    });

    // Start button
    document.getElementById("ccBtnStartLine").addEventListener("click", function () {
      CCExpert.start();
      document.getElementById("ccExpertStartRow").style.display = "none";
      document.getElementById("ccExpertRunningRow").style.display = "flex";
    });

    // Pause button
    document.getElementById("ccBtnPauseLine").addEventListener("click", function () {
      CCExpert.pause();
      this.style.display = "none";
      document.getElementById("ccBtnResumeLine").style.display = "inline-flex";
    });

    // Resume button
    document.getElementById("ccBtnResumeLine").addEventListener("click", function () {
      CCExpert.resume();
      this.style.display = "none";
      document.getElementById("ccBtnPauseLine").style.display = "inline-flex";
    });

    // Stop / Reset button
    document.getElementById("ccBtnStopLine").addEventListener("click", function () {
      CCExpert.stop();
      document.getElementById("ccExpertRunningRow").style.display = "none";
      document.getElementById("ccExpertStartRow").style.display = "flex";
      // Reset pause/resume visibility
      document.getElementById("ccBtnPauseLine").style.display = "inline-flex";
      document.getElementById("ccBtnResumeLine").style.display = "none";
      CCChart.drawPlaceholder("ccExpertCanvas", "「ライン開始」を押してスタート");
    });

    // Alert button
    document.getElementById("ccBtnAlert").addEventListener("click", function () {
      CCExpert.reportAnomaly();
    });

    // Draw placeholder
    CCChart.init("ccExpertCanvas");
    CCChart.drawPlaceholder("ccExpertCanvas", "「ライン開始」を押してスタート");
  }

  function updateExpertUI(st) {
    document.getElementById("ccGameTime").textContent = CCExpert.formatTime(st.elapsed);
    document.getElementById("ccGameDataCount").textContent = st.dataCount;
  }

  function showExpertFeedback(fb) {
    var el = document.getElementById("ccExpertFeedback");
    if (!el) return;

    el.className = "cc-expert-feedback cc-expert-feedback-" + fb.type;
    el.innerHTML = '<span class="cc-expert-feedback-msg">' + escHtml(fb.message) + '</span>';
    el.style.display = "block";

    // Auto-hide after 2 seconds
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(function () {
      el.style.display = "none";
    }, 2000);
  }

  /* -------------------------------------------------------
   * Settings persistence
   * ------------------------------------------------------- */

  function restoreSettings() {
    try {
      var mode = localStorage.getItem("cc_mode");
      if (mode) switchMode(mode);

      var grade = localStorage.getItem("cc_grade");
      if (grade) {
        var gradeNum = parseInt(grade, 10);
        document.getElementById("cc-grade").value = String(gradeNum);
        CCBeginner.setGrade(gradeNum);
        CCExpert.setGrade(gradeNum);
        updateRuleGrid(gradeNum);
      }
    } catch (e) { /* ignore */ }
  }

  function getGrade() {
    var select = document.getElementById("cc-grade");
    return select ? parseInt(select.value, 10) : 2;
  }

  /* -------------------------------------------------------
   * Utility
   * ------------------------------------------------------- */

  function escHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
})();
