/* =====================================================================
 * World Model 60s Tour — one-click auto explainer for exhibition visitors
 *  1 질문 → 2 유리잔 비유 → 3 AI의 상상(고스트 낙하) → 4 현실(실제 물리 낙하)
 *  → 5 비교 → 6 정리
 * Drives the real 3D lab via window.spatialLab (davies.html).
 * Public API: window.WorldModelTour = { play, close, isPlaying }
 * ===================================================================== */
(() => {
  "use strict";

  const ABORT = { abort: true };
  const KIOSK = new URLSearchParams(location.search).get("kiosk") === "1";
  const KIOSK_IDLE_MS = 60000;

  const ICON = {
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
    next: '<path d="M6 5.5l9 6.5-9 6.5z"/><path d="M18.5 5.5v13"/>',
    sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    cause: '<circle cx="5.5" cy="12" r="2.5"/><circle cx="18.5" cy="12" r="2.5"/><path d="M8 12h8M13.5 9.5 16 12l-2.5 2.5"/>',
    shield: '<path d="M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
    spark: '<path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4"/><circle cx="12" cy="12" r="3"/>'
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;

  const CHAPTERS = [
    { label: "질문", est: 5200 },
    { label: "비유", est: 16500 },
    { label: "AI의 상상", est: 15000 },
    { label: "현실", est: 5500 },
    { label: "비교", est: 10000 },
    { label: "정리", est: 15000 }
  ];

  // ------------------------------------------------------------------ state
  let root = null;
  const el = {};
  let token = 0;
  let running = false;
  let paused = false;
  let muted = false;
  let chapter = 0;
  let chapterElapsed = 0;
  let mode = "full";       // full | lab | labcard
  let loopId = 0;
  let lastFocus = null;
  let kioskRun = false;
  let predicted = null;
  let measured = null;

  try { muted = localStorage.getItem("wmt-muted") === "1"; } catch (_) { /* ignore */ }

  // ------------------------------------------------------------------ timing helpers
  // Every helper promise gets a noop catch so aborted scenes never surface as "unhandled rejection".
  const quiet = (p) => { p.catch(() => {}); return p; };
  function wait(ms, tk) {
    return quiet(new Promise((res, rej) => {
      let left = ms;
      let last = performance.now();
      const step = (now) => {
        if (tk !== token) return rej(ABORT);
        if (!paused) left -= now - last;
        last = now;
        if (left <= 0) return res();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }));
  }
  // Await an external promise but bail out if the show was skipped/closed.
  function until(p, tk) {
    return quiet(new Promise((res, rej) => {
      const iv = setInterval(() => { if (tk !== token) { clearInterval(iv); rej(ABORT); } }, 80);
      Promise.resolve(p).then((v) => { clearInterval(iv); tk === token ? res(v) : rej(ABORT); },
                              () => { clearInterval(iv); tk === token ? res(null) : rej(ABORT); });
    }));
  }

  // ------------------------------------------------------------------ narration (Recorded Studio Audio with browser TTS fallback)
  const AUDIO_MAP = {
    "0": "davies-assets/audio/world_model/wm_01.wav?v=20261026",
    "1a": "davies-assets/audio/world_model/wm_02.wav?v=20261026",
    "1b": "davies-assets/audio/world_model/wm_03.wav?v=20261026",
    "2a": "davies-assets/audio/world_model/wm_04.wav?v=20261026",
    "2b": "davies-assets/audio/world_model/wm_05.wav?v=20261026",
    "3": "davies-assets/audio/world_model/wm_06.wav?v=20261026",
    "4": "davies-assets/audio/world_model/wm_07.wav?v=20261026",
    "5": "davies-assets/audio/world_model/wm_08.wav?v=20261026"
  };

  let currentAudio = null;
  let voice = null;

  function preloadTourAudio() {
    try {
      Object.values(AUDIO_MAP).forEach((src) => {
        const a = new Audio();
        a.preload = "auto";
        a.src = src;
      });
    } catch (_) {}
  }
  preloadTourAudio();

  function pickVoice() {
    const synth = window.speechSynthesis;
    if (!synth) return null;
    const ko = synth.getVoices().filter((v) => /^ko/i.test(v.lang));
    if (!ko.length) return null;
    const female = /female|여성|yuna|sun-?hi|heami|seoyeon|jimin|google 한국/i;
    return ko.find((v) => female.test(v.name) && /natural|online|neural|google/i.test(v.name)) ||
           ko.find((v) => female.test(v.name)) ||
           ko.find((v) => /google/i.test(v.name)) || ko[0];
  }
  if (window.speechSynthesis) {
    voice = pickVoice();
    window.speechSynthesis.addEventListener?.("voiceschanged", () => { voice = pickVoice(); });
  }

  function stopSpeech() {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (_) {}
      currentAudio = null;
    }
    try { window.speechSynthesis?.cancel(); } catch (_) { /* ignore */ }
  }

  function playRecordedAudio(src) {
    if (muted || !src) return null;
    stopSpeech();
    return new Promise((resolve) => {
      const audio = new Audio(src);
      currentAudio = audio;
      let finished = false;
      const cleanup = (val) => {
        if (!finished) {
          finished = true;
          if (currentAudio === audio) currentAudio = null;
          resolve(val);
        }
      };
      audio.onended = () => cleanup(true);
      audio.onerror = (e) => {
        console.warn("[WorldModelTour] Audio load failed, fallback to TTS:", e);
        cleanup(false);
      };
      audio.play().catch((err) => {
        console.warn("[WorldModelTour] Audio play failed, fallback to TTS:", err);
        cleanup(false);
      });
    });
  }

  function speakFallback(text) {
    const synth = window.speechSynthesis;
    if (muted || !synth || typeof SpeechSynthesisUtterance === "undefined") return null;
    stopSpeech();
    const parts = text.split(/(?<=[.?!])\s+/).filter(Boolean);
    return new Promise((resolve) => {
      let i = 0;
      const next = () => {
        if (i >= parts.length) return resolve();
        const u = new SpeechSynthesisUtterance(parts[i++]);
        u.lang = "ko-KR";
        if (voice) u.voice = voice;
        u.rate = 1.05;
        u.pitch = 1.08;
        u.onend = next;
        u.onerror = () => resolve();
        synth.speak(u);
      };
      next();
    });
  }

  function say(text, tk, minMs = 0, audioKey = null) { return quiet(sayInner(text, tk, minMs, audioKey)); }
  async function sayInner(text, tk, minMs, audioKey) {
    setSub(text);
    const audioSrc = audioKey && AUDIO_MAP[audioKey] ? AUDIO_MAP[audioKey] : null;
    let played = false;
    if (audioSrc && !muted) {
      const audioP = playRecordedAudio(audioSrc);
      if (audioP) {
        const [res] = await Promise.all([until(audioP, tk), wait(minMs, tk)]);
        if (res === true) played = true;
      }
    }
    if (!played) {
      const est = Math.max(minMs, text.length * 85 + 700);
      const spoken = speakFallback(text);
      if (spoken) {
        await Promise.all([wait(minMs, tk), until(Promise.race([spoken, new Promise((r) => setTimeout(r, est * 2.2))]), tk)]);
      } else {
        await wait(est, tk);
      }
    }
  }

  // ------------------------------------------------------------------ DOM
  function build() {
    if (root) return;
    root = document.createElement("div");
    root.className = "wmt";
    root.id = "wmTour";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "월드 모델 60초 설명");
    root.innerHTML = `
      <div class="wmt-veil"></div>
      <div class="wmt-hole"></div>
      <div class="wmt-tag" id="wmtTag"><i></i><span class="wmt-tag__t"></span><span class="wmt-tag__s"></span></div>
      <div class="wmt-card" id="wmtCard"></div>
      <div class="wmt-sub" aria-live="polite"><p id="wmtSub"></p></div>
      <div class="wmt-bar">
        <div class="wmt-bar__brand"><span class="wmt-dot"></span>WORLD MODEL <em>60s</em></div>
        <ol class="wmt-chapters">${CHAPTERS.map((c, i) => `<li><button type="button" data-ch="${i}"><span class="wmt-seg"><i></i></span><b>${c.label}</b></button></li>`).join("")}</ol>
        <div class="wmt-ctrls">
          <button type="button" class="wmt-btn" data-act="pause" aria-label="일시정지">${svg("pause")}</button>
          <button type="button" class="wmt-btn" data-act="next" aria-label="다음 장면">${svg("next")}</button>
          <button type="button" class="wmt-btn" data-act="mute" aria-label="음성 끄기">${svg(muted ? "mute" : "sound")}</button>
          <button type="button" class="wmt-btn wmt-btn--close" data-act="close" aria-label="닫기">${svg("close")}</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    el.hole = root.querySelector(".wmt-hole");
    el.tag = root.querySelector("#wmtTag");
    el.tagT = root.querySelector(".wmt-tag__t");
    el.tagS = root.querySelector(".wmt-tag__s");
    el.card = root.querySelector("#wmtCard");
    el.sub = root.querySelector("#wmtSub");
    el.segs = Array.from(root.querySelectorAll(".wmt-chapters li"));
    el.pause = root.querySelector('[data-act="pause"]');
    el.mute = root.querySelector('[data-act="mute"]');

    root.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.ch) return jump(Number(b.dataset.ch));
      switch (b.dataset.act) {
        case "pause": return togglePause();
        case "next": return jump(chapter + 1);
        case "mute": return toggleMute();
        case "close": return close();
        case "replay": return play();
        case "try": return tryIt();
      }
    });
    // Keep the spotlight stable: the page must not scroll under the show.
    root.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
    root.addEventListener("touchmove", (e) => { if (!e.target.closest(".wmt-card")) e.preventDefault(); }, { passive: false });
  }

  function setSub(text) {
    el.sub.classList.remove("is-in");
    void el.sub.offsetWidth;
    el.sub.textContent = text;
    el.sub.classList.toggle("is-empty", !text);
    if (text) el.sub.classList.add("is-in");
  }
  function setMode(m) {
    mode = m;
    root.dataset.mode = m;
  }
  function setCard(html, cls = "") {
    el.card.className = `wmt-card ${cls}`;
    el.card.innerHTML = html;
    void el.card.offsetWidth;
    el.card.classList.add("is-in");
  }
  function hideCard() { el.card.classList.remove("is-in"); }
  function setTag(kind, title, sub = "") {
    if (!kind) { el.tag.classList.remove("is-in"); return; }
    el.tag.dataset.kind = kind;
    el.tagT.textContent = title;
    el.tagS.textContent = sub;
    el.tag.classList.add("is-in");
  }
  function renderBar() {
    el.segs.forEach((li, i) => {
      li.classList.toggle("is-done", i < chapter);
      li.classList.toggle("is-active", i === chapter);
      const fill = li.querySelector(".wmt-seg i");
      if (i < chapter) fill.style.transform = "scaleX(1)";
      else if (i > chapter) fill.style.transform = "scaleX(0)";
    });
  }

  // Frame loop: spotlight follows the 3D stage, chapter progress advances.
  function frame(now) {
    if (!running) return;
    loopId = requestAnimationFrame(frame);
    const dt = Math.min(100, now - (frame.last || now));
    frame.last = now;
    if (!paused) chapterElapsed += dt;
    const li = el.segs[chapter];
    if (li) li.querySelector(".wmt-seg i").style.transform = `scaleX(${Math.min(1, chapterElapsed / CHAPTERS[chapter].est)})`;

    const stage = document.getElementById("labStage");
    if (stage && mode !== "full") {
      const r = stage.getBoundingClientRect();
      const pad = 6;
      const top = Math.max(r.top - pad, 4);
      const bottom = Math.min(r.bottom + pad, innerHeight - 4);
      el.hole.style.transform = `translate(${r.left - pad}px, ${top}px)`;
      el.hole.style.width = `${r.width + pad * 2}px`;
      el.hole.style.height = `${Math.max(0, bottom - top)}px`;
      // Anchor the label inside the 3D viewport (not over the left rail tabs)
      const vp = stage.querySelector(".spatial-viewport-card");
      const vr = vp && vp.offsetParent ? vp.getBoundingClientRect() : r;
      el.tag.style.transform = `translate(${Math.max(12, vr.left + 20)}px, ${Math.max(12, Math.max(vr.top, top) + 20)}px)`;
    }
  }

  // ------------------------------------------------------------------ scenes
  const GLASS_SVG = `
    <svg class="wmt-glass" viewBox="0 0 560 300" aria-hidden="true">
      <defs>
        <radialGradient id="wmtHandFade" cx="50%" cy="50%" r="50%">
          <stop offset="74%" stop-color="#fff"/>
          <stop offset="100%" stop-color="#000"/>
        </radialGradient>
        <mask id="wmtHandMask"><rect x="4" y="34" width="256" height="240" fill="url(#wmtHandFade)"/></mask>
      </defs>
      <g class="wmt-real">
        <image class="wmt-hand-photo" href="davies-assets/images/world-model/hand-glass.webp?v=2" x="4" y="34" width="256" height="240"
               preserveAspectRatio="xMidYMid slice" mask="url(#wmtHandMask)"/>
        <text x="120" y="22" text-anchor="middle" class="wmt-svg-cap">지금 내 손</text>
        <text x="120" y="290" text-anchor="middle" class="wmt-svg-note">아직 놓지 않았어요</text>
      </g>
      <g class="wmt-think">
        <circle cx="222" cy="104" r="4"/><circle cx="240" cy="82" r="6"/><circle cx="262" cy="60" r="8"/>
        <rect class="wmt-bubble" x="286" y="16" width="258" height="262" rx="30"/>
        <text x="415" y="44" text-anchor="middle" class="wmt-svg-cap wmt-svg-cap--c">머릿속 시뮬레이션</text>
        <path class="wmt-traj" d="M415 92v136"/>
        <g class="wmt-fall">
          <path class="wmt-glass__cup" d="M397 64h36l-5 58h-26z"/>
          <path class="wmt-glass__water" d="M400 90h30l-3 30h-24z"/>
        </g>
        <path class="wmt-floor" d="M316 240h198"/>
        <g class="wmt-shards">
          <path style="--dx:-46px;--dy:-30px;--r:-80deg" d="M410 236l7-12 5 11z"/>
          <path style="--dx:40px;--dy:-38px;--r:90deg" d="M418 236l6-10 6 10z"/>
          <path style="--dx:-26px;--dy:-52px;--r:140deg" d="M412 236l3-9 5 8z"/>
          <path style="--dx:58px;--dy:-14px;--r:-120deg" d="M420 238l9-6 1 8z"/>
          <path style="--dx:-62px;--dy:-8px;--r:60deg" d="M406 238l-8-6-1 8z"/>
          <path style="--dx:16px;--dy:-60px;--r:200deg" d="M416 236l2-8 4 7z"/>
        </g>
        <text x="468" y="214" class="wmt-bang">쨍!</text>
      </g>
    </svg>`;

  const S = [];

  // 1 — Question
  S[0] = async (tk) => {
    setMode("full");
    setTag(null);
    setSub("");
    setCard(`
      <p class="wmt-eyebrow"><span class="wmt-dot"></span>WORLD MODEL · 60초 투어</p>
      <h2 class="wmt-q"><span id="wmtType"></span><i class="wmt-caret"></i></h2>
      <p class="wmt-lead">아직 일어나지 않은 일을, AI는 어떻게 미리 알 수 있을까요?</p>`, "wmt-card--q");
    const out = el.card.querySelector("#wmtType");
    const q = "AI는 어떻게 미래를 알 수 있을까요?";
    const talk = say("AI는 어떻게, 아직 일어나지 않은 미래를 알 수 있을까요?", tk, 0, "0");
    for (let i = 1; i <= q.length; i++) {
      out.textContent = q.slice(0, i);
      await wait(45, tk);
    }
    await talk;
    await wait(200, tk);
  };

  // 2 — Glass analogy
  S[1] = async (tk) => {
    setMode("full");
    setTag(null);
    setCard(`
      <p class="wmt-eyebrow"><span class="wmt-dot"></span>쉬운 비유</p>
      <h3 class="wmt-h">유리잔을 놓으면? <span>깨뜨려 보지 않아도 압니다</span></h3>
      ${GLASS_SVG}
      <ol class="wmt-steps"><li>① 손을 놓으면</li><li>② 아래로 떨어지고</li><li>③ 바닥에 부딪혀 깨진다</li></ol>
      <p class="wmt-reveal">이 <b>‘머릿속 물리 엔진’</b>을 AI에게 심어준 것 = <b class="wmt-hl">월드 모델</b></p>`, "wmt-card--glass");
    await say("손에 든 유리잔을 놓으면 깨진다는 것, 우리는 직접 깨뜨려 보지 않아도 압니다.", tk, 0, "1a");
    el.card.classList.add("is-reveal");
    await wait(180, tk);
    await say("머릿속에 세상이 돌아가는 규칙이 있기 때문이죠. 월드 모델은 바로 이 머릿속 물리 엔진을 AI에게 심어준 것입니다.", tk, 0, "1b");
    await wait(250, tk);
  };

  async function enterLab(tk) {
    const lab = window.spatialLab;
    const stage = document.getElementById("labStage");
    if (!lab || !stage || !lab.ghostDrop) return false;
    hideCard();
    setSub("");
    stage.scrollIntoView({ behavior: "smooth", block: "center" });
    await wait(350, tk);
    setMode("lab");
    if (lab.themeIndex !== 0) {
      setTag("ai", "물류 창고로 이동 중…", "");
      await until(Promise.race([lab.loadTheme(0, -1), new Promise((r) => setTimeout(r, 4000))]), tk);
    }
    return true;
  }

  // 3 — AI imagination (ghost prediction)
  S[2] = async (tk) => {
    if (!(await enterLab(tk))) return jump(5);
    const lab = window.spatialLab;
    lab.resetScene();
    predicted = lab.prediction;
    measured = null;
    setTag("ai", "AI의 상상", "아직 아무것도 떨어뜨리지 않았어요");
    const talk = say("직접 볼까요? 먼저 AI가 상상합니다. 1미터 위에서 상자를 놓으면, 언제, 얼마나 빠르게 떨어질까?", tk, 0, "2a");
    await wait(800, tk);
    setTag("ai", "AI의 상상 · 슬로모션 ×3", "물리 법칙으로 미래를 계산하는 중…");
    const res = await until(lab.ghostDrop({ slow: 3 }), tk);
    if (res) predicted = res;
    await talk;
    await wait(150, tk);
    setTag("ai", "AI의 예측", `${predicted.t.toFixed(2)}초 뒤 착지 · 초속 ${predicted.v.toFixed(1)} m`);
    await say("AI의 예측: 0.45초 뒤 바닥에 닿고, 속도는 초속 4.4미터.", tk, 0, "2b");
    await wait(250, tk);
  };

  // 4 — Reality (real Rapier drop)
  S[3] = async (tk) => {
    const lab = window.spatialLab;
    if (mode === "full" && !(await enterLab(tk))) return jump(5);
    predicted = predicted || lab.prediction;
    setTag("real", "현실 · 실제 물리 엔진", "AI의 상상(하늘색 윤곽)과 비교해 보세요");
    const talk = say("이제 현실에서 진짜로 떨어뜨려 봅니다.", tk, 0, "3");
    await wait(350, tk);
    measured = await until(lab.realDrop(), tk);
    await talk;
    if (measured) setTag("real", "현실의 결과", `${measured.t.toFixed(2)}초 · 초속 ${measured.v.toFixed(1)} m`);
    await wait(250, tk);
  };

  // 5 — Comparison
  S[4] = async (tk) => {
    const lab = window.spatialLab;
    if (mode === "full" && lab) { await enterLab(tk); }
    predicted = predicted || lab?.prediction || { t: 0.46, v: 4.5 };
    const m = measured || predicted;
    const err = (Math.abs(m.t - predicted.t) / predicted.t + Math.abs(m.v - predicted.v) / predicted.v) / 2;
    const acc = Math.max(0, Math.min(100, Math.round((1 - err) * 100)));
    setMode("labcard");
    setTag(null);
    setCard(`
      <p class="wmt-eyebrow"><span class="wmt-dot"></span>상상 vs 현실</p>
      <div class="wmt-vs">
        <div class="wmt-vs__col wmt-vs__col--ai">
          <span class="wmt-vs__k">AI의 상상</span>
          <b>${predicted.t.toFixed(2)}<small>초</small></b>
          <b>${predicted.v.toFixed(1)}<small>m/s</small></b>
        </div>
        <div class="wmt-vs__mid">
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="wmt-ring-bg" cx="60" cy="60" r="52"/><circle class="wmt-ring" cx="60" cy="60" r="52" style="--p:${acc}"/></svg>
          <span><b id="wmtAcc">0</b>%</span>
          <em>일치</em>
        </div>
        <div class="wmt-vs__col wmt-vs__col--real">
          <span class="wmt-vs__k">현실</span>
          <b>${m.t.toFixed(2)}<small>초</small></b>
          <b>${m.v.toFixed(1)}<small>m/s</small></b>
        </div>
      </div>
      <p class="wmt-lead">직접 부딪혀 보지 않고도, <b>결과를 미리</b> 알 수 있어요.</p>`, "wmt-card--vs");
    const accEl = el.card.querySelector("#wmtAcc");
    const s0 = performance.now();
    const count = (now) => {
      const k = Math.min(1, (now - s0) / 1100);
      accEl.textContent = String(Math.round(acc * (1 - Math.pow(1 - k, 3))));
      if (k < 1 && accEl.isConnected) requestAnimationFrame(count);
    };
    requestAnimationFrame(count);
    await say("결과를 비교해 볼까요? AI의 상상과 현실이 거의 똑같습니다. 직접 부딪혀 보지 않고도, 결과를 미리 알 수 있는 거죠.", tk, 0, "4");
    await wait(300, tk);
  };

  // 6 — Summary
  S[5] = async (tk) => {
    window.spatialLab?.ghostClear?.(900);
    setMode("full");
    setTag(null);
    setCard(`
      <p class="wmt-eyebrow"><span class="wmt-dot"></span>정리하면</p>
      <h2 class="wmt-sum"><span class="wmt-hl">월드 모델</span>은<br>행동하기 전에 미래를 미리 그려보는<br><b>AI의 머릿속 시뮬레이터</b></h2>
      <ul class="wmt-keys">
        <li>${svg("cause")}<b>인과관계 예측</b><span>“이 행동을 하면 다음에 무슨 일이?”를 계산</span></li>
        <li>${svg("shield")}<b>시행착오 최소화</b><span>로봇·자율주행차가 사고 없이 안전하게 학습</span></li>
        <li>${svg("spark")}<b>AGI의 필수 조건</b><span>글자를 넘어 실제 물리 세계를 이해하는 열쇠</span></li>
      </ul>
      <div class="wmt-actions">
        <button type="button" class="wmt-act" data-act="replay">${svg("replay")}다시 보기</button>
        <button type="button" class="wmt-act wmt-act--primary" data-act="try">직접 실험해 보기${svg("arrow")}</button>
      </div>
      <p class="wmt-hint">더 궁금하면 오른쪽 아래 <b>SIMS</b>에게 “월드 모델이 뭐야?”라고 물어보세요</p>`, "wmt-card--sum");
    await say("정리하면, 월드 모델은 AI가 현실 세계의 물리 법칙과 인과관계를 학습해, 행동하기 전에 머릿속으로 미래를 미리 그려보는 내부 시뮬레이션 엔진입니다. 이제 직접 실험해 보세요!", tk, 0, "5");
    chapterElapsed = CHAPTERS[5].est;
    await wait(kioskRun ? 10000 : 45000, tk);
    close();
  };

  // ------------------------------------------------------------------ control
  function runFrom(i) {
    const tk = ++token;
    stopSpeech();
    paused = false;
    syncPause();
    (async () => {
      for (let c = i; c < S.length; c++) {
        if (tk !== token) return;
        chapter = c;
        chapterElapsed = 0;
        renderBar();
        await S[c](tk);
      }
    })().catch((e) => {
      if (e === ABORT) return;
      console.error("[WorldModelTour]", e);
      close();
    });
  }

  function jump(i) {
    if (!running) return;
    if (i >= S.length) return close();
    runFrom(Math.max(0, i));
  }

  function play(opts = {}) {
    build();
    kioskRun = !!opts.kiosk;
    if (!running) lastFocus = document.activeElement;
    try { if (window.NovaLive?.isActive) window.NovaLive.stop(); } catch (_) { /* ignore */ }
    running = true;
    root.hidden = false;
    document.documentElement.classList.add("wmt-active");
    requestAnimationFrame(() => root.classList.add("is-open"));
    cancelAnimationFrame(loopId);
    frame.last = 0;
    loopId = requestAnimationFrame(frame);
    setMode("full");
    runFrom(Math.max(0, opts.startAt || 0));
    el.pause?.focus?.({ preventScroll: true });
  }

  function close() {
    if (!running) return;
    token++;
    running = false;
    paused = false;
    stopSpeech();
    cancelAnimationFrame(loopId);
    window.spatialLab?.ghostClear?.(600);
    root.classList.remove("is-open");
    document.documentElement.classList.remove("wmt-active");
    setTimeout(() => { if (!running) root.hidden = true; }, 450);
    lastIdle = Date.now();
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus?.({ preventScroll: true });
  }

  function syncPause() {
    if (!el.pause) return;
    el.pause.innerHTML = svg(paused ? "play" : "pause");
    el.pause.setAttribute("aria-label", paused ? "재생" : "일시정지");
    root.classList.toggle("is-paused", paused);
  }
  function togglePause() {
    paused = !paused;
    if (currentAudio) {
      try {
        if (paused) currentAudio.pause();
        else if (!muted) currentAudio.play().catch(() => {});
      } catch (_) {}
    }
    try { paused ? window.speechSynthesis?.pause() : window.speechSynthesis?.resume(); } catch (_) { /* ignore */ }
    syncPause();
  }
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem("wmt-muted", muted ? "1" : "0"); } catch (_) { /* ignore */ }
    if (muted) stopSpeech();
    el.mute.innerHTML = svg(muted ? "mute" : "sound");
    el.mute.setAttribute("aria-label", muted ? "음성 켜기" : "음성 끄기");
  }
  function tryIt() {
    close();
    const stage = document.getElementById("labStage");
    stage?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      const b = document.getElementById("btnDropTest");
      b?.focus({ preventScroll: true });
      b?.classList.add("wmt-attn");
      setTimeout(() => b?.classList.remove("wmt-attn"), 2600);
    }, 600);
  }

  document.addEventListener("keydown", (e) => {
    if (!running) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === " " && !e.target.closest?.("button")) { e.preventDefault(); togglePause(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); e.stopImmediatePropagation(); jump(chapter + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopImmediatePropagation(); jump(chapter - 1); }
  }, true);

  document.addEventListener("click", (e) => {
    const t = e.target.closest?.("[data-wm-tour]");
    if (!t) return;
    e.preventDefault();
    play();
  });

  // ------------------------------------------------------------------ kiosk: autoplay after idle
  let lastIdle = Date.now();
  if (KIOSK) {
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach((ev) =>
      window.addEventListener(ev, () => { if (!running) lastIdle = Date.now(); }, { passive: true, capture: true }));
    setInterval(() => {
      if (running || document.hidden) return;
      if (window.NovaLive?.isActive) { lastIdle = Date.now(); return; }
      if (Date.now() - lastIdle > KIOSK_IDLE_MS) play({ kiosk: true });
    }, 5000);
  }

  window.WorldModelTour = { play, close, jump, get isPlaying() { return running; } };
})();
