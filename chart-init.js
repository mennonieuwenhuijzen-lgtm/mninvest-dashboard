// Interactieve weekkoers-grafiek. Verwacht globale WEEK_CHART = {dates:[...], series:{TICKER:[pct,...]}}.
// Chart.js wordt via CDN geladen vóór dit script.
(function () {
  if (typeof Chart === 'undefined' || typeof WEEK_CHART === 'undefined') return;
  var canvas = document.getElementById('weekChart');
  if (!canvas) return;

  var COLORS = {
    RIG:'#2b3f7c', TTE:'#4a6aa5', OXY:'#7d97c4',
    HCC:'#8b2331', AMR:'#bf5b66',
    FCX:'#b07d2a', WPM:'#d8b25a', IGLN:'#9a8a72',
    SAAB:'#1f4733', KSPI:'#2a5c43',
    ADBE:'#6b4fa0', TME:'#c0563f', PROSY:'#9a7b3f'
  };

  var labels = WEEK_CHART.dates.map(function (d) {
    var p = d.split('-'); return p[2] + '-' + p[1];
  });

  var datasets = Object.keys(WEEK_CHART.series).map(function (tk) {
    var c = COLORS[tk] || '#888';
    return {
      label: tk,
      data: WEEK_CHART.series[tk],
      borderColor: c,
      backgroundColor: c,
      borderWidth: 1.8,
      tension: 0.25,
      pointRadius: 2,
      pointHoverRadius: 5,
      spanGaps: true
    };
  });

  new Chart(canvas, {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 10, boxHeight: 10, font: { family: 'Courier New, monospace', size: 10 }, padding: 10 }
        },
        tooltip: {
          callbacks: {
            label: function (c) {
              var v = c.parsed.y;
              return c.dataset.label + ': ' + (v > 0 ? '+' : '') + v + '%';
            }
          }
        }
      },
      scales: {
        y: {
          title: { display: true, text: '% vanaf weekstart', font: { family: 'Courier New, monospace', size: 10 } },
          ticks: { callback: function (v) { return (v > 0 ? '+' : '') + v + '%'; }, font: { family: 'Courier New, monospace', size: 10 } },
          grid: { color: '#e6ddd0' }
        },
        x: {
          ticks: { font: { family: 'Courier New, monospace', size: 10 } },
          grid: { display: false }
        }
      }
    }
  });
})();
