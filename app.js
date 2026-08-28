/* English A1→C2 interactive course (for Spanish speakers) — rendering + audio +
   exercises + listening + SRS + dashboard, in the "broadsheet" design (bottom tab
   bar: Hoy · Lecciones · Repaso · Glosario). Pure vanilla JS, no dependencies, no
   network. Works when index.html is opened directly from disk (file://). State
   persists in localStorage.

   Data convention: each vocab/dialogue/etc item carries `en` (the English term —
   the language being learned, spoken by TTS and shown prominently) and `es` (the
   Spanish gloss/translation, shown muted and hidden by the translation toggle).

   FUTURE (deferred): an in-app live AI voice conversation partner. It would need an
   always-connected AI backend (API key + network), which breaks this offline,
   open-the-file design, so it is intentionally not built here. */
(function () {
  "use strict";

  var COURSE = window.COURSE || { lessons: [], units: [], levels: [], outline: [] };
  var STORE_KEY = "englishCourseProgress.v1";
  var SRS_KEY = "englishCourseSRS.v1";
  var STREAK_KEY = "englishCourseStreak.v1";

  /* ---------- tiny DOM helpers ---------- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
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
  function lessonById(id) {
    for (var i = 0; i < COURSE.lessons.length; i++)
      if (COURSE.lessons[i].id === id) return COURSE.lessons[i];
    return null;
  }
  function levelOfId(id) {
    var l = lessonById(id);
    if (l && l.level) return l.level;
    for (var i = 0; i < (COURSE.outline || []).length; i++)
      if (COURSE.outline[i].id === id) return COURSE.outline[i].level;
    return "";
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function today() { return Math.floor(Date.now() / 86400000); }

  /* ---------- audio: pre-generated MP3s (audio/manifest.js) with TTS fallback ---------- */
  var TTS = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
  var HAS_FILES = !!window.AUDIO_FILES && typeof Audio !== "undefined";
  // CAN_AUDIO gates the 🔊 UI: pre-generated audio or device speech synthesis
  var CAN_AUDIO = HAS_FILES || TTS;
  var BAD_VOICE = /eddy|flo\b|grandma|grandpa|reed|rocko|sandy|shelley|albert|jester|whisper|zarvox|bad news|good news|bells|boing|bubbles|cellos|organ|superstar|trinoids|wobble|junior|ralph|kathy|fred/i;
  var GOOD_VOICE = /premium|enhanced|neural|natural|siri|google/i;
  function pickEnglishVoice() {
    if (!TTS) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    var prefs = ["en-us", "en-gb", "en-au", "en-ca", "en-ie", "en"];
    var best = null, bestScore = -Infinity;
    for (var i = 0; i < voices.length; i++) {
      var lang = (voices[i].lang || "").toLowerCase().replace("_", "-");
      var rank = -1;
      for (var p = 0; p < prefs.length; p++) {
        if (lang.indexOf(prefs[p]) === 0) { rank = p; break; }
      }
      if (rank === -1) continue;
      var name = voices[i].name || "";
      // language-preference order dominates; within a language, avoid Apple's
      // novelty voices and prefer premium/neural ones
      var score = (prefs.length - rank) * 100 + (GOOD_VOICE.test(name) ? 50 : 0) - (BAD_VOICE.test(name) ? 500 : 0);
      if (score > bestScore) { bestScore = score; best = voices[i]; }
    }
    return best;
  }
  var speakChain = null; // holds current utterances: guards stale onend chains + Chrome GC bug
  var audioEl = null;    // single reused element so clips never overlap
  var speakMode = null;  // "file" | "tts" — which backend is currently playing
  var speakEnd = null;   // callback fired once when the current playback finishes
  function fireEnd(mode) {
    if (speakMode !== mode || !speakEnd) return;
    var cb = speakEnd; speakEnd = null; speakMode = null;
    cb();
  }
  function playFile(file, fallbackText) {
    if (!audioEl) {
      audioEl = new Audio();
      audioEl.addEventListener("ended", function () { fireEnd("file"); });
    }
    audioEl.pause();
    audioEl.src = "audio/" + file;
    speakMode = "file";
    var p = audioEl.play();
    if (p && p.catch) p.catch(function (err) {
      // missing/broken file -> use device TTS; autoplay-block -> nothing to do
      if (err && err.name !== "NotAllowedError") ttsSpeak(fallbackText);
      else fireEnd("file");
    });
    return true;
  }
  function audioFile(t, voice) {
    // voice slot "f1" is the plain key; other slots are stored as "[m1] text" etc.
    // (see site/tools/gen-audio.py). Fall back to the default-voice file if missing.
    if (!HAS_FILES) return null;
    if (voice && voice !== "f1" && window.AUDIO_FILES["[" + voice + "] " + t]) return window.AUDIO_FILES["[" + voice + "] " + t];
    return window.AUDIO_FILES[t] || null;
  }
  var seqToken = 0; // bumped by every speak()/speakSeq() so stale sequences stop
  function speak(text, onEnd, voice) {
    if (!text) return false;
    var t = String(text).trim();
    seqToken++;
    return speakOne(t, onEnd, voice);
  }
  function speakOne(t, onEnd, voice) {
    if (TTS) window.speechSynthesis.cancel();
    if (audioEl) audioEl.pause();
    speakChain = null;
    speakMode = null;
    speakEnd = typeof onEnd === "function" ? onEnd : null;
    var file = audioFile(t, voice);
    if (file && playFile(file, t)) return true;
    return ttsSpeak(t);
  }
  // Play several lines back to back (a dialogue, one file per speaker voice).
  // items: [{text, voice}]; opts.onLine(i) before each line, opts.onEnd() after the last.
  function speakSeq(items, opts) {
    opts = opts || {};
    var my = ++seqToken;
    var i = 0;
    function next() {
      if (my !== seqToken) return;
      if (i >= items.length) { if (opts.onEnd) opts.onEnd(); return; }
      var it = items[i++];
      if (opts.onLine) opts.onLine(i - 1);
      var ok = speakOne(it.text, function () {
        if (my !== seqToken) return;
        setTimeout(next, 400);
      }, it.voice);
      if (!ok) setTimeout(next, 0);
    }
    if (!items || !items.length) return false;
    next();
    return true;
  }
  function pauseSpeak() {
    if (speakMode === "file" && audioEl) audioEl.pause();
    else if (speakMode === "tts" && TTS) window.speechSynthesis.pause();
  }
  function resumeSpeak() {
    if (speakMode === "file" && audioEl) audioEl.play();
    else if (speakMode === "tts" && TTS) window.speechSynthesis.resume();
  }
  function ttsSpeak(text) {
    if (!TTS || !text) return false;
    try {
      window.speechSynthesis.cancel();
      // "hi / hello" would be read run-together; speak each alternative as its own
      // utterance with an explicit 300ms pause between them
      var parts = String(text).split(/\s*\/\s*/).filter(function (p) { return p.trim(); });
      var v = pickEnglishVoice();
      var utts = parts.map(function (part) {
        var u = new SpeechSynthesisUtterance(part);
        if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = "en-US"; }
        u.rate = 0.95;
        return u;
      });
      utts.forEach(function (u, i) {
        if (i < utts.length - 1) u.onend = function () {
          setTimeout(function () {
            if (speakChain === utts) window.speechSynthesis.speak(utts[i + 1]);
          }, 300);
        };
        else u.onend = function () { if (speakChain === utts) fireEnd("tts"); };
      });
      speakChain = utts;
      speakMode = "tts";
      window.speechSynthesis.speak(utts[0]);
      return true;
    } catch (e) { return false; }
  }
  if (TTS && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = function () { /* voices now cached */ };
  }
  function audioBtn(text, extraClass, voice) {
    if (!CAN_AUDIO || !text) return null;
    return el("button", {
      class: "audio-btn" + (extraClass ? " " + extraClass : ""),
      type: "button", title: "Escuchar", "aria-label": "Escuchar",
      onclick: function (e) { e.stopPropagation(); speak(text, null, voice); }
    }, ["🔊"]);
  }
  // speaker name -> voice slot for a dialogue (speakers.js: window.SPEAKERS.en + assignVoices)
  function dialogueVoices(lines) {
    var gender = (window.SPEAKERS || {}).en || {};
    return typeof window.assignVoices === "function" ? window.assignVoices(lines, gender) : {};
  }

  /* ---------- progress (localStorage) ---------- */
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function recordScore(id, correct, total) {
    var p = loadProgress();
    var prev = p[id] || { best: 0, total: total, done: false };
    p[id] = {
      best: Math.max(prev.best || 0, correct),
      total: total,
      done: prev.done || correct === total
    };
    saveProgress(p);
    touchStreak();
    var lesson = lessonById(id);
    if (lesson) srsSeedFromLesson(lesson);
    renderNav();
  }

  /* ---------- daily streak ---------- */
  function loadStreak() {
    try { return JSON.parse(localStorage.getItem(STREAK_KEY)) || { last: -1, count: 0 }; }
    catch (e) { return { last: -1, count: 0 }; }
  }
  function touchStreak() {
    var s = loadStreak();
    var d = today();
    if (s.last === d) return s;
    if (s.last === d - 1) s.count = (s.count || 0) + 1;
    else s.count = 1;
    s.last = d;
    try { localStorage.setItem(STREAK_KEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }
  function streakCount() {
    var s = loadStreak();
    if (s.last === today() || s.last === today() - 1) return s.count || 0;
    return 0; // streak lapsed
  }

  /* ---------- spaced-repetition deck (SRS) ----------
     Cards are keyed/fronted by the English term (`en`); `es` is the Spanish back. */
  function loadSRS() {
    try { return JSON.parse(localStorage.getItem(SRS_KEY)) || { cards: {} }; }
    catch (e) { return { cards: {} }; }
  }
  function saveSRS(d) {
    try { localStorage.setItem(SRS_KEY, JSON.stringify(d)); } catch (e) {}
  }
  function srsKey(s) { return String(s).trim().toLowerCase(); }
  function srsDeckItems(lesson) {
    var items = (lesson.flashcards && lesson.flashcards.length) ? lesson.flashcards : lesson.vocab;
    return (items || []).filter(function (v) { return v && v.en && v.es; });
  }
  function srsSeedFromLesson(lesson) {
    var d = loadSRS();
    var changed = false;
    srsDeckItems(lesson).forEach(function (v) {
      var k = srsKey(v.en);
      if (!d.cards[k]) {
        d.cards[k] = { en: v.en, es: v.es, lessonId: lesson.id, ease: 2.3, interval: 0, due: today() };
        changed = true;
      }
    });
    if (changed) saveSRS(d);
  }
  function srsDue() {
    var d = loadSRS();
    var t = today();
    return Object.keys(d.cards)
      .map(function (k) { return d.cards[k]; })
      .filter(function (c) { return (c.due || 0) <= t; });
  }
  function srsCount() {
    var d = loadSRS();
    return Object.keys(d.cards).length;
  }
  function srsGrade(card, grade) { // grade: 0 again, 1 hard, 2 good, 3 easy
    var d = loadSRS();
    var c = d.cards[srsKey(card.en)];
    if (!c) return;
    if (grade === 0) {
      c.interval = 0;
      c.ease = Math.max(1.3, (c.ease || 2.3) - 0.2);
    } else {
      if (!c.interval) c.interval = grade === 1 ? 1 : (grade === 2 ? 1 : 2);
      else if (c.interval === 1) c.interval = grade === 1 ? 2 : (grade === 2 ? 3 : 5);
      else c.interval = Math.max(c.interval + 1, Math.round(c.interval * (grade === 1 ? 1.2 : (c.ease || 2.3) * (grade === 3 ? 1.3 : 1))));
      c.ease = Math.min(2.8, Math.max(1.3, (c.ease || 2.3) + (grade === 1 ? -0.05 : grade === 3 ? 0.1 : 0)));
    }
    c.due = today() + c.interval;
    saveSRS(d);
  }

  /* ---------- answer normalisation ---------- */
  function normalize(s) {
    return String(s)
      .trim()
      .toLowerCase()
      .replace(/[’`]/g, "'")
      .replace(/\s+/g, " ")
      .replace(/[.!?¿¡;:]+$/g, "");
  }
  function stripAccents(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function loose(s) {
    return stripAccents(normalize(s)).replace(/['']/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();
  }
  // sequence form for word-order grading: drop ALL punctuation & accents, keep word order
  function seqNorm(s) {
    return stripAccents(String(s).toLowerCase())
      .replace(/[¿¡?!.,;:"“”'’()]/g, " ")
      .replace(/\s+/g, " ").trim();
  }
  function judge(input, answers) {
    var ni = normalize(input);
    if (!ni) return "no";
    for (var i = 0; i < answers.length; i++)
      if (ni === normalize(answers[i])) return "exact";
    for (var j = 0; j < answers.length; j++)
      if (loose(ni) === loose(answers[j])) return "close";
    return "no";
  }
  function asAnswers(ex) {
    if (ex.answers && ex.answers.length) return ex.answers;
    if (ex.answer != null) return [ex.answer];
    return [];
  }

  /* ---------- icons (inline SVG) ---------- */
  var SVG_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true">';
  var ICONS = {
    caret: SVG_OPEN + '<path d="M15 5l-7 7 7 7"/></svg>',
    speaker: SVG_OPEN + '<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4z"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5"/><path d="M18.5 7a7 7 0 0 1 0 10"/></svg>',
    play: SVG_OPEN + '<path d="M7 5v14l11-7z"/></svg>',
    pause: SVG_OPEN + '<path d="M8 5v14M16 5v14"/></svg>',
    timer: SVG_OPEN + '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2h5"/></svg>',
    check: SVG_OPEN + '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
    x: SVG_OPEN + '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
    search: SVG_OPEN + '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
    crosshair: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" stroke-width="1"/><path d="M9 0v18M0 9h18" stroke="currentColor" stroke-width="1"/></svg>'
  };
  function icon(name, cls) {
    return el("span", { class: "ico" + (cls ? " " + cls : ""), html: ICONS[name] || "" });
  }

  /* ---------- print ornaments ---------- */
  // three misregistered "plates" (blue, red, black) — the signature display element
  function plate(text, size) {
    return el("span", { class: "plate plate-" + (size || "lg") }, [
      el("span", { class: "plate-b", text: text }),
      el("span", { class: "plate-r", text: text }),
      el("span", { class: "plate-k", text: text })
    ]);
  }
  // 10-cell printer's grey wedge
  function wedge(frac, size) {
    var filled = Math.round(Math.max(0, Math.min(1, frac || 0)) * 10);
    var cells = [];
    for (var i = 0; i < 10; i++) cells.push(el("span", { class: "wedge-cell" + (i < filled ? " f" + Math.min(i, 5) : "") }));
    return el("span", { class: "wedge" + (size ? " wedge-" + size : "") }, cells);
  }
  // one tick per lesson of a level
  function ticks(ids, progress, currentId) {
    return el("div", { class: "ticks" }, ids.map(function (id) {
      var st = progress[id] && progress[id].done ? " done" : (id === currentId ? " cur" : "");
      return el("span", { class: "tick" + st });
    }));
  }
  // section header: 9px swatch + spaced uppercase label (+ optional action on the right)
  function eyebrow(label, tone, action) {
    return el("div", { class: "eyebrow-row" + (action ? " with-action" : "") }, [
      el("div", { class: "eyebrow" }, [el("span", { class: "swatch " + (tone || "b") }), el("span", { text: label })]),
      action || null
    ]);
  }
  function screenHead(title, sub) {
    return el("div", { class: "screen-head" }, [
      el("div", {}, [el("h1", { class: "screen-title", text: title }), sub ? el("div", { class: "screen-sub", text: sub }) : null]),
      icon("crosshair", "mark")
    ]);
  }
  // back-link row for pushed screens; the pomodoro widget is parked here on lesson screens
  function screenTop(backHref, backLabel, withTimer) {
    var slot = withTimer ? el("span", { class: "pomo-slot" }, [icon("timer")]) : null;
    var row = el("div", { class: "screen-top" }, [
      el("a", { class: "backlink", href: backHref }, [icon("caret"), el("span", { text: backLabel })]),
      el("div", { class: "screen-tools" }, [slot, icon("crosshair", "mark")])
    ]);
    placePomodoro(slot);
    return row;
  }
  // clear the main column; the pomodoro widget is parked outside first so innerHTML="" can't destroy it
  function resetContent() {
    placePomodoro(null);
    var c = document.getElementById("content");
    c.innerHTML = "";
    return c;
  }
  function placePomodoro(slot) {
    var p = document.getElementById("pomodoro");
    var home = document.getElementById("pomo-home");
    if (!p) return;
    if (slot) slot.appendChild(p);
    else if (home && p.parentNode !== home) home.appendChild(p);
  }

  /* ---------- helpers over the course outline ---------- */
  function outlineById(id) {
    for (var i = 0; i < (COURSE.outline || []).length; i++)
      if (COURSE.outline[i].id === id) return COURSE.outline[i];
    return null;
  }
  function unitOf(id) {
    for (var i = 0; i < (COURSE.units || []).length; i++)
      if (COURSE.units[i].ids.indexOf(id) !== -1) return COURSE.units[i];
    return null;
  }
  function titleOf(id) {
    var l = lessonById(id); if (l) return l.title;
    var o = outlineById(id); return o ? o.title : id;
  }
  function firstIncompleteId() {
    var progress = loadProgress();
    var ids = (COURSE.outline || []).map(function (o) { return o.id; });
    for (var i = 0; i < ids.length; i++) {
      if (!lessonById(ids[i])) continue;
      if (!(progress[ids[i]] && progress[ids[i]].done)) return ids[i];
    }
    return ids.length ? ids[0] : null;
  }
  function levelStats(code) {
    var progress = loadProgress();
    var ids = (COURSE.outline || []).filter(function (o) { return o.level === code; }).map(function (o) { return o.id; });
    var done = ids.filter(function (id) { return progress[id] && progress[id].done; }).length;
    return { total: ids.length, done: done, ids: ids };
  }
  function doneCount() {
    var p = loadProgress();
    return Object.keys(p).filter(function (k) { return p[k].done; }).length;
  }
  function studiedToday() { return loadStreak().last === today(); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function fmtDate() {
    try {
      var s = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
      return s.charAt(0).toUpperCase() + s.slice(1);
    } catch (e) { return ""; }
  }
  var EX_LABELS = { fill: "rellenar", mc: "opción múltiple", translate: "traducción", listen: "dictado", match: "emparejar", order: "ordenar", "listen-dialogue": "comprensión auditiva", conjugate: "conjugar" };

  /* ---------- tab bar + view state ---------- */
  function viewOf(hash) {
    if (hash === "" || hash === "home") return "home";
    if (hash.indexOf("map") === 0) return "map";
    if (hash === "review") return "review";
    if (hash === "glossary") return "glossary";
    if (hash === "progress") return "progress";
    if (hash.indexOf("exercises/") === 0) return "exercises";
    if (hash.indexOf("lesson/") === 0 || /^\d+$/.test(hash)) return "lesson";
    return "home";
  }
  function renderTabs() {
    var hash = (location.hash || "").replace("#", "");
    var view = viewOf(hash);
    if (document.body && document.body.setAttribute) document.body.setAttribute("data-view", view);
    var bar = document.getElementById("tabbar");
    if (!bar || !bar.querySelectorAll) return;
    Array.prototype.forEach.call(bar.querySelectorAll("a[data-tab]"), function (a) {
      a.classList.toggle("active", a.getAttribute("data-tab") === view);
    });
    var badge = bar.querySelector(".tab-badge");
    if (badge) {
      var due = srsDue().length;
      badge.textContent = due > 99 ? "99+" : String(due);
      badge.hidden = !due;
    }
  }
  var renderNav = renderTabs; // recordScore() and friends call renderNav()

  /* ---------- Hoy (home) ---------- */
  function levelIndex(currentId) {
    var curLevel = levelOfId(currentId);
    return el("div", { class: "index" }, (COURSE.levels || []).map(function (lv) {
      var st = levelStats(lv.code);
      return el("a", {
        class: "index-row" + (lv.code === curLevel ? " active" : "") + (st.done ? " started" : ""),
        href: "#map/" + lv.code
      }, [
        el("span", { class: "idx-code", text: lv.code }),
        el("span", { class: "idx-name", text: lv.name }),
        el("span", { class: "leader" }),
        el("span", { class: "idx-count", text: st.done + "/" + st.total })
      ]);
    }));
  }

  function renderHome() {
    var c = resetContent();
    var progress = loadProgress();
    var total = (COURSE.outline || []).length;
    var done = doneCount();
    var due = srsDue().length;
    var streak = streakCount();
    var cont = firstIncompleteId();

    c.appendChild(el("div", { class: "masthead" }, [
      el("div", { class: "rule-double" }),
      el("div", { class: "dateband" }, [
        el("span", { text: fmtDate() }),
        el("span", { class: "streak", text: "Racha · " + plural(streak, "día", "días") })
      ]),
      el("h1", { class: "masthead-title", text: "English" })
    ]));

    if (cont) {
      var lesson = lessonById(cont);
      var unit = unitOf(cont);
      var started = !!progress[cont] || done > 0;
      c.appendChild(el("section", { class: "continue" }, [
        el("div", { class: "kicker", text: "Continúa · " + (unit ? unit.name : levelOfId(cont)) }),
        el("h2", { class: "continue-title", text: titleOf(cont) }),
        el("div", { class: "meta", text: "Lección " + cont + " · " + levelOfId(cont) + (lesson && lesson.time ? " · " + lesson.time : "") }),
        el("a", { class: "textlink", href: "#lesson/" + cont, text: (started ? "Continuar la lección" : "Empezar la lección") + " →" })
      ]));
    }

    c.appendChild(el("section", {}, [
      el("div", { class: "kicker muted", text: "Para hoy" }),
      el("div", { class: "today-row" }, [
        el("span", { html: "<strong>" + plural(due, "tarjeta", "tarjetas") + "</strong> por repasar" }),
        el("a", { class: "textlink red", href: "#review", text: "Repasar →" })
      ]),
      el("div", { class: "today-row" }, [
        el("span", { text: studiedToday() ? "Hoy ya has estudiado ✓" : "Hoy todavía no has estudiado" }),
        el("a", { class: "textlink", href: "#progress", text: "Mi progreso →" })
      ])
    ]));

    if (!CAN_AUDIO) {
      c.appendChild(el("p", { class: "warn", text:
        "Tu navegador no ofrece síntesis de voz, así que los controles de escucha están ocultos. Todo lo demás funciona." }));
    }

    c.appendChild(el("section", {}, [
      el("div", { class: "kicker muted", text: "Índice · " + total + " lecciones" }),
      levelIndex(cont)
    ]));
    window.scrollTo(0, 0);
  }

  /* ---------- Lecciones (el mapa) ---------- */
  function renderMap(openCode) {
    var c = resetContent();
    var progress = loadProgress();
    var total = (COURSE.outline || []).length;
    var done = doneCount();
    var pct = total ? Math.round((done / total) * 100) : 0;
    var cont = firstIncompleteId();
    if (!openCode) openCode = levelOfId(cont);

    c.appendChild(screenHead("El mapa", total + " lecciones · A1 → C2"));
    c.appendChild(el("div", { class: "map-summary" }, [
      wedge(total ? done / total : 0),
      el("span", { class: "meta", text: done + " / " + total + " · " + pct + "%" })
    ]));
    if (cont) c.appendChild(el("p", { class: "meta map-follow" }, [
      "Sigues en: ", el("a", { href: "#lesson/" + cont, text: cont + " · " + titleOf(cont) })
    ]));

    (COURSE.levels || []).forEach(function (lv) {
      var st = levelStats(lv.code);
      var open = lv.code === openCode;
      var head = el("div", { class: "map-level" + (open ? " open" : ""), role: "button", tabindex: "0" }, [
        st.done ? plate(lv.code, "md") : el("span", { class: "plate plate-md flat", text: lv.code }),
        el("div", { class: "map-level-body" }, [
          el("div", { class: "map-level-top" }, [
            el("span", { class: "map-level-name", text: lv.name }),
            el("span", { class: "meta", text: st.done + "/" + st.total })
          ]),
          ticks(st.ids, progress, cont)
        ])
      ]);
      var list = el("div", { class: "map-lessons" });
      list.hidden = !open;
      st.ids.forEach(function (id) {
        var lesson = lessonById(id);
        var isDone = progress[id] && progress[id].done;
        var attrs = { class: "map-lesson" + (isDone ? " done" : "") + (id === cont ? " cur" : "") + (lesson ? "" : " disabled") };
        if (lesson) attrs.href = "#lesson/" + id;
        list.appendChild(el(lesson ? "a" : "div", attrs, [
          el("span", { class: "num", text: id }),
          el("span", { class: "ttl", text: titleOf(id) }),
          el("span", { class: "mk", text: isDone ? "✓" : (lesson ? "" : "·") })
        ]));
      });
      function toggle() { var show = list.hidden; list.hidden = !show; head.classList.toggle("open", show); }
      head.addEventListener("click", toggle);
      head.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
      c.appendChild(el("section", { class: "map-section" }, [head, list]));
    });
    window.scrollTo(0, 0);
  }

  /* ---------- lesson content sections ---------- */
  function renderVocab(lesson) {
    if (!lesson.vocab || !lesson.vocab.length) return null;
    var rows = lesson.vocab.map(function (v) {
      var attrs = { class: "vocab-row" };
      if (CAN_AUDIO) { attrs.onclick = function () { speak(v.en); }; attrs.role = "button"; }
      return el("div", attrs, [
        el("div", { class: "vocab-main" }, [
          el("span", { class: "term", text: v.en }),
          v.say ? el("span", { class: "say", text: v.say }) : null
        ]),
        el("span", { class: "gloss", text: v.es }),
        CAN_AUDIO ? icon("speaker", "vocab-ico") : null
      ]);
    });
    return el("section", {}, [
      eyebrow("Vocabulario · " + lesson.vocab.length, "r", CAN_AUDIO ? el("span", { class: "hint", text: "toca para oír" }) : null),
      el("div", { class: "vocab-list" }, rows)
    ]);
  }

  // dialogue lines: uppercase speaker, tappable English line, italic Spanish gloss
  function dialogueLines(lines, voices, cls) {
    var order = [];
    return lines.map(function (d) {
      if (d.sp && order.indexOf(d.sp) === -1) order.push(d.sp);
      var idx = d.sp ? order.indexOf(d.sp) % 2 : 0;
      var termAttrs = { class: "term", text: d.en };
      if (CAN_AUDIO) termAttrs.onclick = function () { speak(d.en, null, voices[d.sp]); };
      return el("p", { class: (cls || "dline") + " spk-" + idx }, [
        d.sp ? el("span", { class: "spk", text: d.sp }) : null,
        el("span", termAttrs),
        d.es ? el("span", { class: "gloss", text: d.es }) : null
      ]);
    });
  }

  function renderDialogue(lesson) {
    if (!lesson.dialogue || !lesson.dialogue.length) return null;
    var voices = dialogueVoices(lesson.dialogue);
    var lines = dialogueLines(lesson.dialogue, voices);
    var wrap = el("div", { class: "dialogue" }, lines.concat([
      el("p", { class: "hidden-note muted", text: "Transcripción oculta — solo escucha." })
    ]));
    var toggleTr = el("button", { class: "textlink small", type: "button", onclick: function () {
      wrap.classList.toggle("show-tr");
      toggleTr.textContent = wrap.classList.contains("show-tr") ? "Ocultar español" : "Mostrar español";
    } }, ["Mostrar español"]);
    var toggleText = el("button", { class: "textlink small quiet", type: "button", onclick: function () {
      var hidden = wrap.classList.toggle("hide-text");
      toggleText.textContent = hidden ? "Mostrar texto" : "Ocultar texto";
      toggleTr.disabled = hidden;
    } }, ["Ocultar texto"]);

    // Escuchar todo → Pausa → Continuar → (fin) Escuchar todo
    var playBtn = null;
    if (CAN_AUDIO) {
      var items = lesson.dialogue.map(function (d) { return { text: d.en, voice: voices[d.sp] }; });
      var state = "idle";
      var playLabel = el("span", { text: "Escuchar todo" });
      var playIco = icon("play");
      function highlight(i) { lines.forEach(function (p, k) { p.classList.toggle("playing", k === i); }); }
      function setState(st) {
        state = st;
        playLabel.textContent = st === "playing" ? "Pausa" : st === "paused" ? "Continuar" : "Escuchar todo";
        playIco.innerHTML = st === "playing" ? ICONS.pause : ICONS.play;
        if (st === "idle") highlight(-1);
      }
      playBtn = el("button", { class: "textlink", type: "button", onclick: function () {
        if (state === "playing") { pauseSpeak(); setState("paused"); }
        else if (state === "paused") { resumeSpeak(); setState("playing"); }
        else {
          var ok = speakSeq(items, { onLine: highlight, onEnd: function () { setState("idle"); } });
          setState(ok ? "playing" : "idle");
        }
      } }, [playIco, " ", playLabel]);
    }

    return el("section", {}, [
      eyebrow("Diálogo", "b", playBtn),
      el("div", { class: "row-controls" }, [toggleTr, toggleText]),
      wrap,
      renderDialogueQuiz(lesson.dialogueQuiz)
    ]);
  }

  function renderDialogueQuiz(questions) {
    if (!questions || !questions.length) return null;
    var box = el("div", { class: "dq" });
    function build() {
      box.innerHTML = "";
      box.appendChild(el("div", { class: "dq-title", text: "Comprensión · " + questions.length }));
      var answered = 0, correct = 0;
      var score = el("p", { class: "score-line" });
      questions.forEach(function (q, qi) {
        var locked = false;
        var choicesWrap = el("div", { class: "mc-choices" });
        (q.choices || []).forEach(function (choice) {
          var b = el("button", { class: "mc-choice", type: "button", onclick: function () {
            if (locked) return;
            locked = true; answered++;
            if (normalize(choice) === normalize(q.answer)) { b.classList.add("right"); correct++; }
            else {
              b.classList.add("wrong");
              Array.prototype.forEach.call(choicesWrap.children, function (cb) {
                if (normalize(cb.textContent) === normalize(q.answer)) cb.classList.add("right");
              });
            }
            if (answered === questions.length) {
              score.textContent = "Acertaste " + correct + "/" + questions.length + ".";
              score.appendChild(el("a", { class: "ex-show", href: "javascript:void 0", onclick: build, text: "Intentar de nuevo" }));
            }
          } }, [choice]);
          choicesWrap.appendChild(b);
        });
        box.appendChild(el("div", { class: "dq-q" }, [
          el("p", { class: "ex-prompt", text: (qi + 1) + ". " + q.q }),
          choicesWrap
        ]));
      });
      box.appendChild(score);
    }
    build();
    return box;
  }

  function renderReading(lesson) {
    if (!lesson.reading || !lesson.reading.en) return null;
    var r = lesson.reading;
    var enParas = String(r.en).split(/\n\n+/);
    var esParas = String(r.es || "").split(/\n\n+/);
    var enWrap = el("div", { class: "reading-term" }, enParas.map(function (p) {
      var attrs = { text: p };
      if (CAN_AUDIO) attrs.onclick = function () { speak(p); };
      return el("p", attrs);
    }));
    var esWrap = el("div", { class: "reading-gloss" }, esParas.map(function (p) { return el("p", { text: p }); }));
    var box = el("div", { class: "reading" }, [enWrap, esWrap]);
    var toggle = el("button", { class: "textlink small", type: "button", onclick: function () {
      box.classList.toggle("show-tr");
      toggle.textContent = box.classList.contains("show-tr") ? "Ocultar traducción" : "Mostrar traducción";
    } }, ["Mostrar traducción"]);
    var playAll = CAN_AUDIO ? el("button", { class: "textlink", type: "button", onclick: function () { speak(r.en); } }, [icon("play"), " Escuchar"]) : null;
    return el("section", {}, [
      eyebrow("Lectura" + (r.title ? " · " + r.title : ""), "b", playAll),
      el("div", { class: "row-controls" }, [toggle]),
      box
    ]);
  }

  function renderDiscussion(lesson) {
    if (!lesson.discussion || !lesson.discussion.length) return null;
    var items = lesson.discussion.map(function (q) {
      var text = typeof q === "string" ? q : q.en;
      var gloss = typeof q === "object" ? q.es : null;
      var attrs = { class: "term", text: text };
      if (CAN_AUDIO) attrs.onclick = function () { speak(text); };
      return el("li", {}, [el("span", attrs), gloss ? el("span", { class: "gloss", text: " — " + gloss }) : null]);
    });
    return el("section", { class: "discussion" }, [
      eyebrow("Conversación", "b"),
      el("p", { class: "hint", text: "Responde en voz alta con frases completas: prioriza comunicar sobre la perfección." }),
      el("ul", {}, items)
    ]);
  }

  /* ---------- full lesson ---------- */
  function renderLesson(id) {
    var lesson = lessonById(id);
    if (!lesson) { renderHome(); return; }
    var c = resetContent();
    var progress = loadProgress();
    var unit = unitOf(id);

    c.appendChild(screenTop("#map", "Lecciones", true));
    c.appendChild(el("div", { class: "lesson-head" }, [
      plate(lesson.id, "lg"),
      el("h1", { class: "lesson-title", text: lesson.title }),
      el("div", { class: "meta", text: (unit ? unit.name : lesson.level) + (lesson.time ? " · " + lesson.time : "") })
    ]));

    if (lesson.objectives && lesson.objectives.length) {
      c.appendChild(el("section", {}, [
        eyebrow("Objetivos", "b"),
        el("ul", { class: "objectives" }, lesson.objectives.map(function (o) { return el("li", { text: o }); }))
      ]));
    }
    [renderVocab(lesson), renderDialogue(lesson), renderReading(lesson)].forEach(function (s) { if (s) c.appendChild(s); });
    if (lesson.grammarHTML) c.appendChild(el("section", {}, [eyebrow("Gramática", "k"), el("div", { class: "prose", html: lesson.grammarHTML })]));
    if (lesson.pronTipHTML) c.appendChild(el("section", {}, [eyebrow("Pronunciación", "tint"), el("div", { class: "prose", html: lesson.pronTipHTML })]));
    var disc = renderDiscussion(lesson);
    if (disc) c.appendChild(disc);
    if (lesson.cultureHTML) c.appendChild(el("section", {}, [eyebrow("Nota cultural", "r"), el("div", { class: "prose", html: lesson.cultureHTML })]));

    // exercises call-to-action + completion status
    var n = (lesson.exercises || []).length;
    if (n) {
      var types = [];
      lesson.exercises.forEach(function (ex) { var t = EX_LABELS[ex.type] || ex.type; if (types.indexOf(t) === -1) types.push(t); });
      c.appendChild(el("div", { class: "ex-cta" }, [
        el("div", {}, [
          el("div", { class: "ex-cta-title", text: "Ejercicios · " + n }),
          el("div", { class: "meta", text: types.join(" · ") })
        ]),
        el("a", { class: "btn primary", href: "#exercises/" + id, text: "Empezar →" })
      ]));
    }
    var pr = progress[id];
    var seedLink = el("button", { class: "textlink small", type: "button", onclick: function () {
      srsSeedFromLesson(lesson); renderTabs();
      seedLink.textContent = "Añadido al mazo ✓"; seedLink.disabled = true;
    } }, ["Añadir el vocabulario al mazo →"]);
    c.appendChild(el("div", { class: "lesson-status" + (pr && pr.done ? " done" : "") }, [
      el("span", { text: pr && pr.done ? "Lección terminada ✓" : (pr ? "Mejor puntuación: " + pr.best + " / " + pr.total : "Completa los ejercicios para terminar la lección.") }),
      seedLink
    ]));

    // prev / next
    var ids = COURSE.lessons.map(function (l) { return l.id; });
    var pos = ids.indexOf(id);
    c.appendChild(el("div", { class: "lesson-nav" }, [
      pos > 0 ? el("a", { class: "textlink", href: "#lesson/" + ids[pos - 1], text: "← Lección " + ids[pos - 1] }) : el("span"),
      pos < ids.length - 1 ? el("a", { class: "textlink", href: "#lesson/" + ids[pos + 1], text: "Lección " + ids[pos + 1] + " →" }) : el("span")
    ]));

    window.scrollTo(0, 0);
    c.focus();
  }

  /* ---------- exercise types (shared with the old layout) ---------- */
  function revealLink(answers, feedback, label) {
    return el("a", { class: "ex-show", href: "javascript:void 0", onclick: function () {
      feedback.className = "ex-feedback";
      feedback.innerHTML = (label || "Respuesta") + ": <strong>" + answers[0] + "</strong>";
    }, text: "Ver respuesta" });
  }

  function renderFill(ex, card, feedback, mark) {
    var answers = asAnswers(ex);
    var input = el("input", { class: "ex-input", type: "text", placeholder: "tu respuesta", autocomplete: "off", autocapitalize: "off", spellcheck: "false" });
    var line = el("p", { class: "ex-fill" }, [
      ex.before ? el("span", { text: ex.before + " " }) : null,
      input,
      ex.after ? el("span", { text: " " + ex.after }) : null,
      ex.cue ? el("span", { class: "ex-cue", text: " (" + ex.cue + ")" }) : null
    ]);
    var check = el("button", { class: "btn small", onclick: function () {
      var v = judge(input.value, answers);
      if (v === "exact" || v === "close") mark("correct", "✓ ¡Correcto!");
      else mark("incorrect", "✗ Casi. Respuesta: <strong>" + answers[0] + "</strong>");
    } }, ["Comprobar"]);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") check.click(); });
    card.appendChild(line);
    card.appendChild(el("div", { class: "ex-controls" }, [check, revealLink(answers, feedback)]));
  }

  function renderMC(ex, card, feedback, mark) {
    if (ex.prompt) card.appendChild(el("p", { class: "ex-prompt", text: ex.prompt }));
    var choicesWrap = el("div", { class: "mc-choices" });
    var locked = false;
    ex.choices.forEach(function (choice) {
      var b = el("button", { class: "mc-choice", onclick: function () {
        if (locked) return;
        locked = true;
        if (normalize(choice) === normalize(ex.answer)) { b.classList.add("right"); mark("correct", "✓ ¡Correcto!"); }
        else {
          b.classList.add("wrong");
          mark("incorrect", "✗ Respuesta: <strong>" + ex.answer + "</strong>");
          Array.prototype.forEach.call(choicesWrap.children, function (cb) {
            if (normalize(cb.textContent) === normalize(ex.answer)) cb.classList.add("right");
          });
        }
      } }, [choice]);
      choicesWrap.appendChild(b);
    });
    card.appendChild(choicesWrap);
  }

  function renderTranslate(ex, card, feedback, mark) {
    var answers = asAnswers(ex);
    if (ex.prompt) card.appendChild(el("p", { class: "ex-prompt", text: "“" + ex.prompt + "”" }));
    var input = el("input", { class: "ex-input wide", type: "text", placeholder: "escribe en inglés…", autocomplete: "off", spellcheck: "false" });
    var check = el("button", { class: "btn small", onclick: function () {
      var v = judge(input.value, answers);
      if (v === "exact" || v === "close") mark("correct", "✓ ¡Correcto!");
      else mark("incorrect", "✗ Una buena respuesta: <strong>" + answers[0] + "</strong>");
    } }, ["Comprobar"]);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") check.click(); });
    card.appendChild(el("div", { class: "ex-controls" }, [input, check, revealLink(answers, feedback, "Respuesta de ejemplo")]));
  }

  function renderListen(ex, card, feedback, mark) {
    var answers = asAnswers(ex);
    var phrase = ex.audio || answers[0];
    if (!CAN_AUDIO) {
      // graceful fallback: show the text so the exercise is still doable
      card.appendChild(el("p", { class: "muted", text: "(Audio no disponible en este navegador — aquí está la frase para transcribir:) " + phrase }));
    }
    var play = el("button", { class: "btn small", type: "button", onclick: function () { speak(phrase); } }, [icon("play"), " Reproducir audio"]);
    var input = el("input", { class: "ex-input wide", type: "text", placeholder: "escribe lo que oyes…", autocomplete: "off", spellcheck: "false" });
    var check = el("button", { class: "btn small", onclick: function () {
      var v = judge(input.value, answers);
      if (v === "exact" || v === "close") mark("correct", "✓ ¡Correcto!");
      else mark("incorrect", "✗ Era: <strong>" + answers[0] + "</strong>");
    } }, ["Comprobar"]);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") check.click(); });
    card.appendChild(el("div", { class: "ex-controls" }, [play, input, check, revealLink(answers, feedback)]));
  }

  /* Listening comprehension: play a short conversation (TTS), hidden transcript,
     then comprehension questions checked together. */
  function renderListenDialogue(ex, card, feedback, mark) {
    var lines = ex.lines || [];
    var voices = dialogueVoices(lines);
    var items = lines.map(function (d) { return { text: d.en, voice: voices[d.sp] }; });
    var questions = ex.questions || [];

    if (!CAN_AUDIO) {
      card.appendChild(el("p", { class: "muted", text: "(Audio no disponible en este navegador — lee la transcripción y responde.)" }));
    }
    var playBtn = el("button", { class: "btn", type: "button", onclick: function () { speakSeq(items); } }, [icon("play"), " Escuchar la conversación"]);
    var againBtn = CAN_AUDIO ? el("button", { class: "btn small ghost", type: "button", onclick: function () { speakSeq(items); } }, ["Volver a escuchar"]) : null;

    var transcript = el("div", { class: "ld-transcript hidden" }, lines.map(function (d) {
      return el("p", { class: "dline" }, [
        audioBtn(d.en, "inline", voices[d.sp]),
        d.sp ? el("span", { class: "spk", text: d.sp + ": " }) : null,
        el("span", { class: "term", text: d.en }),
        d.es ? el("span", { class: "gloss", text: " — " + d.es }) : null
      ]);
    }));
    var trToggle = el("button", { class: "btn small ghost", type: "button", onclick: function () {
      var hidden = transcript.classList.toggle("hidden");
      trToggle.textContent = hidden ? "Ver transcripción" : "Ocultar transcripción";
    } }, ["Ver transcripción"]);
    if (!CAN_AUDIO) transcript.classList.remove("hidden");

    card.appendChild(el("div", { class: "ex-controls" }, [playBtn, againBtn, trToggle]));
    card.appendChild(transcript);

    var answered = [];
    var correctFlags = [];
    questions.forEach(function (q, qi) {
      answered.push(false);
      correctFlags.push(false);
      var qWrap = el("div", { class: "ld-q" });
      qWrap.appendChild(el("p", { class: "ex-prompt", text: (qi + 1) + ". " + q.q }));
      var choicesWrap = el("div", { class: "mc-choices" });
      var lockedLocal = false;
      (q.choices || []).forEach(function (choice) {
        var b = el("button", { class: "mc-choice", onclick: function () {
          if (lockedLocal) return;
          lockedLocal = true;
          answered[qi] = true;
          if (normalize(choice) === normalize(q.answer)) { b.classList.add("right"); correctFlags[qi] = true; }
          else {
            b.classList.add("wrong");
            Array.prototype.forEach.call(choicesWrap.children, function (cb) {
              if (normalize(cb.textContent) === normalize(q.answer)) cb.classList.add("right");
            });
          }
          if (answered.every(Boolean)) {
            var allRight = correctFlags.every(Boolean);
            var got = correctFlags.filter(Boolean).length;
            if (allRight) mark("correct", "✓ ¡Todo correcto! (" + got + "/" + questions.length + ")");
            else mark("incorrect", "✗ " + got + "/" + questions.length + " correctas. Vuelve a escuchar.");
          }
        } }, [choice]);
        choicesWrap.appendChild(b);
      });
      qWrap.appendChild(choicesWrap);
      card.appendChild(qWrap);
    });
  }

  function renderMatch(ex, card, feedback, mark) {
    var pairs = ex.pairs || [];
    var total = pairs.length, matched = 0;
    var selected = null; // {side, key, btn}
    var grid = el("div", { class: "match-grid" });
    var left = el("div", { class: "match-col" });
    var right = el("div", { class: "match-col" });

    function makeTile(side, key, label) {
      var b = el("button", { class: "match-tile", type: "button" }, [label]);
      b.addEventListener("click", function () {
        if (b.classList.contains("done")) return;
        if (selected && selected.side === side) { // re-pick same side
          selected.btn.classList.remove("sel"); selected = null;
        }
        if (!selected) {
          selected = { side: side, key: key, btn: b };
          b.classList.add("sel");
          return;
        }
        // selected is the other side
        var ok = selected.key === key;
        var other = selected.btn;
        selected.btn.classList.remove("sel");
        selected = null;
        if (ok) {
          b.classList.add("done"); other.classList.add("done");
          matched++;
          if (matched === total) mark("correct", "✓ ¡Todo emparejado!");
        } else {
          b.classList.add("miss"); other.classList.add("miss");
          setTimeout(function () { b.classList.remove("miss"); other.classList.remove("miss"); }, 500);
        }
      });
      return b;
    }

    shuffle(pairs.map(function (p, i) { return i; })).forEach(function (i) {
      left.appendChild(makeTile("L", i, pairs[i].en));
    });
    shuffle(pairs.map(function (p, i) { return i; })).forEach(function (i) {
      right.appendChild(makeTile("R", i, pairs[i].es));
    });
    grid.appendChild(left); grid.appendChild(right);
    card.appendChild(el("p", { class: "muted", text: "Toca una palabra en inglés y luego su traducción al español." }));
    card.appendChild(grid);
  }

  function renderOrder(ex, card, feedback, mark) {
    var answer = (asAnswers(ex)[0]) || "";
    var tokens = ex.tokens || [];
    var bank = el("div", { class: "order-bank" });
    var build = el("div", { class: "order-build" });

    function addToBuild(tok, fromBtn) {
      var t = el("button", { class: "tok", type: "button" }, [tok]);
      t.addEventListener("click", function () { build.removeChild(t); fromBtn.style.display = ""; });
      build.appendChild(t);
      fromBtn.style.display = "none";
    }
    shuffle(tokens).forEach(function (tok) {
      var b = el("button", { class: "tok", type: "button" }, [tok]);
      b.addEventListener("click", function () { addToBuild(tok, b); });
      bank.appendChild(b);
    });
    var check = el("button", { class: "btn small", onclick: function () {
      var built = Array.prototype.map.call(build.children, function (c) { return c.textContent; }).join(" ");
      if (seqNorm(built) === seqNorm(answer)) mark("correct", "✓ ¡Correcto!");
      else mark("incorrect", "✗ Respuesta: <strong>" + answer + "</strong>");
    } }, ["Comprobar"]);
    card.appendChild(el("p", { class: "muted", text: "Toca las palabras en orden para construir la frase. Toca una palabra elegida para devolverla." }));
    card.appendChild(build);
    card.appendChild(bank);
    card.appendChild(el("div", { class: "ex-controls" }, [check, revealLink([answer], feedback)]));
  }

  function renderConjugate(ex, card, feedback, mark) {
    var rows = ex.rows || [];
    var inputs = [];
    if (ex.verb) card.appendChild(el("p", { class: "ex-prompt", text: "Verbo: " + ex.verb }));
    var table = el("table", { class: "conj-table" });
    var tbody = el("tbody", {});
    rows.forEach(function (r) {
      var inp = el("input", { class: "ex-input", type: "text", placeholder: "…", autocomplete: "off", autocapitalize: "off", spellcheck: "false" });
      inputs.push({ inp: inp, answer: r.answer });
      tbody.appendChild(el("tr", {}, [
        el("td", { class: "conj-pron", text: r.pronoun }),
        el("td", {}, [inp])
      ]));
    });
    table.appendChild(tbody);
    var check = el("button", { class: "btn small", onclick: function () {
      var allRight = true, anyWrong = [];
      inputs.forEach(function (it) {
        var v = judge(it.inp.value, [it.answer]);
        if (v === "no") { allRight = false; it.inp.classList.add("wrong-input"); anyWrong.push(it.answer); }
        else it.inp.classList.remove("wrong-input");
      });
      if (allRight) mark("correct", "✓ ¡Correcto!");
      else mark("incorrect", "✗ Revisa: <strong>" + anyWrong.join(", ") + "</strong>");
    } }, ["Comprobar todo"]);
    card.appendChild(table);
    card.appendChild(el("div", { class: "ex-controls" }, [check]));
  }

  /* ---------- exercises: one at a time, then a score plate ---------- */
  function renderExercisesScreen(id) {
    var lesson = lessonById(id);
    if (!lesson || !lesson.exercises || !lesson.exercises.length) { renderLesson(id); return; }
    var c = resetContent();
    var n = lesson.exercises.length;
    var idx = 0;
    var results = lesson.exercises.map(function () { return null; });

    c.appendChild(screenTop("#lesson/" + id, "Lección " + id, true));
    var pos = el("div", { class: "ex-pos" });
    var stage = el("div", { class: "ex-stage" });
    c.appendChild(pos);
    c.appendChild(stage);

    function paintPos() {
      pos.innerHTML = "";
      pos.appendChild(wedge(idx / n, "sm"));
      pos.appendChild(el("span", { class: "meta", text: Math.min(idx + 1, n) + " / " + n }));
    }
    function finish() {
      var correct = results.filter(function (r) { return r === "correct"; }).length;
      recordScore(lesson.id, correct, n);
      pos.innerHTML = "";
      stage.innerHTML = "";
      stage.appendChild(el("div", { class: "ex-summary" }, [
        plate(String(correct), "lg"),
        el("div", { class: "meta", text: "de " + n + " a la primera" }),
        el("p", { class: "lead", text: correct === n ? "¡Pleno! Impresionante." : "Los fallos volverán a aparecer en el repaso." }),
        el("div", { class: "btn-row" }, [
          el("a", { class: "btn primary", href: "#lesson/" + id, text: "Volver a la lección" }),
          el("a", { class: "btn", href: "#review", text: "Repasar ahora" })
        ])
      ]));
      window.scrollTo(0, 0);
    }
    function showEx() {
      if (idx >= n) { finish(); return; }
      paintPos();
      stage.innerHTML = "";
      var ex = lesson.exercises[idx];
      var i = idx;
      var card = el("div", { class: "ex-card" });
      card.appendChild(el("div", { class: "kicker", text: EX_LABELS[ex.type] || ex.type }));
      card.appendChild(el("p", { class: "ex-instr", text: ex.instructions || "" }));
      var feedback = el("div", { class: "ex-feedback" });
      var nextBtn = el("button", { class: "btn primary", type: "button", onclick: function () { idx++; showEx(); } },
        [i === n - 1 ? "Terminar" : "Siguiente"]);
      nextBtn.hidden = true;
      function mark(state) {
        results[i] = state;
        feedback.className = "ex-feedback " + (state === "correct" ? "ok" : "bad");
        feedback.innerHTML = state === "correct" ? ICONS.check + "<span>Correcto</span>" : ICONS.x + "<span>Inténtalo otra vez</span>";
        nextBtn.hidden = false;
      }
      if (ex.type === "fill") renderFill(ex, card, feedback, mark);
      else if (ex.type === "mc") renderMC(ex, card, feedback, mark);
      else if (ex.type === "translate") renderTranslate(ex, card, feedback, mark);
      else if (ex.type === "listen") renderListen(ex, card, feedback, mark);
      else if (ex.type === "listen-dialogue") renderListenDialogue(ex, card, feedback, mark);
      else if (ex.type === "match") renderMatch(ex, card, feedback, mark);
      else if (ex.type === "order") renderOrder(ex, card, feedback, mark);
      else if (ex.type === "conjugate") renderConjugate(ex, card, feedback, mark);
      else {
        card.appendChild(el("p", { class: "muted", text: "(tipo de ejercicio desconocido: " + ex.type + ")" }));
        results[i] = "correct"; nextBtn.hidden = false;
      }
      card.appendChild(el("div", { class: "ex-fbrow" }, [feedback, nextBtn]));
      stage.appendChild(card);
      window.scrollTo(0, 0);
    }
    showEx();
  }

  /* ---------- Repaso (SRS flashcards) ---------- */
  function renderReview() {
    var c = resetContent();
    var queue = shuffle(srsDue());
    var totalToday = queue.length;

    if (!srsCount()) {
      var cont = firstIncompleteId();
      var lesson = cont && lessonById(cont);
      c.appendChild(screenHead("Repaso", "repetición espaciada"));
      c.appendChild(el("div", { class: "empty" }, [
        el("p", { class: "lead italic", text: "Tu mazo está vacío. Las palabras entran solas al terminar los ejercicios de una lección — o siembra el mazo ahora:" }),
        lesson ? el("button", { class: "btn red primary", type: "button", onclick: function () { srsSeedFromLesson(lesson); renderTabs(); renderReview(); } },
          ["Añadir la Lección " + cont + " al mazo"]) : null
      ]));
      return;
    }
    if (!totalToday) {
      c.appendChild(screenHead("Repaso", "repetición espaciada"));
      c.appendChild(el("div", { class: "empty" }, [
        el("p", { class: "lead", text: "Mazo al día" }),
        el("p", { class: "lead italic", text: "Nada pendiente por ahora. Vuelve mañana, o adelanta el repaso de todas las palabras." }),
        el("button", { class: "btn", type: "button", onclick: function () {
          var d = loadSRS();
          queue = shuffle(Object.keys(d.cards).map(function (k) { return d.cards[k]; }));
          if (queue.length) { totalToday = queue.length; start(); }
        } }, ["Adelantar · " + plural(srsCount(), "palabra", "palabras")])
      ]));
      return;
    }
    start();

    function start() {
      c = resetContent();
      c.appendChild(screenHead("Repaso", plural(totalToday, "tarjeta para hoy", "tarjetas para hoy")));
      var line = el("p", { class: "review-line" });
      var card = el("div", { class: "fcard", role: "button", tabindex: "0" });
      var graded = el("div", { class: "grade-row" });
      var done = 0, flipped = false, cur = null;

      [{ g: 0, label: "Otra vez", cls: "g-again" }, { g: 1, label: "Difícil", cls: "g-hard" },
       { g: 2, label: "Bien", cls: "g-good" }, { g: 3, label: "Fácil", cls: "g-easy" }].forEach(function (gr) {
        graded.appendChild(el("button", { class: "btn " + gr.cls, type: "button", onclick: function () {
          if (!cur) return;
          srsGrade(cur, gr.g);
          if (gr.g === 0) queue.push(cur); // show again this session
          done++;
          next();
        } }, [gr.label]));
      });

      function front() {
        var say = CAN_AUDIO ? icon("speaker") : null;
        var f = el("div", { class: "fc-front" }, [el("span", { text: cur.en }), say]);
        if (say) say.addEventListener("click", function (e) { e.stopPropagation(); speak(cur.en); });
        return f;
      }
      function show() {
        flipped = false;
        card.innerHTML = "";
        card.appendChild(el("div", { class: "fc-cue", text: "Lección " + (cur.lessonId || "") + " · ¿qué significa?" }));
        card.appendChild(front());
        card.appendChild(el("div", { class: "fc-hint", text: "toca la tarjeta para ver la respuesta" }));
        graded.style.display = "none";
        line.textContent = "Tarjeta " + Math.min(done + 1, totalToday) + " de " + totalToday + " · " + queue.length + " en cola";
      }
      function reveal() {
        if (flipped) return;
        flipped = true;
        card.innerHTML = "";
        card.appendChild(el("div", { class: "fc-cue", text: "Lección " + (cur.lessonId || "") }));
        card.appendChild(front());
        card.appendChild(el("div", { class: "fc-rule" }));
        card.appendChild(el("div", { class: "fc-back", text: cur.es }));
        graded.style.display = "flex";
      }
      function next() {
        if (!queue.length) {
          c.innerHTML = "";
          c.appendChild(screenHead("Repaso", "repetición espaciada"));
          c.appendChild(el("div", { class: "ex-summary" }, [
            plate(String(done), "lg"),
            el("div", { class: "meta", text: plural(done, "tarjeta repasada", "tarjetas repasadas") }),
            el("p", { class: "lead", text: "Repaso completo. ¡Bien hecho!" }),
            el("div", { class: "btn-row" }, [el("a", { class: "btn primary", href: "#home", text: "Volver a Hoy" })])
          ]));
          touchStreak();
          renderTabs();
          return;
        }
        cur = queue.shift();
        show();
      }
      card.addEventListener("click", reveal);
      card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); reveal(); } });
      c.appendChild(line);
      c.appendChild(card);
      c.appendChild(graded);
      next();
    }
    window.scrollTo(0, 0);
  }

  /* ---------- Glosario (search lessons + all vocabulary) ---------- */
  function allVocab() {
    var out = [], seen = {};
    COURSE.lessons.forEach(function (l) {
      (l.vocab || []).forEach(function (v) {
        if (!v || !v.en) return;
        var k = v.en.toLowerCase();
        if (seen[k]) return;
        seen[k] = 1;
        out.push({ en: v.en, es: v.es, say: v.say, lessonId: l.id, lessonTitle: l.title });
      });
    });
    out.sort(function (a, b) { return a.en.localeCompare(b.en, "en"); });
    return out;
  }
  function renderGlossary() {
    var c = resetContent();
    var vocab = allVocab();
    c.appendChild(screenHead("Glosario", vocab.length + " palabras del curso"));
    var search = el("input", { class: "search-input", id: "glossary-search", type: "search",
      placeholder: "Busca en inglés o español…", autocomplete: "off", autocapitalize: "off", spellcheck: "false" });
    c.appendChild(el("div", { class: "search-wrap" }, [icon("search"), search]));
    var list = el("div", { class: "gloss-list" });
    c.appendChild(list);

    function row(v) {
      var say = CAN_AUDIO ? icon("speaker", "vocab-ico") : null;
      if (say) say.addEventListener("click", function () { speak(v.en); });
      return el("div", { class: "gloss-row" }, [
        el("div", { class: "gloss-main" }, [
          el("div", {}, [el("span", { class: "term", text: v.en }), v.say ? el("span", { class: "say", text: v.say }) : null]),
          el("div", { class: "es", text: v.es })
        ]),
        el("a", { class: "gloss-link", href: "#lesson/" + v.lessonId, text: "L" + v.lessonId + " →" }),
        say
      ]);
    }
    function paint(raw) {
      list.innerHTML = "";
      var q = loose(raw || "");
      if (q) {
        var lessons = (COURSE.outline || []).filter(function (o) {
          return loose(o.title).indexOf(q) !== -1 || String(o.id).indexOf(raw.trim()) === 0;
        }).slice(0, 6);
        if (lessons.length) {
          list.appendChild(el("div", { class: "sr-head", text: "Lecciones" }));
          lessons.forEach(function (o) {
            var loaded = !!lessonById(o.id);
            var attrs = { class: "sr-row" + (loaded ? "" : " disabled") };
            if (loaded) attrs.href = "#lesson/" + o.id;
            list.appendChild(el(loaded ? "a" : "div", attrs, [
              el("span", { class: "num", text: o.id }), el("span", { text: o.title }), el("span", { class: "meta", text: o.level })
            ]));
          });
          list.appendChild(el("div", { class: "sr-head", text: "Vocabulario" }));
        }
      }
      var rows = vocab.filter(function (v) {
        if (!q) return true;
        return loose(v.en).indexOf(q) !== -1 || loose(v.es).indexOf(q) !== -1;
      }).slice(0, 300);
      rows.forEach(function (v) { list.appendChild(row(v)); });
      if (!rows.length) list.appendChild(el("p", { class: "lead italic", text: "Sin resultados para «" + raw + "»." }));
    }
    search.addEventListener("input", function () { paint(search.value); });
    paint("");
    window.scrollTo(0, 0);
  }

  /* ---------- Progreso ---------- */
  function renderProgress() {
    var c = resetContent();
    var total = (COURSE.outline || []).length;
    var done = doneCount();
    var streak = streakCount();
    var due = srsDue().length;
    var cont = firstIncompleteId();

    c.appendChild(screenTop("#home", "Hoy", false));
    c.appendChild(el("div", {}, [
      plate(String(streak), "lg"),
      el("div", { class: "streak-line", text: (streak === 1 ? "día de racha" : "días de racha") + " · " + (studiedToday() ? "hoy ya has estudiado" : "hoy todavía no") })
    ]));
    c.appendChild(el("section", {}, [
      el("div", { class: "kicker muted", text: "Curso" }),
      el("div", { class: "map-summary" }, [wedge(total ? done / total : 0), el("span", { class: "meta", text: done + " / " + total + " lecciones" })]),
      levelIndex(cont)
    ]));
    c.appendChild(el("section", {}, [
      el("div", { class: "kicker muted", text: "Mazo de repaso" }),
      el("div", { class: "stat-line", html: "<strong>" + srsCount() + "</strong> tarjetas en total · <strong>" + due + "</strong> para hoy" })
    ]));
    c.appendChild(el("section", {}, [
      el("div", { class: "kicker muted", text: "Ajustes" }),
      el("div", { class: "settings" }, [
        el("div", { class: "settings-row" }, [el("span", { text: "Tema" }), el("button", { class: "textlink", id: "theme-toggle", type: "button", text: "Claro" })]),
        el("div", { class: "settings-row" }, [el("span", { text: "Atajos de teclado" }), el("button", { class: "textlink", id: "kbd-help", type: "button", text: "Ver →" })]),
        el("div", { class: "settings-row" }, [el("span", { text: "Otros idiomas" }), el("a", { class: "textlink", id: "brand", href: "../", text: "Todos los cursos →" })])
      ])
    ]));
    if (window.SHELL && window.SHELL.paintThemeButtons) window.SHELL.paintThemeButtons();
    window.scrollTo(0, 0);
  }

  /* ---------- routing ---------- */
  function route() {
    var hash = (location.hash || "").replace("#", "");
    renderTabs();
    if (hash === "" || hash === "home") renderHome();
    else if (hash === "map" || hash.indexOf("map/") === 0) renderMap(hash.split("/")[1] || null);
    else if (hash === "review") renderReview();
    else if (hash === "glossary") renderGlossary();
    else if (hash === "progress") renderProgress();
    else if (hash.indexOf("exercises/") === 0) renderExercisesScreen(hash.slice(10));
    else if (hash.indexOf("lesson/") === 0) renderLesson(hash.slice(7));
    else if (/^\d+$/.test(hash)) renderLesson(hash); // legacy #NN
    else renderHome();
  }

  function init() {
    window.addEventListener("hashchange", route);
    if (TTS) window.speechSynthesis.getVoices(); // warm the voice list
    if (!COURSE.lessons.length) {
      document.getElementById("content").innerHTML =
        "<h1>No se cargaron las lecciones</h1><p>Los archivos de datos no se cargaron. Asegúrate de que la carpeta <code>data/</code> esté junto a <code>index.html</code>.</p>";
      return;
    }
    COURSE.lessons.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
    route();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
