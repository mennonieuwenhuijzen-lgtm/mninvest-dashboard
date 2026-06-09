/* week-quiz.js — "Raad de week": active-recall quiz per weekpagina.
 * Genereert zichzelf uit WEEK_CHART (de koersdata die al op de pagina staat),
 * dus accuraat en zonder verzonnen oordelen. Reinforced de kernles:
 * een koersdaling is geen verkoopgrond. Plus:
 *   - weken-streak (localStorage: mninvest_weken_bekeken)
 *   - spaced repetition: elke week bewaart zijn richtingen
 *     (localStorage: mninvest_week_data); een latere week opent met een
 *     terugblik-vraag uit een eerder bezochte week.
 * Eén script voor alle weken; voeg op een nieuwe weekpagina alleen de
 * <script src="week-quiz.js"></script> toe (na chart-init.js). */
(function () {
  if (!window.WEEK_CHART || !WEEK_CHART.series) return;
  var foot = document.querySelector(".foot");
  if (!foot) return;

  var UP = 0.5; // drempel in %: boven +0,5 = omhoog, onder -0,5 = omlaag, ertussen = vlak
  var LABELS = { up: "Omhoog", flat: "Vlak", down: "Omlaag" };

  function klass(v) { return v > UP ? "up" : v < -UP ? "down" : "flat"; }
  function fmt(v) {
    if (typeof v !== "number" || isNaN(v)) return "n.v.t.";
    return (v > 0 ? "+" : "") + v.toFixed(2).replace(".", ",") + "%";
  }
  function lastValid(s) {
    for (var i = s.length - 1; i >= 0; i--) {
      if (typeof s[i] === "number" && !isNaN(s[i])) return s[i];
    }
    return null;
  }
  function lsGet(k, def) { try { return JSON.parse(localStorage.getItem(k) || def); } catch (e) { return JSON.parse(def); } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  // Week-identiteit uit de masthead.
  var h1 = document.querySelector(".masthead h1");
  var subEl = document.querySelector(".masthead-sub");
  var weekLabel = h1 ? h1.textContent.trim() : (document.title.match(/Week\s*\d+/) || ["deze week"])[0];
  var weekDate = subEl ? subEl.textContent.split("·")[0].trim() : "";
  var weekNum = parseInt((weekLabel.match(/\d+/) || ["0"])[0], 10);

  // 1. Bewegingen per ticker (laatste geldige waarde van de week).
  var tickers = Object.keys(WEEK_CHART.series).map(function (t) {
    var f = lastValid(WEEK_CHART.series[t]);
    return { t: t, f: f, c: f === null ? null : klass(f), recall: false };
  }).filter(function (x) { return x.f !== null; });

  // 2. Bewaar deze week voor spaced repetition (richtingen + datum).
  var store = lsGet("mninvest_week_data", "{}");
  var moves = {};
  tickers.forEach(function (x) { moves[x.t] = x.f; });
  store[weekLabel] = { num: weekNum, date: weekDate, moves: moves };
  lsSet("mninvest_week_data", store);

  // 3. Kies een gebalanceerde set van deze week (max 5).
  var up = tickers.filter(function (x) { return x.c === "up"; }).sort(function (a, b) { return b.f - a.f; });
  var down = tickers.filter(function (x) { return x.c === "down"; }).sort(function (a, b) { return a.f - b.f; });
  var flat = tickers.filter(function (x) { return x.c === "flat"; }).sort(function (a, b) { return Math.abs(a.f) - Math.abs(b.f); });
  var chosen = [];
  if (down[0]) chosen.push(down[0]);
  if (up[0]) chosen.push(up[0]);
  if (flat[0]) chosen.push(flat[0]);
  var rest = tickers.filter(function (x) { return chosen.indexOf(x) < 0; })
    .sort(function (a, b) { return Math.abs(b.f) - Math.abs(a.f); });
  for (var i = 0; chosen.length < 5 && i < rest.length; i++) chosen.push(rest[i]);
  chosen.sort(function (a, b) { return Math.abs(b.f) - Math.abs(a.f); });

  // 4. Spaced repetition: een terugblik-vraag uit een eerder bezochte week.
  var recall = buildRecall(store, weekLabel, weekNum);
  if (recall) chosen.unshift(recall); // opent met de terugblik

  function buildRecall(store, curLabel, curNum) {
    var others = Object.keys(store).filter(function (w) { return w !== curLabel; });
    if (!others.length) return null;
    // Voorkeur: de meest recente week vóór deze; anders de hoogste andere.
    var earlier = others.filter(function (w) { return store[w].num && store[w].num < curNum; })
      .sort(function (a, b) { return store[b].num - store[a].num; });
    var pickWeek = earlier[0] || others.sort(function (a, b) { return (store[b].num || 0) - (store[a].num || 0); })[0];
    var data = store[pickWeek];
    if (!data || !data.moves) return null;
    // Kies de grootste beweger met een duidelijke richting.
    var cand = Object.keys(data.moves).map(function (t) {
      return { t: t, f: data.moves[t], c: klass(data.moves[t]) };
    }).sort(function (a, b) { return Math.abs(b.f) - Math.abs(a.f); });
    if (!cand.length) return null;
    var pick = cand[0];
    return {
      t: pick.t, f: pick.f, c: pick.c, recall: true,
      weekLabel: pickWeek, weekDate: data.date || ""
    };
  }

  // 5. Aantal trades uit de masthead-meta (voor de kernles).
  var trades = null;
  var metaSpans = document.querySelectorAll(".masthead-meta span");
  for (var m = 0; m < metaSpans.length; m++) {
    if (/trade/i.test(metaSpans[m].textContent)) {
      var mm = metaSpans[m].textContent.match(/\d+/);
      if (mm) trades = parseInt(mm[0], 10);
    }
  }

  // 6. Streak: welke weken heb je doorgenomen?
  var streakN = 1;
  var seen = lsGet("mninvest_weken_bekeken", "[]");
  if (seen.indexOf(weekLabel) < 0) { seen.push(weekLabel); lsSet("mninvest_weken_bekeken", seen); }
  streakN = seen.length;

  // 7. Bouw de UI.
  var sec = document.createElement("div");
  sec.className = "wq";
  sec.innerHTML =
    '<span class="wq-kicker">▶ Raad de week</span>' +
    "<h3>Hoe deden je posities het deze week?</h3>" +
    '<p class="wq-intro">Gok eerst zelf de richting, dan zie je de echte beweging. Voorspellen blijft beter hangen dan terugkijken.</p>' +
    '<div class="wq-streak">Je hebt ' + (streakN === 1 ? "1 week" : streakN + " weken") + " doorgenomen." +
      (recall ? "  ·  met een terugblik op " + recall.weekLabel : "") + "</div>" +
    '<div class="wq-head"><span></span><span class="wq-prog" id="wqProg"></span></div>' +
    '<div id="wqBody"></div>';
  foot.parentNode.insertBefore(sec, foot);

  var body = sec.querySelector("#wqBody");
  var prog = sec.querySelector("#wqProg");
  var idx = 0, score = 0, answered = false;

  function renderQuestion() {
    answered = false;
    var it = chosen[idx];
    prog.textContent = "Vraag " + (idx + 1) + " van " + chosen.length;
    var opts = "";
    ["up", "flat", "down"].forEach(function (k) {
      opts += '<button class="wq-opt" data-k="' + k + '">' + LABELS[k] + "</button>";
    });
    var vraag = it.recall
      ? '<span class="wq-recall">↺ Terugblik · ' + it.weekLabel + (it.weekDate ? " (" + it.weekDate + ")" : "") + "</span>" +
        "Hoe eindigde <span class=\"tk\">" + it.t + "</span> in die week?"
      : "Hoe eindigde <span class=\"tk\">" + it.t + "</span> deze week?";
    body.innerHTML =
      '<div class="wq-q">' + vraag + "</div>" +
      '<div class="wq-opts">' + opts + "</div>" +
      '<div id="wqFb"></div><div id="wqAct"></div>';
    var btns = body.querySelectorAll(".wq-opt");
    for (var b = 0; b < btns.length; b++) btns[b].addEventListener("click", onAnswer);
  }

  function onAnswer(e) {
    if (answered) return;
    answered = true;
    var chosenK = e.currentTarget.getAttribute("data-k");
    var it = chosen[idx];
    var correct = chosenK === it.c;
    if (correct) score++;
    var btns = body.querySelectorAll(".wq-opt");
    for (var b = 0; b < btns.length; b++) {
      var k = btns[b].getAttribute("data-k");
      btns[b].disabled = true;
      if (k === it.c) btns[b].classList.add("correct");
      else if (k === chosenK) btns[b].classList.add("wrong");
    }
    var fb = body.querySelector("#wqFb");
    fb.className = "wq-fb " + (correct ? "good" : "bad");
    var wanneer = it.recall ? it.weekLabel : "de week";
    fb.innerHTML = "<strong>" + (correct ? "Goed" : "Net niet") + "</strong>" +
      it.t + " eindigde " + wanneer + ' op <span class="pct">' + fmt(it.f) + "</span>" +
      (it.recall ? " (genormaliseerd vanaf die maandag)." : " (genormaliseerd vanaf maandag).");
    var act = body.querySelector("#wqAct");
    act.className = "wq-actions";
    var last = idx === chosen.length - 1;
    act.innerHTML = '<button class="wq-btn" id="wqNext">' +
      (last ? "Bekijk je resultaat" : "Volgende →") + "</button>";
    body.querySelector("#wqNext").addEventListener("click", next);
  }

  function next() {
    if (idx < chosen.length - 1) { idx++; renderQuestion(); }
    else renderResult();
  }

  function renderResult() {
    prog.textContent = "Klaar";
    var punch;
    if (trades === 0) {
      punch = "Deze week daalden <b>" + down.length + " van de " + tickers.length + "</b> posities. " +
        "Toch werd er <b>0 keer</b> gehandeld. Een koersdaling is geen verkoopgrond, alleen een thesisbreuk of een geraakte breaker telt.";
    } else if (trades > 0) {
      punch = "Deze week daalden <b>" + down.length + " van de " + tickers.length + "</b> posities, met <b>" + trades + "</b> trade" + (trades === 1 ? "" : "s") + ". " +
        "Een trade volgt uit een thesisbreuk of een geraakte breaker, niet uit de koers van de week.";
    } else {
      punch = "De richting van de week zegt weinig over de thesis. Alleen een thesisbreuk of een geraakte breaker is een reden om te handelen.";
    }
    body.innerHTML =
      '<div class="wq-result">' +
        '<div class="sc">' + score + " / " + chosen.length + "</div>" +
        '<div class="wq-punch">' + punch + "</div>" +
        '<div class="wq-actions" style="justify-content:center">' +
          '<button class="wq-btn ghost" id="wqRetry">Opnieuw proberen</button>' +
        "</div>" +
      "</div>";
    body.querySelector("#wqRetry").addEventListener("click", function () {
      idx = 0; score = 0; renderQuestion();
    });
  }

  renderQuestion();
})();
