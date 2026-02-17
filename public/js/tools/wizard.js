/**
 * 3-question wizard for selecting the hypothesis test type.
 * Emits events when a test type is selected.
 */
var SimWizard = (function () {
  "use strict";

  var state = { q1: null, q2: null, q3: null, testType: null };
  var listeners = [];

  /* -------------------------------------------------------
   * Decision tree
   * ------------------------------------------------------- */

  var Q2_OPTIONS = {
    continuous: [
      { value: "one", label: "1群（1標本）", desc: "1つの標本を基準値と比較" },
      { value: "two", label: "2群（2標本）", desc: "2つの標本を比較" },
      { value: "multi", label: "3群以上", desc: "3つ以上の群を比較" }
    ],
    discrete: [
      { value: "one", label: "1群", desc: "1つの比率・度数を検定" },
      { value: "two", label: "2群", desc: "2群の比率を比較、または独立性の検定" }
    ]
  };

  var Q3_OPTIONS = {
    continuous_one: [
      { value: "t_1sample", label: "母平均の検定（t検定）", recommended: true,
        reason: "1つの標本平均を基準値μ₀と比較する場合に使います。" }
    ],
    continuous_two: [
      { value: "t_welch", label: "対応なし（Welchのt検定）", recommended: true,
        reason: "独立な2群の平均を比較します。等分散を仮定しない安全な方法です。",
        alt: "t_equal_var", altLabel: "等分散t検定", altReason: "等分散が確認できている場合はStudentのt検定に切り替え可能（上部トグル）。" },
      { value: "t_paired", label: "対応あり（差の検定）", recommended: false,
        reason: "同じ対象の処理前後の差を検定する場合に使います。" },
      { value: "f_eqvar", label: "分散の比較（F検定）", recommended: false,
        reason: "2群の分散が等しいかを検定します。" }
    ],
    continuous_multi: [
      { value: "anova_oneway", label: "一元配置分散分析（ANOVA）", recommended: true,
        reason: "3群以上の平均の差を総合的に検定します。" }
    ],
    discrete_one: [
      { value: "prop_1", label: "母比率の検定（正規近似）", recommended: true,
        reason: "標本比率が基準値p₀と異なるかを検定します。nが十分大きい場合に適切。" },
      { value: "binom", label: "二項検定（正確法）", recommended: false,
        reason: "小標本やnp₀が小さい場合に適切です。正確法の考え方を提示します。" },
      { value: "poisson", label: "ポアソン率の検定", recommended: false,
        reason: "稀少事象の発生率を検定します。正確法の考え方を提示します。" },
      { value: "chi2_gof", label: "適合度検定（χ²）", recommended: false,
        reason: "観測度数が理論分布に従うかを検定します。3カテゴリ以上の場合に。" }
    ],
    discrete_two: [
      { value: "prop_2", label: "2群の比率差の検定", recommended: true,
        reason: "2群の母比率が等しいかを検定します。" },
      { value: "chi2_indep", label: "独立性の検定（χ²）", recommended: false,
        reason: "2つのカテゴリ変数が独立かを検定します。" }
    ]
  };

  /* -------------------------------------------------------
   * Rendering
   * ------------------------------------------------------- */

  function renderButtons(containerId, options) {
    var container = document.getElementById(containerId);
    container.innerHTML = "";
    options.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sim-wizard-btn";
      btn.dataset.value = opt.value;
      btn.textContent = opt.label;
      if (opt.recommended) btn.classList.add("sim-wizard-recommended");
      if (opt.desc) btn.title = opt.desc;
      container.appendChild(btn);
    });
  }

  function setStepActive(stepNum) {
    var steps = document.querySelectorAll(".sim-wizard-step");
    steps.forEach(function (s) {
      var n = parseInt(s.dataset.step, 10);
      s.classList.toggle("active", n <= stepNum);
      s.classList.toggle("disabled", n > stepNum);
    });
  }

  function highlightSelected(containerId, value) {
    var btns = document.querySelectorAll("#" + containerId + " .sim-wizard-btn");
    btns.forEach(function (b) {
      b.classList.toggle("selected", b.dataset.value === value);
    });
  }

  function showRecommendation(opt) {
    var rec = document.getElementById("simRecommendation");
    var title = document.getElementById("simRecTitle");
    var reason = document.getElementById("simRecReason");
    var alt = document.getElementById("simRecAlt");

    if (!opt) { rec.style.display = "none"; return; }

    rec.style.display = "block";
    title.textContent = (opt.recommended ? "推奨: " : "") + opt.label;
    reason.textContent = opt.reason || "";

    if (opt.alt && opt.altReason) {
      alt.style.display = "block";
      alt.textContent = "代替: " + (opt.altLabel || opt.alt) + " — " + opt.altReason;
    } else {
      alt.style.display = "none";
    }
  }

  /* -------------------------------------------------------
   * Event handling
   * ------------------------------------------------------- */

  function handleQ1(value) {
    state.q1 = value;
    state.q2 = null;
    state.q3 = null;
    state.testType = null;
    highlightSelected("wizardQ1", value);
    renderButtons("wizardQ2", Q2_OPTIONS[value] || []);
    document.getElementById("wizardQ3").innerHTML = "";
    setStepActive(2);
    showRecommendation(null);
    emit(null);
  }

  function handleQ2(value) {
    state.q2 = value;
    state.q3 = null;
    state.testType = null;
    highlightSelected("wizardQ2", value);
    var key = state.q1 + "_" + value;
    renderButtons("wizardQ3", Q3_OPTIONS[key] || []);
    setStepActive(3);
    showRecommendation(null);
    emit(null);
  }

  function handleQ3(value) {
    state.q3 = value;
    state.testType = value;
    highlightSelected("wizardQ3", value);

    // Find the option for recommendation display
    var key = state.q1 + "_" + state.q2;
    var opts = Q3_OPTIONS[key] || [];
    var selected = opts.find(function (o) { return o.value === value; });
    showRecommendation(selected);

    // Show/hide equal-variance toggle
    var eqvarGroup = document.getElementById("sim-eqvar-group");
    var eqvarCheckbox = document.getElementById("sim-eqvar");
    if (value === "t_welch" || value === "t_equal_var") {
      eqvarGroup.style.display = "flex";
      // Adjust test type based on toggle state
      if (eqvarCheckbox.checked) {
        state.testType = "t_equal_var";
        emit("t_equal_var");
      } else {
        state.testType = "t_welch";
        emit("t_welch");
      }
    } else {
      eqvarGroup.style.display = "none";
      emit(value);
    }
  }

  function emit(testType) {
    listeners.forEach(function (fn) { fn(testType); });
  }

  /* -------------------------------------------------------
   * Init
   * ------------------------------------------------------- */

  function init() {
    // Delegate clicks
    document.getElementById("wizardQ1").addEventListener("click", function (e) {
      var btn = e.target.closest(".sim-wizard-btn");
      if (btn) handleQ1(btn.dataset.value);
    });
    document.getElementById("wizardQ2").addEventListener("click", function (e) {
      var btn = e.target.closest(".sim-wizard-btn");
      if (btn) handleQ2(btn.dataset.value);
    });
    document.getElementById("wizardQ3").addEventListener("click", function (e) {
      var btn = e.target.closest(".sim-wizard-btn");
      if (btn) handleQ3(btn.dataset.value);
    });

    // Equal-variance toggle
    document.getElementById("sim-eqvar").addEventListener("change", function () {
      var label = document.getElementById("sim-eqvar-label");
      if (this.checked) {
        label.textContent = "等分散";
        if (state.testType === "t_welch") {
          state.testType = "t_equal_var";
          highlightSelected("wizardQ3", "t_equal_var");
          emit("t_equal_var");
        }
      } else {
        label.textContent = "Welch";
        if (state.testType === "t_equal_var") {
          state.testType = "t_welch";
          highlightSelected("wizardQ3", "t_welch");
          emit("t_welch");
        }
      }
    });

    setStepActive(1);
  }

  return {
    init: init,
    onTestTypeSelected: function (fn) { listeners.push(fn); },
    getState: function () { return Object.assign({}, state); }
  };
})();
