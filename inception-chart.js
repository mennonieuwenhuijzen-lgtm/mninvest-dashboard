/* inception-chart.js — koersverloop per aandeel sinds aankoopdatum.
 * Toont wat HET AANDEEL ZELF deed (niet Menno's P&L). Leest
 * inception_chart.json (gegenereerd door inception_chart_data.py) en tekent:
 *   1) een gecombineerde lijngrafiek (alle tickers, klikbare legenda)
 *   2) een klein grafiekje per aandeel (small multiples)
 * Vereist Chart.js (CDN) en de containers #incCombined / #incGrid. */
(function () {
  if (typeof Chart === "undefined") return;
  var combinedCanvas = document.getElementById("incCombined");
  var grid = document.getElementById("incGrid");
  if (!combinedCanvas || !grid) return;

  function pctStr(v) { return (v > 0 ? "+" : "") + v.toFixed(1).replace(".", ",") + "%"; }
  function shortDate(iso) { var p = iso.split("-"); return p[2] + "-" + p[1]; }

  fetch("inception_chart.json")
    .then(function (r) { return r.json(); })
    .then(function (data) { render(data); })
    .catch(function (e) { console.error("inception-chart:", e); });

  function render(data) {
    var colors = data.colors || {};
    // Volgorde: vroegste inceptie eerst.
    var order = Object.keys(data.tickers).sort(function (a, b) {
      return data.tickers[a].inception.localeCompare(data.tickers[b].inception);
    });

    // 1) Gecombineerde grafiek.
    var labels = data.combined.dates.map(shortDate);
    var datasets = order.map(function (tk) {
      var c = colors[tk] || "#888";
      return {
        label: tk, data: data.combined.series[tk],
        borderColor: c, backgroundColor: c,
        borderWidth: 1.6, pointRadius: 0, pointHoverRadius: 4,
        tension: 0.2, spanGaps: true,
      };
    });
    new Chart(combinedCanvas, {
      type: "line",
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10, font: { family: "Courier New, monospace", size: 10 }, padding: 8 } },
          tooltip: { callbacks: { label: function (c) { return c.dataset.label + ": " + (c.parsed.y > 0 ? "+" : "") + c.parsed.y + "%"; } } },
        },
        scales: {
          y: { ticks: { callback: function (v) { return (v > 0 ? "+" : "") + v + "%"; }, font: { family: "Courier New, monospace", size: 10 } }, grid: { color: "#e6ddd0" } },
          x: { ticks: { maxTicksLimit: 8, autoSkip: true, font: { family: "Courier New, monospace", size: 9 } }, grid: { display: false } },
        },
      },
    });

    // 2) Klein grafiekje per aandeel.
    order.forEach(function (tk) {
      var t = data.tickers[tk];
      var c = colors[tk] || "#888";
      var up = t.change >= 0;

      var card = document.createElement("div");
      card.className = "inc-mini";
      var head = document.createElement("div");
      head.className = "inc-mini-h";
      head.innerHTML =
        '<span class="inc-mini-tk">' + tk + "</span>" +
        '<span class="inc-mini-ch" style="color:' + (up ? "var(--green)" : "var(--red)") + '">' + pctStr(t.change) + "</span>";
      var sub = document.createElement("div");
      sub.className = "inc-mini-sub";
      sub.textContent = t.name + " · sinds " + shortDate(t.inception) + "-" + t.inception.slice(0, 4);
      var holder = document.createElement("div");
      holder.className = "inc-mini-holder";
      var cv = document.createElement("canvas");
      holder.appendChild(cv);
      card.appendChild(head);
      card.appendChild(sub);
      card.appendChild(holder);
      grid.appendChild(card);

      new Chart(cv, {
        type: "line",
        data: {
          labels: t.dates.map(shortDate),
          datasets: [{
            data: t.pct, borderColor: c, backgroundColor: c,
            borderWidth: 1.6, pointRadius: 0, pointHoverRadius: 3,
            tension: 0.2, fill: false,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: function (cc) { return (cc.parsed.y > 0 ? "+" : "") + cc.parsed.y + "%"; } } },
          },
          scales: {
            y: { ticks: { maxTicksLimit: 4, callback: function (v) { return (v > 0 ? "+" : "") + v + "%"; }, font: { family: "Courier New, monospace", size: 9 } }, grid: { color: "#eee5d8" } },
            x: { display: false },
          },
        },
      });
    });
  }
})();
