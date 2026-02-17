// Chart.js 動的読み込みユーティリティ
var chartJsLoaded = false;
var chartJsLoading = false;

function loadChartJs() {
  return new Promise(function(resolve, reject) {
    if (chartJsLoaded || window.Chart) {
      chartJsLoaded = true;
      resolve();
      return;
    }
    if (chartJsLoading) {
      var interval = setInterval(function() {
        if (chartJsLoaded) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      return;
    }
    chartJsLoading = true;
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.onload = function() {
      chartJsLoaded = true;
      chartJsLoading = false;
      resolve();
    };
    script.onerror = function() {
      chartJsLoading = false;
      reject(new Error('Chart.js の読み込みに失敗しました'));
    };
    document.head.appendChild(script);
  });
}
