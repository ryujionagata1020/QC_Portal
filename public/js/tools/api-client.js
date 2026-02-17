/**
 * API communication layer for the simulation feature.
 * Handles CSRF tokens and fetch calls.
 */
var SimulateAPI = (function () {
  "use strict";

  function getCsrfToken() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : "";
  }

  async function post(url, data) {
    var response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": getCsrfToken()
      },
      body: JSON.stringify(data)
    });
    var json = await response.json();
    if (!response.ok) {
      var msg = json.error || (json.errors && json.errors.map(function (e) { return e.message; }).join(", ")) || "リクエストに失敗しました。";
      throw new Error(msg);
    }
    return json;
  }

  async function get(url) {
    var response = await fetch(url);
    if (!response.ok) throw new Error("リクエストに失敗しました。");
    return response.json();
  }

  return {
    simulate: function (input) {
      return post("/tools/api/simulate", input);
    },
    validate: function (input) {
      return post("/tools/api/validate", input);
    },
    calculate: function (input) {
      return post("/tools/api/calculate", input);
    },
    getCriticalValues: function (params) {
      var qs = new URLSearchParams(params).toString();
      return get("/tools/api/critical-values?" + qs);
    },
    getTemplates: function () {
      return get("/tools/api/contents/templates");
    }
  };
})();
