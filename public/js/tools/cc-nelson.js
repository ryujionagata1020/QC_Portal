/**
 * Nelson rules engine for control chart anomaly detection.
 * Implements all 8 Nelson rules used in QC inspection.
 */
var CCNelson = (function () {
  "use strict";

  var RULES = {
    1: {
      name: "ルール1：限界線外",
      shortName: "限界線外",
      desc: "1点が3σを超えている（UCLまたはLCLの外側）",
      detail: "明らかな異常原因が混入している可能性が非常に高い状態です。",
      minPoints: 1
    },
    2: {
      name: "ルール2：連（ラン）",
      shortName: "連",
      desc: "中心線の片側に9点以上連続して並んでいる",
      detail: "平均値がシフト（移動）していることを示唆します。",
      minPoints: 9
    },
    3: {
      name: "ルール3：連続的な上昇・下降",
      shortName: "傾向",
      desc: "6点連続で値が上昇、または下降し続けている",
      detail: "時間とともに特性が変化する「傾向」を表します。",
      minPoints: 6
    },
    4: {
      name: "ルール4：交互の上下（ジグザグ）",
      shortName: "周期性",
      desc: "14点連続で交互に上がったり下がったりを繰り返す",
      detail: "2台の機械のデータを交互に取っている可能性があります。",
      minPoints: 14
    },
    5: {
      name: "ルール5：限界線付近の集中",
      shortName: "2σ集中",
      desc: "連続する3点中、2点が2σを超えている（同じ側）",
      detail: "工程のばらつきが大きくなっている予兆です。",
      minPoints: 3
    },
    6: {
      name: "ルール6：1σ外への偏り",
      shortName: "1σ偏り",
      desc: "連続する5点中、4点が1σを超えている（同じ側）",
      detail: "比較的小さな平均値のシフトが発生している可能性があります。",
      minPoints: 5
    },
    7: {
      name: "ルール7：中心付近への集中",
      shortName: "ラミネーション",
      desc: "15点連続で両側の1σ以内に収まっている",
      detail: "データの層別が不適切か、サンプリングミスを疑います。",
      minPoints: 15
    },
    8: {
      name: "ルール8：1σ外への分散",
      shortName: "二極化",
      desc: "連続する8点が1σの外側に分布している（両側）",
      detail: "異なる2つの工程が混ざって、二極化している状態を示します。",
      minPoints: 8
    }
  };

  /**
   * Check all enabled rules against the data.
   * @param {number[]} data
   * @param {number} mean - Center line (CL)
   * @param {number} sigma - Standard deviation
   * @param {number[]} enabledRules - Array of rule numbers to check
   * @returns {Array<{rule: number, indices: number[], name: string, desc: string}>}
   */
  function checkAll(data, mean, sigma, enabledRules) {
    var violations = [];
    for (var i = 0; i < enabledRules.length; i++) {
      var ruleNum = enabledRules[i];
      if (data.length < RULES[ruleNum].minPoints) continue;
      var result = checkRule(ruleNum, data, mean, sigma);
      if (result.violated) {
        violations.push({
          rule: ruleNum,
          indices: result.indices,
          name: RULES[ruleNum].name,
          desc: RULES[ruleNum].desc
        });
      }
    }
    return violations;
  }

  function checkRule(ruleNum, data, mean, sigma) {
    switch (ruleNum) {
      case 1: return checkRule1(data, mean, sigma);
      case 2: return checkRule2(data, mean, sigma);
      case 3: return checkRule3(data, mean, sigma);
      case 4: return checkRule4(data, mean, sigma);
      case 5: return checkRule5(data, mean, sigma);
      case 6: return checkRule6(data, mean, sigma);
      case 7: return checkRule7(data, mean, sigma);
      case 8: return checkRule8(data, mean, sigma);
      default: return { violated: false, indices: [] };
    }
  }

  // Rule 1: 1 point beyond 3-sigma
  function checkRule1(data, mean, sigma) {
    var ucl = mean + 3 * sigma;
    var lcl = mean - 3 * sigma;
    var indices = [];
    for (var i = 0; i < data.length; i++) {
      if (data[i] > ucl || data[i] < lcl) {
        indices.push(i);
      }
    }
    return { violated: indices.length > 0, indices: indices };
  }

  // Rule 2: 9 consecutive points same side of CL
  function checkRule2(data, mean) {
    if (data.length < 9) return { violated: false, indices: [] };
    for (var i = 0; i <= data.length - 9; i++) {
      var allAbove = true, allBelow = true;
      for (var j = i; j < i + 9; j++) {
        if (data[j] <= mean) allAbove = false;
        if (data[j] >= mean) allBelow = false;
      }
      if (allAbove || allBelow) {
        var indices = [];
        for (var k = i; k < i + 9; k++) indices.push(k);
        return { violated: true, indices: indices };
      }
    }
    return { violated: false, indices: [] };
  }

  // Rule 3: 6 consecutive points trending up or down
  function checkRule3(data) {
    if (data.length < 6) return { violated: false, indices: [] };
    for (var i = 0; i <= data.length - 6; i++) {
      var allUp = true, allDown = true;
      for (var j = i; j < i + 5; j++) {
        if (data[j + 1] <= data[j]) allUp = false;
        if (data[j + 1] >= data[j]) allDown = false;
      }
      if (allUp || allDown) {
        var indices = [];
        for (var k = i; k < i + 6; k++) indices.push(k);
        return { violated: true, indices: indices };
      }
    }
    return { violated: false, indices: [] };
  }

  // Rule 4: 14 consecutive alternating points
  function checkRule4(data) {
    if (data.length < 14) return { violated: false, indices: [] };
    for (var i = 0; i <= data.length - 14; i++) {
      var alternating = true;
      for (var j = i; j < i + 12; j++) {
        var d1 = data[j + 1] - data[j];
        var d2 = data[j + 2] - data[j + 1];
        if (d1 * d2 >= 0) { // same direction = not alternating
          alternating = false;
          break;
        }
      }
      if (alternating) {
        var indices = [];
        for (var k = i; k < i + 14; k++) indices.push(k);
        return { violated: true, indices: indices };
      }
    }
    return { violated: false, indices: [] };
  }

  // Rule 5: 2 of 3 consecutive points beyond 2-sigma (same side)
  function checkRule5(data, mean, sigma) {
    if (data.length < 3) return { violated: false, indices: [] };
    var upper2 = mean + 2 * sigma;
    var lower2 = mean - 2 * sigma;

    for (var i = 0; i <= data.length - 3; i++) {
      var aboveCount = 0, belowCount = 0;
      for (var j = i; j < i + 3; j++) {
        if (data[j] > upper2) aboveCount++;
        if (data[j] < lower2) belowCount++;
      }
      if (aboveCount >= 2 || belowCount >= 2) {
        return { violated: true, indices: [i, i + 1, i + 2] };
      }
    }
    return { violated: false, indices: [] };
  }

  // Rule 6: 4 of 5 consecutive points beyond 1-sigma (same side)
  function checkRule6(data, mean, sigma) {
    if (data.length < 5) return { violated: false, indices: [] };
    var upper1 = mean + sigma;
    var lower1 = mean - sigma;

    for (var i = 0; i <= data.length - 5; i++) {
      var aboveCount = 0, belowCount = 0;
      for (var j = i; j < i + 5; j++) {
        if (data[j] > upper1) aboveCount++;
        if (data[j] < lower1) belowCount++;
      }
      if (aboveCount >= 4 || belowCount >= 4) {
        var indices = [];
        for (var k = i; k < i + 5; k++) indices.push(k);
        return { violated: true, indices: indices };
      }
    }
    return { violated: false, indices: [] };
  }

  // Rule 7: 15 consecutive points within 1-sigma (both sides)
  function checkRule7(data, mean, sigma) {
    if (data.length < 15) return { violated: false, indices: [] };
    var upper1 = mean + sigma;
    var lower1 = mean - sigma;

    for (var i = 0; i <= data.length - 15; i++) {
      var allWithin = true;
      for (var j = i; j < i + 15; j++) {
        if (data[j] > upper1 || data[j] < lower1) {
          allWithin = false;
          break;
        }
      }
      if (allWithin) {
        var indices = [];
        for (var k = i; k < i + 15; k++) indices.push(k);
        return { violated: true, indices: indices };
      }
    }
    return { violated: false, indices: [] };
  }

  // Rule 8: 8 consecutive points outside 1-sigma (both sides of CL)
  function checkRule8(data, mean, sigma) {
    if (data.length < 8) return { violated: false, indices: [] };
    var upper1 = mean + sigma;
    var lower1 = mean - sigma;

    for (var i = 0; i <= data.length - 8; i++) {
      var allOutside = true;
      for (var j = i; j < i + 8; j++) {
        if (data[j] >= lower1 && data[j] <= upper1) {
          allOutside = false;
          break;
        }
      }
      if (allOutside) {
        var indices = [];
        for (var k = i; k < i + 8; k++) indices.push(k);
        return { violated: true, indices: indices };
      }
    }
    return { violated: false, indices: [] };
  }

  /**
   * Get enabled rules for a given grade level.
   * @param {number} grade - 1, 2, or 3
   * @returns {number[]}
   */
  function getRulesForGrade(grade) {
    if (grade >= 3) return [1, 2, 3];
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }

  return {
    RULES: RULES,
    checkAll: checkAll,
    checkRule: checkRule,
    getRulesForGrade: getRulesForGrade,
    getRuleDescription: function (n) { return RULES[n] ? RULES[n].desc : ""; },
    getRuleName: function (n) { return RULES[n] ? RULES[n].name : ""; },
    getRuleDetail: function (n) { return RULES[n] ? RULES[n].detail : ""; }
  };
})();
