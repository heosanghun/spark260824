/* =====================================================================
 * World Model 60s Tour — one-click auto explainer for exhibition visitors
 *  1 시작(질문) → 2 도면/스케치 AI 분석 → 3 50만 스플랫 3D 생성
 *  → 4 실감 물리 실험(낙하/투척) → 5 공간 지능(분할/정밀선택) → 6 직접 체험
 * Drives the real 3D lab via window.spatialLab and window.SketchTo3D.
 * Public API: window.WorldModelTour = { play, close, isPlaying }
 * ===================================================================== */
(() => {
  "use strict";

  const ABORT = { abort: true };
  const KIOSK = new URLSearchParams(location.search).get("kiosk") === "1";

  const ICON = {
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
    next: '<path d="M6 5.5l9 6.5-9 6.5z"/><path d="M18.5 5.5v13"/>',
    sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    cube: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    spark: '<path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4"/><circle cx="12" cy="12" r="3"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>'
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;

  const CHAPTERS = [
    { label: "시작", est: 6500 },
    { label: "도면 분석", est: 11000 },
    { label: "3D 생성", est: 10000 },
    { label: "물리 실험", est: 12500 },
    { label: "공간 지능", est: 11500 },
    { label: "직접 체험", est: 10000 }
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
  let mode = "full"; // full | lab | labcard
  let loopId = 0;
  let lastFocus = null;
  let kioskRun = false;

  try { muted = localStorage.getItem("wmt-muted") === "1"; } catch (_) {}

  // ------------------------------------------------------------------ timing helpers
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

  function until(p, tk) {
    return quiet(new Promise((res, rej) => {
      const iv = setInterval(() => { if (tk !== token) { clearInterval(iv); rej(ABORT); } }, 80);
      Promise.resolve(p).then(
        (v) => { clearInterval(iv); tk === token ? res(v) : rej(ABORT); },
        () => { clearInterval(iv); tk === token ? res(null) : rej(ABORT); }
      );
    }));
  }

  // ------------------------------------------------------------------ narration
  const AUDIO_MAP = {
    "0": "davies-assets/audio/tour/tour_01.wav?v=20261024_kore",
    "1": "davies-assets/audio/tour/tour_02.wav?v=20261024_kore",
    "2": "davies-assets/audio/tour/tour_03.wav?v=20261024_kore",
    "3": "davies-assets/audio/tour/tour_04.wav?v=20261024_kore",
    "4": "davies-assets/audio/tour/tour_05.wav?v=20261024_kore",
    "5": "davies-assets/audio/tour/tour_06.wav?v=20261024_kore"
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
    try { window.speechSynthesis?.cancel(); } catch (_) {}
  }

  function playRecordedAudio(src) {
    if (muted || !src) return Promise.resolve(false);
    stopSpeech();
    return new Promise((resolve) => {
      const audio = new Audio();
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
        console.warn("[WorldModelTour] Audio load error:", src, e);
        cleanup(false);
      };
      audio.src = src;
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.catch((err) => {
          console.warn("[WorldModelTour] Play interrupted/blocked:", err);
          cleanup(false);
        });
      }
    });
  }

  function say(text, tk, minMs = 0, audioKey = null) {
    setSub(text);
    if (muted) return wait(Math.max(minMs, 2200), tk);

    const audioSrc = audioKey != null ? AUDIO_MAP[audioKey] : null;

    if (audioSrc) {
      const audioPromise = playRecordedAudio(audioSrc).then((played) => {
        if (played) return true;
        return fallbackSpeech(text, tk);
      });
      const timerPromise = wait(minMs, tk);
      return quiet(Promise.all([audioPromise, timerPromise]).then(() => {}));
    }
    return fallbackSpeech(text, tk);
  }

  function fallbackSpeech(text, tk) {
    const synth = window.speechSynthesis;
    if (!synth) return wait(2500, tk);
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 1.05;
    u.pitch = 1.05;
    if (voice) u.voice = voice;
    return quiet(new Promise((res) => {
      let done = false;
      const finish = () => { if (!done) { done = true; res(); } };
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
      setTimeout(finish, 12000);
    }));
  }

  // ------------------------------------------------------------------ UI Builder
  function build() {
    if (root) return;
    root = document.createElement("div");
    root.className = "wmt";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "World Labs 3D 공간 지능 60초 가이드 투어");

    root.innerHTML = `
      <div class="wmt-veil" data-act="veil"></div>
      <div class="wmt-hole"></div>

      <div class="wmt-tag" aria-live="polite">
        <i></i>
        <div>
          <div class="wmt-tag__t"></div>
          <div class="wmt-tag__s"></div>
        </div>
      </div>

      <div class="wmt-card" role="region" aria-live="polite"></div>

      <div class="wmt-sub" aria-live="polite"><p class="is-empty"></p></div>

      <nav class="wmt-bar" aria-label="투어 제어">
        <div class="wmt-bar__brand">
          <span class="wmt-dot"></span>
          <span>SIMS<em>REALITY</em></span>
        </div>
        <ol class="wmt-chapters">
          ${CHAPTERS.map((c, i) => `
            <li><button type="button" data-step="${i}"><b>${i + 1} ${c.label}</b><span class="wmt-seg"><i></i></span></button></li>
          `).join("")}
        </ol>
        <div class="wmt-ctrls">
          <button type="button" class="wmt-btn" data-act="toggleSound" title="소리 켜기/끄기">${svg(muted ? "mute" : "sound")}</button>
          <button type="button" class="wmt-btn" data-act="togglePause" title="일시정지">${svg("pause")}</button>
          <button type="button" class="wmt-btn" data-act="next" title="다음 단계">${svg("next")}</button>
          <button type="button" class="wmt-btn wmt-btn--close" data-act="close" title="닫기">${svg("close")}</button>
        </div>
      </nav>
    `;

    document.body.appendChild(root);

    el.veil = root.querySelector(".wmt-veil");
    el.hole = root.querySelector(".wmt-hole");
    el.tag = root.querySelector(".wmt-tag");
    el.tagT = root.querySelector(".wmt-tag__t");
    el.tagS = root.querySelector(".wmt-tag__s");
    el.card = root.querySelector(".wmt-card");
    el.subP = root.querySelector(".wmt-sub p");
    el.bar = root.querySelector(".wmt-bar");
    el.segs = Array.from(root.querySelectorAll(".wmt-chapters li"));
    el.btnSound = root.querySelector('[data-act="toggleSound"]');
    el.btnPause = root.querySelector('[data-act="togglePause"]');

    root.addEventListener("click", (e) => {
      const b = e.target.closest("button, [data-act]");
      if (!b) return;
      const step = b.dataset.step;
      if (step != null) { jump(Number(step)); return; }
      const act = b.dataset.act;
      if (act === "close") close();
      else if (act === "next") jump(chapter + 1);
      else if (act === "togglePause") togglePause();
      else if (act === "toggleSound") toggleSound();
      else if (act === "replay") jump(0);
      else if (act === "openSketch") {
        close();
        if (window.SketchTo3D?.openModal) {
          window.SketchTo3D.openModal();
        } else {
          window.spatialLab?.loadTheme?.(2, 1);
        }
      } else if (act === "tryPhysics") {
        close();
        window.spatialLab?.loadTheme?.(0, -1);
      } else if (act === "openNova") {
        close();
        document.getElementById("voiceAssistantFab")?.click();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (!running) return;
      if (e.key === "Escape") close();
      else if (e.key === " " && !e.target.closest("input, textarea, button")) {
        e.preventDefault();
        togglePause();
      } else if (e.key === "ArrowRight") jump(chapter + 1);
      else if (e.key === "ArrowLeft") jump(chapter - 1);
    });
  }

  function setMode(m) {
    mode = m;
    root.dataset.mode = m;
  }

  function setTag(kind, t, s) {
    if (!t) { el.tag.classList.remove("is-in"); return; }
    el.tag.dataset.kind = kind || "ai";
    el.tagT.textContent = t;
    el.tagS.textContent = s || "";
    el.tag.classList.add("is-in");
  }

  function setSub(text) {
    if (!text) {
      el.subP.classList.remove("is-in");
      el.subP.classList.add("is-empty");
      el.subP.textContent = "";
      return;
    }
    el.subP.textContent = text;
    el.subP.classList.remove("is-empty");
    void el.subP.offsetWidth;
    el.subP.classList.add("is-in");
  }

  function setCard(html, extraClass = "") {
    el.card.className = `wmt-card is-in ${extraClass}`;
    el.card.innerHTML = html;
  }

  function hideCard() {
    el.card.classList.remove("is-in");
  }

  function renderBar() {
    el.segs.forEach((li, i) => {
      li.classList.toggle("is-active", i === chapter);
      li.classList.toggle("is-done", i < chapter);
      const bar = li.querySelector(".wmt-seg i");
      if (i < chapter) bar.style.transform = "scaleX(1)";
      else if (i > chapter) bar.style.transform = "scaleX(0)";
    });
  }

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
      const vp = stage.querySelector(".spatial-viewport-card");
      const vr = vp && vp.offsetParent ? vp.getBoundingClientRect() : r;
      el.tag.style.transform = `translate(${Math.max(12, vr.left + 20)}px, ${Math.max(12, Math.max(vr.top, top) + 20)}px)`;
    }
  }

  async function enterLab(tk, theme = 0) {
    const lab = window.spatialLab;
    const stage = document.getElementById("labStage");
    if (!lab || !stage) return false;
    hideCard();
    setSub("");
    stage.scrollIntoView({ behavior: "smooth", block: "center" });
    await wait(300, tk);
    setMode("lab");
    if (lab.themeIndex !== theme) {
      await until(Promise.race([lab.loadTheme(theme, 1), new Promise((r) => setTimeout(r, 4000))]), tk);
    }
    return true;
  }

  // ------------------------------------------------------------------ SCENES (60s Complete Pipeline)
  const S = [];

  // Scene 0: 질문 & 도입 (Question)
  S[0] = async (tk) => {
    setMode("full");
    setTag(null);
    setSub("");
    setCard(`
      <p class="wmt-eyebrow"><span class="wmt-dot"></span>SIMSREALITY · 60초 공간 지능 가이드</p>
      <h2 class="wmt-q"><span id="wmtType"></span><i class="wmt-caret"></i></h2>
      <div class="wmt-workflow">
        <div class="wmt-wf-item is-active">
          <div class="wmt-wf-icon">${svg("upload")}</div>
          <p class="wmt-wf-title">① 도면/사진</p>
          <p class="wmt-wf-desc">손그림·CAD·사진 업로드</p>
        </div>
        <div class="wmt-wf-item">
          <div class="wmt-wf-icon">${svg("spark")}</div>
          <p class="wmt-wf-title">② AI 공간 분석</p>
          <p class="wmt-wf-desc">Gemini 구조/랙 인지</p>
        </div>
        <div class="wmt-wf-item">
          <div class="wmt-wf-icon">${svg("cube")}</div>
          <p class="wmt-wf-title">③ 3D 월드 생성</p>
          <p class="wmt-wf-desc">50만 스플랫 공간</p>
        </div>
        <div class="wmt-wf-item">
          <div class="wmt-wf-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3.5h8v6H8z"/><path d="M12 12.5v6m-2.6-2.6L12 18.5l2.6-2.6"/></svg></div>
          <p class="wmt-wf-title">④ 실감 물리 실험</p>
          <p class="wmt-wf-desc">1m 낙하·투척·공간분할</p>
        </div>
      </div>
      <p class="wmt-lead">스마트폰 스케치 한 장이 <b>어떻게 실제 물리 법칙이 살아있는 3D 공간</b>이 될까요?</p>
    `, "wmt-card--q");

    const out = el.card.querySelector("#wmtType");
    const q = "내 도면이 어떻게 살아있는 3D 공간이 될까요?";
    const talk = say("스마트폰 손그림 스케치, 캐드 도면, 사진 한 장이 어떻게 살아있는 3D 가상 공간이 될까요?", tk, 0, "0");
    for (let i = 1; i <= q.length; i++) {
      out.textContent = q.slice(0, i);
      await wait(45, tk);
    }
    await talk;
    await wait(300, tk);
  };

  // Scene 1: 도면/스케치 AI 분석 (Gemini Multimodal Sketch-to-3D)
  S[1] = async (tk) => {
    setMode("full");
    setTag(null);
    setCard(`
      <p class="wmt-eyebrow"><span class="wmt-dot"></span>STEP 1 · GEMINI MULTIMODAL VISION</p>
      <h3 class="wmt-h">도면과 스케치에서 <span>기둥, 랙, 통로 폭을 스스로 읽어냅니다</span></h3>
      <div class="wmt-blueprint-preview">
        <img src="davies-assets/images/blueprints/blueprint_warehouse.svg" class="wmt-bp-img" alt="도면 샘플">
        <div class="wmt-bp-scanner">
          <div class="wmt-bp-beam"></div>
          <div class="wmt-bp-badge">GEMINI 2.5 SPATIAL SCANNING · 기둥/통로/랙 인식 완료</div>
        </div>
      </div>
      <p class="wmt-lead">모바일로 대충 그린 손그림이나 CAD 도면, 현장 사진을 올리기만 하면 <b>AI가 건축 구조를 정밀 분석</b>합니다.</p>
    `, "wmt-card--sketch");

    await say("누구나 모바일로 쉽게 그린 평면도나 캐드 도면, 현장 사진을 올리기만 하면, 제미나이 AI가 기둥 간격, 통로 폭, 랙 배치를 스스로 분석합니다.", tk, 0, "1");
    await wait(400, tk);
  };

  // Scene 2: 50만 스플랫 3D 공간 생성 (World Labs Marble)
  S[2] = async (tk) => {
    if (!(await enterLab(tk, 0))) return jump(5);
    setTag("ai", "World Labs Marble 1.1", "500,000 스플랫 정밀 3D 공간 렌더링 완료");
    const talk = say("분석된 공간 정보는 월드 랩스 뉴럴 엔진을 통해 500,000개의 초정밀 3D 스플랫 공간으로 즉시 펼쳐집니다.", tk, 0, "2");
    await wait(800, tk);
    // Smooth camera orbit
    const controls = window.spatialLab?.controls;
    if (controls) {
      const startAngle = controls.getAzimuthalAngle?.() || 0;
      for (let i = 0; i < 40; i++) {
        if (tk !== token) break;
        controls.rotateLeft?.(0.015);
        controls.update?.();
        await wait(50, tk);
      }
    }
    await talk;
    await wait(300, tk);
  };

  // Scene 3: 실감 물리 실험 (1m 낙하 & 2.5m/s 투척)
  S[3] = async (tk) => {
    const lab = window.spatialLab;
    if (mode === "full") await enterLab(tk, 0);
    setTag("real", "1m 낙하 & 2.5m/s 투척 실험", "실제 중력(9.8m/s²)과 바닥 마찰력 시뮬레이션");
    const talk = say("단순한 관람용 그래픽이 아닙니다. 1미터 자유 낙하와 2.5m/s 투척 실험으로 실제 중력과 충돌, 바닥 마찰력을 가상에서 안전하게 검증합니다.", tk, 0, "3");
    
    // Trigger drop
    const btnDrop = document.getElementById("btnDropTest");
    if (btnDrop) btnDrop.click();
    await wait(2200, tk);

    // Trigger toss
    const btnToss = document.getElementById("btnTossTest");
    if (btnToss) btnToss.click();

    await talk;
    await wait(400, tk);
  };

  // Scene 4: 공간 지능 & 정밀 선택 (7구역 OBB & 60점 레이캐스팅)
  S[4] = async (tk) => {
    const lab = window.spatialLab;
    if (mode === "full") await enterLab(tk, 0);
    setTag("ai", "공간 지능 & 정밀 선택", "7구역 OBB 바운딩 박스 + 60점 레이캐스팅 평가");
    
    // Turn on Partition
    const btnPart = document.getElementById("btnTogglePartition");
    if (btnPart) btnPart.click();
    await wait(1000, tk);

    // Run picking benchmark
    const btnPick = document.getElementById("btnRunPicking");
    if (btnPick) btnPick.click();

    await say("7구역 공간 분할과 60점 레이캐스팅 평가로, 로봇과 AI가 사각지대 없이 집어내는 정밀도를 직접 확인해 보세요.", tk, 0, "4");
    await wait(500, tk);
  };

  // Scene 5: 정리 및 직접 체험 (Call to Action)
  S[5] = async (tk) => {
    setMode("full");
    setTag(null);
    setCard(`
      <p class="wmt-eyebrow"><span class="wmt-dot"></span>SIMSREALITY 3D SPATIAL STUDIO</p>
      <h2 class="wmt-sum"><span class="wmt-hl">누구나 모바일로</span><br>원하는 공간을 3D로 만들고<br><b>실제 물리 법칙으로 체험하세요!</b></h2>
      <div class="wmt-actions">
        <button type="button" class="wmt-act wmt-act--primary" data-act="openSketch">
          ${svg("upload")} 도면 올려서 3D 만들기
        </button>
        <button type="button" class="wmt-act" data-act="tryPhysics">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3.5h8v6H8z"/><path d="M12 12.5v6"/></svg>
          물리 실험 직접 해보기
        </button>
        <button type="button" class="wmt-act" data-act="openNova">
          ${svg("mic")} Nova 음성 대화 시작
        </button>
      </div>
      <p class="wmt-hint">언제든 오른쪽 아래 <b>마이크 버튼</b>을 누르면 Nova가 음성으로 안내해 드립니다.</p>
    `, "wmt-card--sum");

    await say("지금 바로 도면이나 사진을 올려 나만의 3D 공간을 만들고, 오른쪽 마이크를 켜서 노바에게 말을 걸어보세요!", tk, 0, "5");
    chapterElapsed = CHAPTERS[5].est;
    await wait(kioskRun ? 8000 : 35000, tk);
    close();
  };

  // ------------------------------------------------------------------ controls
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
    try { if (window.NovaLive?.isActive) window.NovaLive.stop(); } catch (_) {}
    running = true;
    root.hidden = false;
    document.documentElement.classList.add("wmt-active");
    requestAnimationFrame(() => root.classList.add("is-open"));
    loopId = requestAnimationFrame(frame);
    frame.last = performance.now();
    runFrom(opts.startAt || 0);
  }

  function close() {
    if (!running) return;
    token++;
    running = false;
    cancelAnimationFrame(loopId);
    stopSpeech();
    root.classList.remove("is-open");
    document.documentElement.classList.remove("wmt-active");
    setTimeout(() => {
      if (!running && root) {
        root.hidden = true;
        setMode("full");
        hideCard();
        setTag(null);
        setSub("");
      }
    }, 450);
    if (lastFocus && typeof lastFocus.focus === "function") {
      try { lastFocus.focus(); } catch (_) {}
      lastFocus = null;
    }
  }

  function togglePause() {
    paused = !paused;
    syncPause();
    if (paused) {
      if (currentAudio) try { currentAudio.pause(); } catch (_) {}
      try { window.speechSynthesis?.pause(); } catch (_) {}
    } else {
      if (currentAudio) try { currentAudio.play(); } catch (_) {}
      try { window.speechSynthesis?.resume(); } catch (_) {}
    }
  }

  function syncPause() {
    root?.classList.toggle("is-paused", paused);
    if (el.btnPause) {
      el.btnPause.innerHTML = svg(paused ? "play" : "pause");
      el.btnPause.title = paused ? "재생" : "일시정지";
    }
  }

  function toggleSound() {
    muted = !muted;
    try { localStorage.setItem("wmt-muted", muted ? "1" : "0"); } catch (_) {}
    if (el.btnSound) {
      el.btnSound.innerHTML = svg(muted ? "mute" : "sound");
      el.btnSound.title = muted ? "소리 켜기" : "소리 끄기";
    }
    if (muted) stopSpeech();
  }

  // Public API
  window.WorldModelTour = {
    play,
    close,
    jump,
    get isPlaying() { return running; }
  };

  // Auto-bind CTA triggers
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-wm-tour]").forEach((btn) => {
      btn.addEventListener("click", () => play());
    });
  });
})();
