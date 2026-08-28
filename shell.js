/* Shell features for the English app: dark-mode toggle, keyboard shortcuts +
   help overlay, and a 25/5 pomodoro. Ported from the unified site's loader.js
   (Spanish UI). Storage keys are shared with the unified site so the theme and
   pomodoro follow you between apps on the same origin. The toggle buttons live
   in the site header (index.html, [data-theme-toggle]) and on the Progreso
   screen (app.js, #theme-toggle), so clicks are handled by delegation. */
(function () {
  "use strict";

  var THEME_KEY = "siteTheme.v1";
  var POMO_KEY = "sitePomodoro.v1";

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function")
          node.addEventListener(k.slice(2), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  /* ---------- theme ---------- */
  function isDark() { return document.documentElement.getAttribute("data-theme") === "dark"; }
  function setTheme(dark) {
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch (e) {}
    paintThemeButtons();
  }
  function paintThemeButtons() {
    var btns = document.querySelectorAll("#theme-toggle, [data-theme-toggle]");
    Array.prototype.forEach.call(btns, function (b) { b.textContent = isDark() ? "Oscuro" : "Claro"; });
  }
  function initTheme() {
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("#theme-toggle, [data-theme-toggle]") : null;
      if (t) { setTheme(!isDark()); e.preventDefault(); }
    });
    window.addEventListener("hashchange", function () { setTimeout(paintThemeButtons, 0); });
    paintThemeButtons();
  }
  window.SHELL = { setTheme: setTheme, isDark: isDark, paintThemeButtons: paintThemeButtons };

  /* ---------- keyboard shortcuts + help overlay ---------- */
  var overlay = null;
  function ensureOverlay() {
    if (overlay) return overlay;
    function row(keys, what) {
      return el("div", { class: "kbd-row" }, [
        el("span", { text: what }),
        el("span", { class: "kbd-keys", html: keys })
      ]);
    }
    var panel = el("div", { class: "kbd-panel" }, [
      el("h2", { text: "Atajos de teclado" }),
      row("<kbd>←</kbd> <kbd>→</kbd>", "Lección anterior / siguiente"),
      row("<kbd>h</kbd>", "Hoy (inicio)"),
      row("<kbd>l</kbd>", "Lecciones (el mapa)"),
      row("<kbd>g</kbd>", "Glosario"),
      row("<kbd>r</kbd>", "Repaso con tarjetas"),
      row("<kbd>/</kbd>", "Ir al buscador"),
      row("<kbd>?</kbd>", "Esta ayuda"),
      row("<kbd>Esc</kbd>", "Cerrar / salir"),
      el("p", { class: "kbd-hint", text: "Los atajos se pausan automáticamente mientras escribes en un ejercicio." })
    ]);
    overlay = el("div", { class: "kbd-overlay", onclick: function (e) { if (e.target === overlay) toggleOverlay(false); } }, [panel]);
    overlay.hidden = true;
    document.body.appendChild(overlay);
    return overlay;
  }
  function toggleOverlay(show) {
    var o = ensureOverlay();
    o.hidden = show === undefined ? !o.hidden : !show;
  }

  function initShortcuts() {
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("#kbd-help") : null;
      if (t) { toggleOverlay(); e.preventDefault(); }
    });

    document.addEventListener("keydown", function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;

      // Escape always works: close overlay > blur input
      if (e.key === "Escape") {
        if (overlay && !overlay.hidden) { toggleOverlay(false); return; }
        var a = document.activeElement;
        if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { a.blur(); return; }
        return;
      }

      // don't hijack typing
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;

      if (e.key === "?") { toggleOverlay(); e.preventDefault(); return; }
      if (overlay && !overlay.hidden) return;            // overlay swallows the rest

      var hash = (location.hash || "").replace("#", "");
      var lessons = window.COURSE && window.COURSE.lessons;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        var id = hash.indexOf("lesson/") === 0 ? hash.slice(7) : (/^\d+$/.test(hash) ? hash : null);
        if (!id || !lessons || !lessons.length) return;
        var ids = lessons.map(function (l) { return l.id; });
        var pos = ids.indexOf(id);
        if (pos === -1) return;
        var next = e.key === "ArrowRight" ? pos + 1 : pos - 1;
        if (next < 0 || next >= ids.length) return;
        location.hash = "lesson/" + ids[next];
        e.preventDefault();
      }
      else if (e.key === "h") location.hash = "home";
      else if (e.key === "l") location.hash = "map";
      else if (e.key === "g") location.hash = "glossary";
      else if (e.key === "r") location.hash = "review";
      else if (e.key === "/") {
        e.preventDefault();
        var target = document.getElementById("glossary-search");
        if (target) { target.focus(); return; }
        location.hash = "glossary";
        setTimeout(function () {
          var s = document.getElementById("glossary-search");
          if (s) s.focus();
        }, 80);
      }
    });
  }

  /* ---------- pomodoro (25 focus / 5 break) ---------- */
  var FOCUS_MS = 25 * 60 * 1000;
  var BREAK_MS = 5 * 60 * 1000;
  var pomoTimer = null;
  var baseTitle = "";

  function pomoLoad() {
    try { return JSON.parse(localStorage.getItem(POMO_KEY)) || null; } catch (e) { return null; }
  }
  function pomoSave(s) {
    try {
      if (s) localStorage.setItem(POMO_KEY, JSON.stringify(s));
      else localStorage.removeItem(POMO_KEY);
    } catch (e) {}
  }
  function phaseLen(phase) { return phase === "break" ? BREAK_MS : FOCUS_MS; }

  function initPomodoro() {
    var box = document.getElementById("pomodoro");
    if (!box) return;
    baseTitle = document.title;

    var label = el("span", { class: "pomo-label", text: "enfoque" });
    var time = el("span", { class: "pomo-time", text: "25:00" });
    var startBtn = el("button", { class: "pomo-btn", type: "button", title: "Iniciar/pausar pomodoro", "aria-label": "Iniciar o pausar" }, ["▶"]);
    var resetBtn = el("button", { class: "pomo-btn", type: "button", title: "Reiniciar pomodoro", "aria-label": "Reiniciar" }, ["↺"]);
    box.appendChild(label); box.appendChild(time); box.appendChild(startBtn); box.appendChild(resetBtn);

    var state = pomoLoad() || { phase: "focus", running: false, remaining: FOCUS_MS };

    function remainingNow() {
      return state.running ? Math.max(0, state.endAt - Date.now()) : state.remaining;
    }
    function fmt(ms) {
      var s = Math.round(ms / 1000);
      return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    }
    function render() {
      var ms = remainingNow();
      time.textContent = fmt(ms);
      label.textContent = state.phase === "break" ? "pausa" : "enfoque";
      box.setAttribute("data-state", state.running ? state.phase : "paused-" + state.phase);
      startBtn.textContent = state.running ? "⏸" : "▶";
      document.title = state.running ? "(" + fmt(ms) + ") " + baseTitle : baseTitle;
    }
    function stopTimer() { if (pomoTimer) { clearInterval(pomoTimer); pomoTimer = null; } }
    function phaseEnd() {
      stopTimer();
      var finished = state.phase;
      state = { phase: finished === "focus" ? "break" : "focus", running: false, remaining: phaseLen(finished === "focus" ? "break" : "focus") };
      pomoSave(state);
      render();
      // flash the tab title a few times so the phase change is noticeable
      var msg = finished === "focus" ? "🍅 ¡Hora de descansar!" : "🍅 ¡A concentrarse!";
      var flashes = 0;
      var fl = setInterval(function () {
        document.title = (flashes % 2 === 0) ? msg : baseTitle;
        if (++flashes >= 6) { clearInterval(fl); render(); }
      }, 800);
    }
    function tick() {
      if (remainingNow() <= 0) { phaseEnd(); return; }
      render();
    }
    function start() {
      state = { phase: state.phase, running: true, endAt: Date.now() + remainingNow() };
      pomoSave(state);
      stopTimer();
      pomoTimer = setInterval(tick, 1000);
      render();
    }
    function pause() {
      state = { phase: state.phase, running: false, remaining: remainingNow() };
      pomoSave(state);
      stopTimer();
      render();
    }
    startBtn.addEventListener("click", function () { state.running ? pause() : start(); });
    resetBtn.addEventListener("click", function () {
      stopTimer();
      state = { phase: "focus", running: false, remaining: FOCUS_MS };
      pomoSave(null);
      render();
    });

    // hydrate: resume a running timer, or advance one phase if it expired while away
    if (state.running) {
      if (state.endAt > Date.now()) { pomoTimer = setInterval(tick, 1000); }
      else { phaseEnd(); }
    }
    render();
    box.hidden = false;
  }

  function boot() {
    var y = document.getElementById("foot-year");
    if (y) y.textContent = String(new Date().getFullYear());
    initTheme();
    initShortcuts();
    initPomodoro();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
