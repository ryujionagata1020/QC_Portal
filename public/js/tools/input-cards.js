/**
 * Dynamic input form generation for each test type.
 */
var SimInputCards = (function () {
  "use strict";

  var currentTestType = null;

  /* -------------------------------------------------------
   * Field definitions per test type
   * ------------------------------------------------------- */

  var FIELD_DEFS = {
    t_1sample: {
      title: "1標本t検定",
      fields: [
        { id: "n", label: "標本サイズ n", type: "int", min: 2, placeholder: "例: 25" },
        { id: "mean", label: "標本平均 x\u0304", type: "number", step: "any", placeholder: "例: 52.3" },
        { id: "sd", label: "標本標準偏差 s", type: "number", step: "any", min: 0, placeholder: "例: 5.1" },
        { id: "mu0", label: "帰無仮説の母平均 \u03BC\u2080", type: "number", step: "any", placeholder: "例: 50" }
      ]
    },
    t_paired: {
      title: "対応ありt検定",
      fields: [
        { id: "n", label: "対の数 n", type: "int", min: 2, placeholder: "例: 15" },
        { id: "d_bar", label: "差の平均 d\u0304", type: "number", step: "any", placeholder: "例: 2.5" },
        { id: "sd_d", label: "差の標準偏差 s_d", type: "number", step: "any", min: 0, placeholder: "例: 3.8" }
      ]
    },
    t_welch: {
      title: "Welchのt検定（対応なし）",
      fields: [
        { id: "n1", label: "群1の標本サイズ n\u2081", type: "int", min: 2, placeholder: "例: 20" },
        { id: "mean1", label: "群1の平均 x\u0304\u2081", type: "number", step: "any", placeholder: "例: 75.2" },
        { id: "sd1", label: "群1の標準偏差 s\u2081", type: "number", step: "any", min: 0, placeholder: "例: 8.3" },
        { id: "n2", label: "群2の標本サイズ n\u2082", type: "int", min: 2, placeholder: "例: 22" },
        { id: "mean2", label: "群2の平均 x\u0304\u2082", type: "number", step: "any", placeholder: "例: 70.1" },
        { id: "sd2", label: "群2の標準偏差 s\u2082", type: "number", step: "any", min: 0, placeholder: "例: 9.5" }
      ]
    },
    t_equal_var: {
      title: "等分散t検定（対応なし）",
      fields: [
        { id: "n1", label: "群1の標本サイズ n\u2081", type: "int", min: 2, placeholder: "例: 20" },
        { id: "mean1", label: "群1の平均 x\u0304\u2081", type: "number", step: "any", placeholder: "例: 75.2" },
        { id: "sd1", label: "群1の標準偏差 s\u2081", type: "number", step: "any", min: 0, placeholder: "例: 8.3" },
        { id: "n2", label: "群2の標本サイズ n\u2082", type: "int", min: 2, placeholder: "例: 22" },
        { id: "mean2", label: "群2の平均 x\u0304\u2082", type: "number", step: "any", placeholder: "例: 70.1" },
        { id: "sd2", label: "群2の標準偏差 s\u2082", type: "number", step: "any", min: 0, placeholder: "例: 9.5" }
      ]
    },
    prop_1: {
      title: "1標本比率検定",
      fields: [
        { id: "n", label: "標本サイズ n", type: "int", min: 1, placeholder: "例: 200" },
        { id: "x", label: "成功数 x", type: "int", min: 0, placeholder: "例: 120" },
        { id: "p0", label: "帰無仮説の母比率 p\u2080", type: "number", step: "any", min: 0, max: 1, placeholder: "例: 0.5" }
      ]
    },
    prop_2: {
      title: "2標本比率差の検定",
      fields: [
        { id: "n1", label: "群1の標本サイズ n\u2081", type: "int", min: 1, placeholder: "例: 100" },
        { id: "x1", label: "群1の成功数 x\u2081", type: "int", min: 0, placeholder: "例: 60" },
        { id: "n2", label: "群2の標本サイズ n\u2082", type: "int", min: 1, placeholder: "例: 100" },
        { id: "x2", label: "群2の成功数 x\u2082", type: "int", min: 0, placeholder: "例: 45" }
      ]
    },
    chi2_gof: {
      title: "適合度検定（\u03C7\u00B2）",
      fields: [
        { id: "observed", label: "観測度数（カンマ区切り）", type: "array", placeholder: "例: 30,25,20,25" },
        { id: "expected", label: "期待度数（カンマ区切り）", type: "array", placeholder: "例: 25,25,25,25" }
      ]
    },
    chi2_indep: {
      title: "独立性の検定（\u03C7\u00B2）",
      fields: [
        { id: "rows", label: "行数", type: "int", min: 2, max: 10, placeholder: "例: 2" },
        { id: "cols", label: "列数", type: "int", min: 2, max: 10, placeholder: "例: 2" }
      ],
      hasGrid: true
    },
    f_eqvar: {
      title: "等分散性のF検定",
      fields: [
        { id: "n1", label: "群1の標本サイズ n\u2081", type: "int", min: 2, placeholder: "例: 16" },
        { id: "sd1", label: "群1の標準偏差 s\u2081", type: "number", step: "any", min: 0, placeholder: "例: 4.2" },
        { id: "n2", label: "群2の標本サイズ n\u2082", type: "int", min: 2, placeholder: "例: 21" },
        { id: "sd2", label: "群2の標準偏差 s\u2082", type: "number", step: "any", min: 0, placeholder: "例: 3.1" }
      ]
    },
    anova_oneway: {
      title: "一元配置分散分析",
      fields: [
        { id: "k", label: "群数 k", type: "int", min: 3, max: 20, placeholder: "例: 3" }
      ],
      hasGroups: true
    },
    binom: {
      title: "二項検定（正確法）",
      fields: [
        { id: "n", label: "試行回数 n", type: "int", min: 1, placeholder: "例: 20" },
        { id: "x", label: "成功数 x", type: "int", min: 0, placeholder: "例: 14" },
        { id: "p0", label: "帰無仮説の成功確率 p\u2080", type: "number", step: "any", min: 0, max: 1, placeholder: "例: 0.5" }
      ]
    },
    poisson: {
      title: "ポアソン検定",
      fields: [
        { id: "observed", label: "観測件数", type: "int", min: 0, placeholder: "例: 8" },
        { id: "lambda0", label: "帰無仮説の期待率 \u03BB\u2080", type: "number", step: "any", min: 0, placeholder: "例: 5.0" }
      ]
    }
  };

  /* -------------------------------------------------------
   * Form building
   * ------------------------------------------------------- */

  function render(testType) {
    currentTestType = testType;
    var container = document.getElementById("simInputCard");
    var def = FIELD_DEFS[testType];

    if (!def) {
      container.innerHTML = '<div class="sim-input-placeholder"><p>左のウィザードで検定の種類を選択してください。</p></div>';
      return;
    }

    var html = '<div class="sim-input-header">' + escHtml(def.title) + '</div>';
    html += '<div class="sim-input-fields">';

    def.fields.forEach(function (f) {
      html += buildField(f);
    });

    html += '</div>';

    // ANOVA group inputs
    if (def.hasGroups) {
      html += '<div id="simAnovaGroups" class="sim-anova-groups"></div>';
    }

    // Chi2 independence grid
    if (def.hasGrid) {
      html += '<div id="simChi2Grid" class="sim-chi2-grid"></div>';
    }

    container.innerHTML = html;

    // Restore saved values
    restoreValues(testType);

    // Set up dynamic listeners
    if (def.hasGroups) {
      var kInput = document.getElementById("sim-field-k");
      if (kInput) {
        kInput.addEventListener("change", function () { renderAnovaGroups(parseInt(this.value, 10) || 3); });
        renderAnovaGroups(parseInt(kInput.value, 10) || 3);
      }
    }
    if (def.hasGrid) {
      var rowsInput = document.getElementById("sim-field-rows");
      var colsInput = document.getElementById("sim-field-cols");
      function updateGrid() {
        var r = parseInt(rowsInput.value, 10) || 2;
        var c = parseInt(colsInput.value, 10) || 2;
        renderChi2Grid(r, c);
      }
      if (rowsInput) rowsInput.addEventListener("change", updateGrid);
      if (colsInput) colsInput.addEventListener("change", updateGrid);
      updateGrid();
    }

    // Show action row
    document.getElementById("simActionRow").style.display = "flex";
    // Hide previous results
    document.getElementById("simResultCard").style.display = "none";
    document.getElementById("simGraphCard").style.display = "none";
    document.getElementById("simDetailSection").style.display = "none";
    document.getElementById("simPreviewCard").style.display = "none";
  }

  function buildField(f) {
    var inputType = f.type === "int" ? "number" : (f.type === "array" ? "text" : "number");
    var step = f.type === "int" ? "1" : (f.step || "any");
    var minAttr = f.min != null ? ' min="' + f.min + '"' : "";
    var maxAttr = f.max != null ? ' max="' + f.max + '"' : "";

    return '<div class="sim-field-group">' +
      '<label for="sim-field-' + f.id + '">' + escHtml(f.label) + '</label>' +
      '<input type="' + inputType + '" id="sim-field-' + f.id + '" ' +
      'step="' + step + '"' + minAttr + maxAttr +
      ' placeholder="' + escHtml(f.placeholder || "") + '" class="sim-field-input" data-field="' + f.id + '">' +
      '</div>';
  }

  function renderAnovaGroups(k) {
    var container = document.getElementById("simAnovaGroups");
    if (!container) return;
    k = Math.max(2, Math.min(k, 20));
    var html = '<div class="sim-anova-header">各群のデータ</div>';
    for (var i = 0; i < k; i++) {
      html += '<div class="sim-anova-row">' +
        '<span class="sim-anova-label">群' + (i + 1) + '</span>' +
        '<input type="number" id="sim-group-n-' + i + '" placeholder="n" step="1" min="2" class="sim-anova-input" title="標本サイズ">' +
        '<input type="number" id="sim-group-mean-' + i + '" placeholder="x\u0304" step="any" class="sim-anova-input" title="平均">' +
        '<input type="number" id="sim-group-sd-' + i + '" placeholder="s" step="any" min="0" class="sim-anova-input" title="標準偏差">' +
        '</div>';
    }
    container.innerHTML = html;
  }

  function renderChi2Grid(rows, cols) {
    var container = document.getElementById("simChi2Grid");
    if (!container) return;
    rows = Math.max(2, Math.min(rows, 10));
    cols = Math.max(2, Math.min(cols, 10));

    var html = '<div class="sim-grid-header">観測度数テーブル</div>';
    html += '<table class="sim-grid-table"><thead><tr><th></th>';
    for (var c = 0; c < cols; c++) {
      html += '<th>列' + (c + 1) + '</th>';
    }
    html += '</tr></thead><tbody>';
    for (var r = 0; r < rows; r++) {
      html += '<tr><th>行' + (r + 1) + '</th>';
      for (var c2 = 0; c2 < cols; c2++) {
        html += '<td><input type="number" id="sim-cell-' + r + '-' + c2 + '" step="1" min="0" class="sim-grid-input" placeholder="0"></td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  /* -------------------------------------------------------
   * Value collection
   * ------------------------------------------------------- */

  function collectValues() {
    var def = FIELD_DEFS[currentTestType];
    if (!def) return null;

    var params = {};

    def.fields.forEach(function (f) {
      var el = document.getElementById("sim-field-" + f.id);
      if (!el) return;
      if (f.type === "array") {
        params[f.id] = el.value.split(",").map(function (s) { return parseFloat(s.trim()); }).filter(function (n) { return !isNaN(n); });
      } else if (f.type === "int") {
        params[f.id] = parseInt(el.value, 10);
      } else {
        params[f.id] = parseFloat(el.value);
      }
    });

    // ANOVA groups
    if (def.hasGroups) {
      var k = params.k || 3;
      params.groups = [];
      for (var i = 0; i < k; i++) {
        var nEl = document.getElementById("sim-group-n-" + i);
        var mEl = document.getElementById("sim-group-mean-" + i);
        var sEl = document.getElementById("sim-group-sd-" + i);
        params.groups.push({
          n: nEl ? parseInt(nEl.value, 10) : NaN,
          mean: mEl ? parseFloat(mEl.value) : NaN,
          sd: sEl ? parseFloat(sEl.value) : NaN
        });
      }
    }

    // Chi2 independence grid
    if (def.hasGrid) {
      var rows = params.rows || 2;
      var cols = params.cols || 2;
      params.observed = [];
      for (var r = 0; r < rows; r++) {
        var row = [];
        for (var c = 0; c < cols; c++) {
          var cell = document.getElementById("sim-cell-" + r + "-" + c);
          row.push(cell ? parseInt(cell.value, 10) || 0 : 0);
        }
        params.observed.push(row);
      }
    }

    return params;
  }

  /* -------------------------------------------------------
   * localStorage save/restore
   * ------------------------------------------------------- */

  function saveValues() {
    if (!currentTestType) return;
    var params = collectValues();
    try {
      var saved = JSON.parse(localStorage.getItem("sim_inputs") || "{}");
      saved[currentTestType] = params;
      localStorage.setItem("sim_inputs", JSON.stringify(saved));
    } catch (e) { /* ignore */ }
  }

  function restoreValues(testType) {
    try {
      var saved = JSON.parse(localStorage.getItem("sim_inputs") || "{}");
      var params = saved[testType];
      if (!params) return;
      var def = FIELD_DEFS[testType];
      if (!def) return;

      def.fields.forEach(function (f) {
        var el = document.getElementById("sim-field-" + f.id);
        if (!el || params[f.id] == null) return;
        if (f.type === "array") {
          el.value = Array.isArray(params[f.id]) ? params[f.id].join(", ") : "";
        } else {
          el.value = params[f.id];
        }
      });
    } catch (e) { /* ignore */ }
  }

  /* -------------------------------------------------------
   * Helpers
   * ------------------------------------------------------- */

  function escHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  return {
    render: render,
    collectValues: collectValues,
    saveValues: saveValues,
    getCurrentTestType: function () { return currentTestType; }
  };
})();
