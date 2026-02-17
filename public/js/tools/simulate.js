/**
 * Main orchestrator for the simulation feature.
 * Wires wizard, input cards, API calls, graph, and result display.
 */
(function () {
  "use strict";

  var lastResult = null;

  document.addEventListener("DOMContentLoaded", function () {
    SimGraph.init("simDistCanvas");
    SimWizard.init();

    restoreGlobalSettings();

    // Wizard: test type selected
    SimWizard.onTestTypeSelected(function (testType) {
      if (testType) {
        SimInputCards.render(testType);
      } else {
        clearInputCard();
      }
      hideResult();
    });

    // Calculate button
    document.getElementById("simCalcBtn").addEventListener("click", showCalculation);

    // Execute button
    document.getElementById("simExecuteBtn").addEventListener("click", executeSimulation);

    // Global settings changes: re-execute if we have a result
    document.getElementById("sim-alpha").addEventListener("change", function () {
      saveGlobalSettings();
      reExecuteIfNeeded();
    });
    document.getElementById("sim-tail").addEventListener("change", function () {
      saveGlobalSettings();
      reExecuteIfNeeded();
    });

    // Detail toggle
    document.getElementById("simDetailToggle").addEventListener("click", function () {
      var body = document.getElementById("simDetailBody");
      if (body.style.display === "none") {
        body.style.display = "block";
        this.innerHTML = "詳細を非表示 &#x25B2;";
      } else {
        body.style.display = "none";
        this.innerHTML = "詳細を表示 &#x25BC;";
      }
    });

    // Input change: validate and show preview
    document.getElementById("simInputCard").addEventListener("input", debounce(validateAndPreview, 400));
  });

  /* -------------------------------------------------------
   * Execute simulation
   * ------------------------------------------------------- */

  async function executeSimulation() {
    var testType = SimInputCards.getCurrentTestType();
    if (!testType) return;

    var params = SimInputCards.collectValues();
    if (!params) return;

    SimInputCards.saveValues();

    var input = {
      test_type: testType,
      alpha: parseFloat(document.getElementById("sim-alpha").value),
      tail: document.getElementById("sim-tail").value,
      params: params
    };

    var btn = document.getElementById("simExecuteBtn");
    btn.disabled = true;
    btn.textContent = "計算中...";

    try {
      var result = await SimulateAPI.simulate(input);
      lastResult = { input: input, result: result };
      renderResult(result);
      SimGraph.draw(result);
      saveLastResult(result);
    } catch (err) {
      showError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "検定を実行";
    }
  }

  /* -------------------------------------------------------
   * Show calculation steps
   * ------------------------------------------------------- */

  async function showCalculation() {
    var testType = SimInputCards.getCurrentTestType();
    if (!testType) return;

    var params = SimInputCards.collectValues();
    if (!params) return;

    SimInputCards.saveValues();

    var input = {
      test_type: testType,
      alpha: parseFloat(document.getElementById("sim-alpha").value),
      tail: document.getElementById("sim-tail").value,
      params: params
    };

    var btn = document.getElementById("simCalcBtn");
    btn.disabled = true;
    btn.textContent = "計算中...";

    try {
      var result = await SimulateAPI.calculate(input);
      renderCalculation(result);
    } catch (err) {
      showError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "検定統計量を計算";
    }
  }

  /* -------------------------------------------------------
   * Render calculation steps
   * ------------------------------------------------------- */

  function renderCalculation(result) {
    var card = document.getElementById("simCalcCard");
    var body = document.getElementById("simCalcBody");

    if (!result.steps || result.steps.length === 0) {
      card.style.display = "none";
      return;
    }

    card.style.display = "block";
    var html = "";

    result.steps.forEach(function (step) {
      if (step.result) {
        // Final result display
        html += '<div class="sim-calc-result">';
        html += '<div class="sim-calc-result-label">' + escHtml(step.result.label) + '</div>';
        html += '<div class="sim-calc-result-value">' + step.result.value + '</div>';
        html += '</div>';
      } else if (step.table) {
        // Deviation table for chi-squared independence
        html += '<div class="sim-calc-step">';
        html += '<div class="sim-calc-step-title">' + escHtml(step.title) + '</div>';
        html += renderDeviationTable(step.table);
        html += '</div>';
      } else {
        // Regular step
        html += '<div class="sim-calc-step">';
        html += '<div class="sim-calc-step-title">' + escHtml(step.title) + '</div>';
        if (step.note) {
          html += '<div class="sim-calc-step-note">' + escHtml(step.note) + '</div>';
        }
        html += '<div class="sim-calc-formula" data-katex="' + escAttr(step.formula) + '"></div>';
        html += '</div>';
      }
    });

    body.innerHTML = html;

    // Render KaTeX formulas
    var formulaEls = body.querySelectorAll("[data-katex]");
    formulaEls.forEach(function (el) {
      try {
        katex.render(el.getAttribute("data-katex"), el, { displayMode: true, throwOnError: false });
      } catch (e) {
        el.textContent = el.getAttribute("data-katex");
      }
    });
  }

  function renderDeviationTable(tbl) {
    var rows = tbl.rows;
    var cols = tbl.cols;
    var cells = tbl.cells;
    var rowSums = tbl.rowSums;
    var colSums = tbl.colSums;
    var N = tbl.N;

    var h = '<div class="sim-calc-dev-table-wrapper"><table class="sim-calc-dev-table">';

    // Header row
    h += '<thead><tr><th></th>';
    for (var j = 0; j < cols; j++) {
      h += '<th>列' + (j + 1) + '<br><span class="sim-calc-dev-colsum">計 ' + colSums[j] + '</span></th>';
    }
    h += '<th>計</th></tr></thead>';

    // Body
    h += '<tbody>';
    for (var i = 0; i < rows; i++) {
      h += '<tr>';
      h += '<th>行' + (i + 1) + '<br><span class="sim-calc-dev-rowsum">計 ' + rowSums[i] + '</span></th>';
      for (var jj = 0; jj < cols; jj++) {
        var cell = cells[i * cols + jj];
        var katexStr = '\\frac{(' + cell.o + ' - ' + cell.e + ')^2}{' + cell.e + '}';
        h += '<td>';
        h += '<div class="sim-calc-dev-cell" data-katex="' + escAttr(katexStr) + '"></div>';
        h += '<div class="sim-calc-dev-val">= ' + cell.term + '</div>';
        h += '</td>';
      }
      h += '<td class="sim-calc-dev-sum">' + rowSums[i] + '</td>';
      h += '</tr>';
    }
    h += '</tbody>';

    // Footer
    h += '<tfoot><tr><th>計</th>';
    for (var k = 0; k < cols; k++) {
      h += '<td class="sim-calc-dev-sum">' + colSums[k] + '</td>';
    }
    h += '<td class="sim-calc-dev-sum sim-calc-dev-grand">' + N + '</td>';
    h += '</tr></tfoot>';

    h += '</table></div>';
    return h;
  }

  function escAttr(str) {
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* -------------------------------------------------------
   * Re-execute with changed global settings
   * ------------------------------------------------------- */

  function reExecuteIfNeeded() {
    if (!lastResult) return;
    // Re-run with updated alpha/tail
    var input = Object.assign({}, lastResult.input, {
      alpha: parseFloat(document.getElementById("sim-alpha").value),
      tail: document.getElementById("sim-tail").value
    });
    lastResult.input = input;
    SimulateAPI.simulate(input).then(function (result) {
      lastResult.result = result;
      renderResult(result);
      SimGraph.draw(result);
    }).catch(function (err) {
      showError(err.message);
    });
  }

  /* -------------------------------------------------------
   * Validate and preview
   * ------------------------------------------------------- */

  async function validateAndPreview() {
    var testType = SimInputCards.getCurrentTestType();
    if (!testType) return;

    var params = SimInputCards.collectValues();
    if (!params) return;

    var input = {
      test_type: testType,
      alpha: parseFloat(document.getElementById("sim-alpha").value),
      tail: document.getElementById("sim-tail").value,
      params: params
    };

    try {
      var result = await SimulateAPI.validate(input);
      renderPreview(result, input);
    } catch (err) {
      // Validation errors during typing are expected, don't show errors
    }
  }

  /* -------------------------------------------------------
   * Render preview
   * ------------------------------------------------------- */

  function renderPreview(validation, input) {
    var card = document.getElementById("simPreviewCard");
    var body = document.getElementById("simPreviewBody");
    var badgesEl = document.getElementById("simPreviewBadges");
    var execBtn = document.getElementById("simExecuteBtn");
    var calcBtn = document.getElementById("simCalcBtn");

    if (!validation.valid) {
      card.style.display = "none";
      execBtn.disabled = true;
      calcBtn.disabled = true;
      execBtn.title = "入力値を正しく入力してください";
      calcBtn.title = "入力値を正しく入力してください";
      return;
    }

    card.style.display = "block";
    execBtn.disabled = false;
    calcBtn.disabled = false;
    execBtn.title = "";
    calcBtn.title = "";

    // Show derived values
    var html = "";
    var d = validation.derived || {};
    if (d.df != null) html += '<div class="sim-preview-item"><span class="sim-preview-label">自由度 df:</span> ' + formatNum(d.df) + '</div>';
    if (d.se != null) html += '<div class="sim-preview-item"><span class="sim-preview-label">標準誤差 SE:</span> ' + formatNum(d.se) + '</div>';
    if (d.t_approx != null) html += '<div class="sim-preview-item"><span class="sim-preview-label">参考t値:</span> ' + formatNum(d.t_approx) + '</div>';
    if (d.f_approx != null) html += '<div class="sim-preview-item"><span class="sim-preview-label">参考F値:</span> ' + formatNum(d.f_approx) + '</div>';
    if (d.p_hat != null) html += '<div class="sim-preview-item"><span class="sim-preview-label">標本比率 p\u0302:</span> ' + formatNum(d.p_hat) + '</div>';
    if (d.df1 != null) html += '<div class="sim-preview-item"><span class="sim-preview-label">df1:</span> ' + d.df1 + '</div>';
    if (d.df2 != null) html += '<div class="sim-preview-item"><span class="sim-preview-label">df2:</span> ' + d.df2 + '</div>';
    body.innerHTML = html || '<div class="sim-preview-item">入力値を検証中...</div>';

    // Badges
    var badgeHtml = "";
    (validation.badges || []).forEach(function (b) {
      var cls = b.status === "ok" ? "badge-ok" : (b.status === "warn" ? "badge-warn" : "badge-error");
      var sym = b.status === "ok" ? "\u2713" : (b.status === "warn" ? "\u26A0" : "\u2717");
      badgeHtml += '<span class="sim-badge ' + cls + '">' + sym + ' ' + escHtml(b.message) + '</span>';
    });
    badgesEl.innerHTML = badgeHtml;

    // Disable buttons if error badges exist
    var hasError = (validation.badges || []).some(function (b) { return b.status === "error"; });
    if (hasError) {
      execBtn.disabled = true;
      calcBtn.disabled = true;
      execBtn.title = "要修正項目があります";
      calcBtn.title = "要修正項目があります";
    }
  }

  /* -------------------------------------------------------
   * Render result
   * ------------------------------------------------------- */

  function renderResult(result) {
    var card = document.getElementById("simResultCard");
    var decisionEl = document.getElementById("simResultDecision");

    card.style.display = "block";
    card.className = "sim-result-card " + (result.decision === "reject" ? "sim-result-reject" : "sim-result-accept");
    decisionEl.textContent = result.decision_text;

    // Graph
    document.getElementById("simGraphCard").style.display = "block";

    // Detail section
    var detailSection = document.getElementById("simDetailSection");
    var detailBody = document.getElementById("simDetailBody");
    detailSection.style.display = "block";
    detailBody.style.display = "none";
    document.getElementById("simDetailToggle").innerHTML = "詳細を表示 &#x25BC;";

    var html = '<table class="sim-detail-table">';
    html += '<tr><th>検定統計量</th><td>' + result.stat.name + ' = ' + result.stat.value + '</td></tr>';
    if (result.stat.df && result.stat.df.v != null) {
      html += '<tr><th>自由度 (df)</th><td>' + result.stat.df.v + '</td></tr>';
    }
    if (result.stat.df && result.stat.df.df1 != null) {
      html += '<tr><th>自由度</th><td>df1 = ' + result.stat.df.df1 + ', df2 = ' + result.stat.df.df2 + '</td></tr>';
    }
    if (result.p_value != null) {
      html += '<tr><th>p値</th><td>' + result.p_value + '</td></tr>';
    }
    if (result.critical.right != null) {
      html += '<tr><th>棄却域（右）</th><td>' + result.critical.right + '</td></tr>';
    }
    if (result.critical.left != null) {
      html += '<tr><th>棄却域（左）</th><td>' + result.critical.left + '</td></tr>';
    }
    if (result.critical.source) {
      html += '<tr><th>棄却域の取得元</th><td>' + result.critical.source + '</td></tr>';
    }
    // Meta info
    var meta = result.meta || {};
    if (meta.effect_size != null) html += '<tr><th>効果量</th><td>' + meta.effect_size + '</td></tr>';
    if (meta.se != null) html += '<tr><th>標準誤差</th><td>' + meta.se + '</td></tr>';
    if (meta.cramers_v != null) html += '<tr><th>Cram\u00E9r\'s V</th><td>' + meta.cramers_v + '</td></tr>';
    if (meta.eta_squared != null) html += '<tr><th>\u03B7\u00B2</th><td>' + meta.eta_squared + '</td></tr>';
    if (meta.welch_df != null) html += '<tr><th>Welch近似df</th><td>' + meta.welch_df + '</td></tr>';
    if (meta.pooled_sd != null) html += '<tr><th>プールドSD</th><td>' + meta.pooled_sd + '</td></tr>';

    html += '</table>';

    // Notes
    if (result.notes && result.notes.length > 0) {
      html += '<div class="sim-detail-notes">';
      result.notes.forEach(function (n) {
        html += '<div class="sim-detail-note">' + escHtml(n) + '</div>';
      });
      html += '</div>';
    }

    detailBody.innerHTML = html;

    // Render distribution table
    renderDistributionTable(result);
  }

  /* -------------------------------------------------------
   * Render distribution table with highlights
   * ------------------------------------------------------- */

  function renderDistributionTable(result) {
    var tableSection = document.getElementById("simTableSection");
    var tableWrapper = document.getElementById("simTableWrapper");
    var tableTitle = document.getElementById("simTableTitle");

    if (!result.table_data || !result.table_data.rows || result.table_data.rows.length === 0) {
      tableSection.style.display = "none";
      return;
    }

    var data = result.table_data;
    tableSection.style.display = "block";

    // Set title based on distribution
    var distNames = { t: "t分布表", z: "標準正規分布表", chi2: "χ²分布表", f: "F分布表" };
    var titleText = distNames[data.distribution] || "分布表";
    if (data.distribution === "f" && data.usedDf1) {
      titleText += " (df1 = " + data.usedDf1 + ")";
    }
    tableTitle.textContent = titleText;

    // Build table HTML
    var html = '<table class="sim-dist-table">';

    // Header row
    html += '<thead><tr>';
    if (data.distribution === "f") {
      html += '<th class="sim-dist-th-corner">ν (df2)</th>';
    } else {
      html += '<th class="sim-dist-th-corner">ν</th>';
    }
    data.alphaLevels.forEach(function (alpha) {
      var isUsedCol = alpha === data.usedAlpha;
      html += '<th class="sim-dist-th-alpha' + (isUsedCol ? ' sim-dist-highlight-col' : '') + '">' + alpha + '</th>';
    });
    html += '</tr></thead>';

    // Body rows
    html += '<tbody>';
    data.rows.forEach(function (row) {
      var isUsedRow = row.isHighlighted;
      html += '<tr' + (isUsedRow ? ' class="sim-dist-highlight-row"' : '') + '>';

      // Row header (df)
      var dfLabel = data.distribution === "f" ? row.df2 : row.df;
      html += '<th class="sim-dist-th-df' + (isUsedRow ? ' sim-dist-highlight-row' : '') + '">' + dfLabel + '</th>';

      // Values
      data.alphaLevels.forEach(function (alpha) {
        var isUsedCol = alpha === data.usedAlpha;
        var isUsedCell = isUsedRow && isUsedCol;
        var cellClass = 'sim-dist-td';
        if (isUsedCell) {
          cellClass += ' sim-dist-highlight-cell';
        } else if (isUsedRow) {
          cellClass += ' sim-dist-highlight-row';
        } else if (isUsedCol) {
          cellClass += ' sim-dist-highlight-col';
        }
        var val = row.values[alpha];
        html += '<td class="' + cellClass + '">' + (val != null ? val.toFixed(4) : '-') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    tableWrapper.innerHTML = html;
  }

  /* -------------------------------------------------------
   * UI helpers
   * ------------------------------------------------------- */

  function hideResult() {
    document.getElementById("simResultCard").style.display = "none";
    document.getElementById("simGraphCard").style.display = "none";
    document.getElementById("simDetailSection").style.display = "none";
    document.getElementById("simPreviewCard").style.display = "none";
    document.getElementById("simTableSection").style.display = "none";
    document.getElementById("simCalcCard").style.display = "none";
    lastResult = null;
  }

  function clearInputCard() {
    document.getElementById("simInputCard").innerHTML =
      '<div class="sim-input-placeholder"><div class="sim-placeholder-icon">&#x1f50d;</div><p>左のウィザードで検定の種類を選択してください。</p></div>';
    document.getElementById("simActionRow").style.display = "none";
  }

  function showError(msg) {
    var card = document.getElementById("simResultCard");
    var decisionEl = document.getElementById("simResultDecision");
    card.style.display = "block";
    card.className = "sim-result-card sim-result-error";
    decisionEl.textContent = "エラー: " + msg;
  }

  function formatNum(v) {
    if (v == null) return "—";
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(4);
    return String(v);
  }

  function escHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function debounce(fn, delay) {
    var timer;
    return function () {
      clearTimeout(timer);
      var args = arguments;
      var self = this;
      timer = setTimeout(function () { fn.apply(self, args); }, delay);
    };
  }

  /* -------------------------------------------------------
   * Global settings persistence
   * ------------------------------------------------------- */

  function saveGlobalSettings() {
    try {
      localStorage.setItem("sim_global", JSON.stringify({
        alpha: document.getElementById("sim-alpha").value,
        tail: document.getElementById("sim-tail").value
      }));
    } catch (e) { /* ignore */ }
  }

  function restoreGlobalSettings() {
    try {
      var s = JSON.parse(localStorage.getItem("sim_global") || "{}");
      if (s.alpha) document.getElementById("sim-alpha").value = s.alpha;
      if (s.tail) document.getElementById("sim-tail").value = s.tail;
    } catch (e) { /* ignore */ }
  }

  function saveLastResult(result) {
    try {
      localStorage.setItem("sim_last_result", JSON.stringify({
        result: result,
        timestamp: new Date().toISOString()
      }));
    } catch (e) { /* ignore */ }
  }
})();
