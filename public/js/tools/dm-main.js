/**
 * Distribution Map — Main orchestrator.
 * Wires up DMMap, DMDetail, DMAnim modules, handles events and localStorage.
 * Supports all 20 distributions (7 discrete + 13 continuous).
 */
(function () {
  "use strict";

  var state = {
    activeNode: null,
    sliderN: 5,
    mapParams: {} // will be populated from DMPdf defaults
  };

  document.addEventListener("DOMContentLoaded", function () {
    initDefaultParams();
    restoreSettings();

    // Initialize modules
    DMMap.init({
      onNodeClick: handleNodeClick,
      onArrowClick: handleArrowClick
    });

    DMDetail.init();
    DMAnim.init();

    // Back button
    var backBtn = document.getElementById("dmBtnBack");
    if (backBtn) {
      backBtn.addEventListener("click", showMap);
    }

    // Slider
    var slider = document.getElementById("dmSliderN");
    if (slider) {
      slider.value = state.sliderN;
      document.getElementById("dmSliderValue").textContent = state.sliderN;
      slider.addEventListener("input", handleSliderInput);
    }

    // Animation overlay controls
    var closeBtn = document.getElementById("dmBtnCloseAnim");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeAnimation);
    }

    var replayBtn = document.getElementById("dmBtnReplay");
    if (replayBtn) {
      replayBtn.addEventListener("click", function () {
        DMAnim.replay();
      });
    }

    var stepBtn = document.getElementById("dmBtnStep");
    if (stepBtn) {
      stepBtn.addEventListener("click", function () {
        DMAnim.step();
      });
    }

    // Grade filter dropdown
    var gradeSelect = document.getElementById("dmGradeSelect");
    if (gradeSelect) {
      var savedGrade = null;
      try { savedGrade = localStorage.getItem("dm_grade"); } catch (e) { /* ignore */ }
      if (savedGrade && ["all", "3", "2", "1"].indexOf(savedGrade) !== -1) {
        gradeSelect.value = savedGrade;
      }
      DMMap.setGrade(gradeSelect.value);
      gradeSelect.addEventListener("change", handleGradeChange);
    }

    // Close animation overlay on Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        var overlay = document.getElementById("dmAnimOverlay");
        if (overlay && overlay.style.display !== "none") {
          closeAnimation();
        }
      }
    });
  });

  /* -------------------------------------------------------
   * Initialize default params from DMPdf metadata
   * ------------------------------------------------------- */

  function initDefaultParams() {
    var meta = DMPdf.DIST_META;
    for (var key in meta) {
      state.mapParams[key] = Object.assign({}, meta[key].defaultParams);
    }
  }

  /* -------------------------------------------------------
   * Node click — show detail panel
   * ------------------------------------------------------- */

  function handleNodeClick(nodeKey) {
    state.activeNode = nodeKey;

    // Update slider value if applicable
    if (nodeKey === "t" || nodeKey === "chi2") {
      var df = (state.mapParams[nodeKey] && state.mapParams[nodeKey].df) || 5;
      state.sliderN = df;
      var slider = document.getElementById("dmSliderN");
      if (slider) slider.value = df;
      var valEl = document.getElementById("dmSliderValue");
      if (valEl) valEl.textContent = df;
    }

    // Hide map, show detail
    var mapArea = document.getElementById("dmMapArea");
    var legendBar = document.querySelector(".dm-legend-bar");
    var detailPanel = document.getElementById("dmDetailPanel");

    if (mapArea) mapArea.style.display = "none";
    if (legendBar) legendBar.style.display = "none";
    if (detailPanel) detailPanel.style.display = "block";

    DMDetail.show(nodeKey, state.mapParams[nodeKey]);
    saveSettings();
  }

  /* -------------------------------------------------------
   * Arrow click — show animation overlay
   * ------------------------------------------------------- */

  function handleArrowClick(arrow) {
    var overlay = document.getElementById("dmAnimOverlay");
    var titleEl = document.getElementById("dmAnimTitle");

    if (!overlay) return;

    // Get animation title from the arrow's animation definition
    if (titleEl) titleEl.textContent = arrow.label || "";

    overlay.style.display = "flex";
    DMAnim.play(arrow.id);
  }

  function closeAnimation() {
    DMAnim.stop();
    var overlay = document.getElementById("dmAnimOverlay");
    if (overlay) overlay.style.display = "none";
  }

  /* -------------------------------------------------------
   * Back to map
   * ------------------------------------------------------- */

  function showMap() {
    state.activeNode = null;

    var mapArea = document.getElementById("dmMapArea");
    var legendBar = document.querySelector(".dm-legend-bar");
    var detailPanel = document.getElementById("dmDetailPanel");

    if (mapArea) mapArea.style.display = "block";
    if (legendBar) legendBar.style.display = "flex";
    if (detailPanel) detailPanel.style.display = "none";

    DMDetail.hide();
    DMMap.resize();
    saveSettings();
  }

  /* -------------------------------------------------------
   * Slider input
   * ------------------------------------------------------- */

  function handleSliderInput() {
    var n = parseInt(document.getElementById("dmSliderN").value, 10);
    state.sliderN = n;
    document.getElementById("dmSliderValue").textContent = n;

    if (state.activeNode === "t") {
      if (!state.mapParams.t) state.mapParams.t = {};
      state.mapParams.t.df = n;
      DMDetail.updateDf(n);
    } else if (state.activeNode === "chi2") {
      if (!state.mapParams.chi2) state.mapParams.chi2 = {};
      state.mapParams.chi2.df = n;
      DMDetail.updateDf(n);
    }

    saveSettings();
  }

  /* -------------------------------------------------------
   * Grade filter
   * ------------------------------------------------------- */

  function handleGradeChange() {
    var grade = document.getElementById("dmGradeSelect").value;
    DMMap.setGrade(grade);
    try { localStorage.setItem("dm_grade", grade); } catch (e) { /* ignore */ }
  }

  /* -------------------------------------------------------
   * Settings persistence
   * ------------------------------------------------------- */

  function saveSettings() {
    try {
      localStorage.setItem("dm_slider_n", String(state.sliderN));
      localStorage.setItem("dm_last_node", state.activeNode || "");
      localStorage.setItem("dm_params", JSON.stringify(state.mapParams));
    } catch (e) { /* ignore */ }
  }

  function restoreSettings() {
    try {
      var n = localStorage.getItem("dm_slider_n");
      if (n) state.sliderN = parseInt(n, 10) || 5;

      var params = localStorage.getItem("dm_params");
      if (params) {
        var parsed = JSON.parse(params);
        if (parsed && typeof parsed === "object") {
          for (var key in parsed) {
            if (state.mapParams[key]) {
              Object.assign(state.mapParams[key], parsed[key]);
            }
          }
        }
      }

      // Sync slider df with params
      if (state.mapParams.t && state.mapParams.t.df) {
        state.sliderN = state.mapParams.t.df;
      }
    } catch (e) { /* ignore */ }
  }
})();
