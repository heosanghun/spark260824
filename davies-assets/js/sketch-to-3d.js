/* =====================================================================
 * Sketch-to-3D Pipeline Studio: Gemini Multimodal Vision + World Labs 3D
 * Enables mobile hand-drawn sketches, CAD blueprints, and photos to be
 * analyzed by Gemini 3.8 Flash and converted into photorealistic 3D worlds.
 * ===================================================================== */
(() => {
  "use strict";

  const BP = "davies-assets/images/blueprints/";
  const SAMPLES = {
    warehouse: {
      name: "스마트 물류 허브",
      code: "WH-702 · 1:200",
      img: `${BP}cad_warehouse.webp`,
      thumb: `${BP}cad_warehouse_thumb.webp`,
      scale: "약 1,750㎡ (50m × 35m) · 층고 9.5m",
      title: "WH-702 스마트 물류 허브",
      analysis: [
        "10m 간격 A~F축 그리드에 400×400mm 기둥을 둔 50m × 35m 직사각형 구조",
        "서측 하역 도크 3개소와 중앙 4.2m AGV 전용 통로 중심의 직선형 물류 동선",
        "4열 대형 팔레트 랙 보관 구역과 북동측 12m × 10m 검수·분류실(QC) 독립 배치",
        "남측 주 출입구와 동측 비상구 2개소를 잇는 외곽 안전 피난 통로"
      ],
      equipment: ["하이베이 팔레트 랙", "4.2m AGV 주행 통로", "로딩 도크 3개소", "검품·분류 스테이션", "도크 레벨러"],
      prompt: "Ultra-detailed interior of an expansive 50x35m smart logistics hub with 9.5m high ceilings, featuring four long rows of industrial multi-tier pallet racks and a prominent 4.2m wide central AGV lane. On the west wall, three recessed freight loading docks open up to staging zones, while an enclosed 12x10m sorting and inspection office occupies the northeast corner. Polished industrial gray epoxy flooring reflects overhead LED high-bay luminaires, suspended cable trays, and structural steel columns in a clean automated facility."
    },
    cleanroom: {
      name: "반도체 클린룸",
      code: "FAB-C1 · 1:150",
      img: `${BP}cad_cleanroom.webp`,
      thumb: `${BP}cad_cleanroom_thumb.webp`,
      scale: "약 960㎡ (40m × 24m) · 층고 5.5m",
      title: "FAB-C1 ISO Class 1 고청정 클린룸",
      analysis: [
        "40m × 24m 직사각형 평면에 A~E축 균일 격자 기둥과 4개 공정 베이 배치",
        "갱의실(Gowning) → 에어샤워를 거치는 방진 동선과 외곽 순환형 OHT 웨이퍼 반송 레일",
        "중앙 EUV 노광 · 식각/증착(ETCH/CVD) · 계측(SEM) 베이와 동측 FOUP 스토커 구획",
        "천장 전면 FFU 격자와 타공 액세스 플로어를 통한 하향 층류 기류 설계"
      ],
      equipment: ["EUV 노광 장비", "천장 OHT 반송 레일", "FOUP 자동 스토커", "에어샤워 챔버", "SEM 계측 장비"],
      prompt: "Ultra-clean semiconductor FAB facility based on an ISO Class 1 cleanroom architectural layout. In the center, enclosed bays house advanced EUV lithography, chemical vapor deposition, and metrology systems surrounded by perforated raised flooring. Overhead automated OHT wafer transport tracks loop along the perimeter ceiling, flanked by dual-row automated FOUP stockers. Sterile pure-white and amber cleanroom filtration lighting reflects evenly off polished metallic enclosures and pristine anti-static surfaces."
    },
    showroom: {
      name: "하이퍼카 쇼룸",
      code: "SR-08 · 1:100",
      img: `${BP}cad_showroom.webp`,
      thumb: `${BP}cad_showroom_thumb.webp`,
      scale: "약 770㎡ (35m × 22m) · 층고 6.0m",
      title: "SR-08 하이퍼카 플래그십 쇼룸",
      analysis: [
        "8.75m 균등 기둥 스팬(A~D축) 기반의 35m × 22m 직사각형 무주 전시 공간",
        "서측 드라이브인 차량 진입로와 남측 커튼월 보행자 양개 도어 2개소",
        "중앙 Ø7.2m 턴테이블, 북동측 다이노 테스트 베이, VIP 라운지 · 리셉션 · 화장실 구획",
        "남측 전면 글래스 파사드 채광과 고천장 매립형 스포트라이트 조명"
      ],
      equipment: ["Ø7.2m 회전 턴테이블", "섀시 다이노 롤러", "VIP 라운지", "곡면 리셉션 데스크", "드라이브인 램프"],
      prompt: "Ultra-luxury modern hypercar showroom featuring a supercar mounted on an illuminated 7.2m central rotating turntable. Glossy dark floor with sharp reflections under architectural linear ceiling tracks. Visible glass-enclosed dyno test bay and VIP lounge with leather seating along the periphery, bordered by expansive floor-to-ceiling glass walls."
    }
  };

  let activeSample = "warehouse";
  let currentImageBase64 = null;
  let isScanning = false;
  let modalEl = null;
  let toastEl = null;

  const ICON = {
    upload: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    camera: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    layers: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    copy: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
  };

  // "약 1,750㎡ (50m × 35m) · 층고 9.5m" → KPI tiles
  function parseScale(text) {
    const t = String(text || "");
    const area = /([\d,.]+)\s*㎡/.exec(t)?.[1];
    const dims = /([\d.]+)\s*m?\s*[×xX]\s*([\d.]+)\s*m/.exec(t);
    const h = /층고\s*([\d.]+)\s*m/.exec(t)?.[1];
    const fmt = (n) => String(Number.parseFloat(n)).replace(/\.0$/, "");
    return {
      area: area || "—",
      dims: dims ? `${fmt(dims[1])}×${fmt(dims[2])}` : "—",
      height: h || "—"
    };
  }
  function kpiHTML(scaleText) {
    const k = parseScale(scaleText);
    return `
      <div class="sk-kpi"><span>면적</span><b>${k.area}<small>㎡</small></b></div>
      <div class="sk-kpi"><span>가로 × 세로</span><b>${k.dims}<small>m</small></b></div>
      <div class="sk-kpi"><span>층고</span><b>${k.height}<small>m</small></b></div>`;
  }
  function renderKpis(scaleText) {
    ["modal", "panel"].forEach((p) => {
      const el = document.getElementById(`${p}_analysisKpis`);
      if (el) el.innerHTML = kpiHTML(scaleText);
    });
  }
  function setViewerMeta(label, code) {
    ["modal", "panel"].forEach((p) => {
      const el = document.getElementById(`${p}_viewerMeta`);
      if (el) el.innerHTML = `${esc(label)}${code ? ` <em>${esc(code)}</em>` : ""}`;
    });
  }

  function sourceBlockHTML(p) {
    return `
            <div class="sketch-analysis__source" id="${p}_analysisSource" hidden>
              <img id="${p}_analysisSourceImg" alt="분석 대상 2D 도면">
              <div class="sketch-analysis__source-meta">
                <span class="sketch-analysis__source-label">분석 대상 도면</span>
                <b id="${p}_analysisSourceName"></b>
                <span class="sketch-analysis__source-state" id="${p}_analysisSourceState"></span>
              </div>
            </div>`;
  }

  const stepsHTML = () => `
    <div class="sk-steps" aria-label="파이프라인 단계">
      <span class="sk-step is-on"><b>1</b>도면 업로드</span><i class="sk-step-sep"></i>
      <span class="sk-step is-on"><b>2</b>Gemini 분석</span><i class="sk-step-sep"></i>
      <span class="sk-step"><b>3</b>3D 월드 생성</span>
    </div>`;

  function viewerHTML(p) {
    const s = SAMPLES[activeSample];
    return `
      <div class="sketch-viewer" id="${p}_viewer">
        <div class="sk-viewer-meta" id="${p}_viewerMeta">${esc(s.name)} <em>${esc(s.code)}</em></div>
        <img id="${p}_canvasImg" class="sketch-viewer__canvas" src="${s.img}" alt="도면/스케치 프리뷰">
        <div class="sketch-scanner-overlay" id="${p}_scannerOverlay">
          <div class="sketch-scanner__grid"></div>
          <div class="sketch-scanner__radar"></div>
          <div class="sketch-scanner__beam"></div>
          <div class="sketch-scanner__label"><span class="spinner-grow" role="status"></span>Gemini가 도면을 읽고 있어요</div>
        </div>
      </div>`;
  }

  function samplesHTML(p) {
    return `
      <div class="sketch-samples" id="${p}_samples">
        <span class="sketch-samples__title">샘플 도면</span>
        ${Object.entries(SAMPLES).map(([key, s]) => `
          <button type="button" class="sketch-sample-btn ${activeSample === key ? "is-active" : ""}" data-sample="${key}">
            <img src="${s.thumb}" alt="" loading="lazy">
            <span><b>${s.name}</b><small>${s.code}</small></span>
          </button>`).join("")}
      </div>`;
  }

  function dropzoneHTML(p, withInput) {
    return `
      <div class="sketch-dropzone" id="${p}_dropzone">
        <div class="sketch-dropzone__info">
          <div class="sketch-dropzone__icon">${ICON.upload}</div>
          <div class="sketch-dropzone__text">
            <strong>내 도면 · 손그림 · 현장 사진 올리기</strong><br>
            <span>끌어다 놓거나 클릭 · JPG, PNG, WEBP, PDF</span>
          </div>
        </div>
        <button type="button" class="sketch-dropzone__btn">파일 선택</button>
        ${withInput ? `<input type="file" id="${p}_fileInput" accept="image/*,.pdf" style="display: none;">` : ""}
      </div>`;
  }

  function reportHTML(p) {
    const s = SAMPLES[activeSample];
    return `
      <div class="sketch-analysis-card" id="${p}_analysisCard">
        <div class="sketch-analysis__header">
          <div class="sketch-analysis__tagline">Gemini Spatial Report</div>
          <h4 class="sketch-analysis__title" id="${p}_analysisTitle">${esc(s.title)}</h4>
          <div class="sketch-analysis__scale" id="${p}_analysisScale">${esc(s.scale)}</div>
        </div>
        <div class="sk-kpis" id="${p}_analysisKpis">${kpiHTML(s.scale)}</div>
        ${sourceBlockHTML(p)}
        <div class="sketch-analysis__section">
          <div class="sketch-analysis__label">공간 구조 및 동선 분석</div>
          <ul class="sketch-analysis__bullets" id="${p}_analysisBullets">
            ${s.analysis.map((item) => `<li>${esc(item)}</li>`).join("")}
          </ul>
        </div>
        <div class="sketch-analysis__section">
          <div class="sketch-analysis__label">식별된 설비 및 객체</div>
          <div class="sketch-analysis__tags" id="${p}_analysisTags">
            ${s.equipment.map((t) => `<span class="sketch-analysis__chip">${esc(t)}</span>`).join("")}
          </div>
        </div>
        <div class="sketch-prompt-box">
          <div class="sketch-prompt-box__label">
            <span>World Labs 3D 프롬프트</span>
            <button type="button" class="sk-copy" data-copy="${p}_analysisPrompt">${ICON.copy}복사</button>
          </div>
          <div class="sketch-prompt-box__text" id="${p}_analysisPrompt">${esc(s.prompt)}</div>
        </div>
        <button type="button" class="sketch-btn-generate" id="${p}_btnLaunch">
          ${ICON.layers}<span>이 도면으로 3D 월드 생성</span><small>MARBLE 1.1</small>
        </button>
      </div>`;
  }

  function createStudioContentHTML(idPrefix) {
    return `
      <div class="sketch-modal__quick-actions">
        <button type="button" class="sketch-quick-btn sketch-quick-btn--camera" id="${idPrefix}_btnCamera">${ICON.camera}<span>사진 / 손그림 촬영</span></button>
        <button type="button" class="sketch-quick-btn sketch-quick-btn--upload" id="${idPrefix}_btnUpload">${ICON.upload}<span>CAD 도면 / 파일 선택</span></button>
        <span class="sk-quick-hint">스마트폰으로 찍은 손그림도 바로 분석됩니다</span>
        <input type="file" id="${idPrefix}_cameraInput" accept="image/*" capture="environment" style="display: none;">
        <input type="file" id="${idPrefix}_fileInput" accept="image/*,.pdf,.dwg,.dxf" style="display: none;">
      </div>
      <div class="sketch-modal__body">
        <div class="sketch-modal__left">
          ${viewerHTML(idPrefix)}
          ${samplesHTML(idPrefix)}
          ${dropzoneHTML(idPrefix, false)}
        </div>
        <div class="sketch-modal__right">
          ${reportHTML(idPrefix)}
        </div>
      </div>`;
  }

  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "sketch-toast";
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${msg}</span>
    `;
    toastEl.classList.add("is-show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove("is-show"), 3600);
  }

  function initModal() {
    if (modalEl) return;

    modalEl = document.createElement("div");
    modalEl.id = "sketchStudioModal";
    modalEl.className = "sketch-modal-overlay";
    modalEl.setAttribute("role", "dialog");
    modalEl.setAttribute("aria-label", "도면/스케치 AI 3D 스튜디오");

    modalEl.innerHTML = `
      <div class="sketch-modal-dialog">
        <div class="sketch-modal__head">
          <div class="sketch-modal__title-group">
            <div class="sketch-studio__title">
              <span class="sk-eyebrow"><i></i>Sketch → 3D Studio</span>
              <h2>도면/스케치 AI 3D 스튜디오</h2>
            </div>
          </div>
          <div class="sk-head-right">
            ${stepsHTML()}
            <span class="sketch-studio__badge"><span class="dot"></span>Gemini 3.8 Flash</span>
            <button type="button" class="sketch-modal__close" id="modal_closeBtn" aria-label="닫기">✕</button>
          </div>
        </div>
        ${createStudioContentHTML("modal")}
      </div>
    `;

    document.body.appendChild(modalEl);
    bindComponentEvents("modal");

    // Close listeners
    modalEl.querySelector("#modal_closeBtn")?.addEventListener("click", closeModal);
    modalEl.addEventListener("click", (e) => {
      if (e.target === modalEl) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalEl?.classList.contains("is-open")) {
        closeModal();
      }
    });
  }

  function initInCanvasPanel() {
    const container = document.getElementById("sketchStudioContainer");
    if (!container) return;

    container.innerHTML = `
      <div class="sketch-studio-panel" id="sketchStudioPanel">
        <div class="sketch-studio__main">
          <header class="sketch-studio__header">
            <div class="sketch-studio__title">
              <span class="sk-eyebrow"><i></i>Sketch → 3D Pipeline <span class="sketch-studio__badge"><span class="dot"></span>Gemini 3.8 Flash</span></span>
              <h3>도면/스케치 AI 3D 파이프라인</h3>
            </div>
            ${stepsHTML()}
          </header>
          ${viewerHTML("panel")}
          ${samplesHTML("panel")}
          ${dropzoneHTML("panel", true)}
        </div>
        <div class="sketch-studio__side">
          ${reportHTML("panel")}
        </div>
      </div>
    `;

    bindComponentEvents("panel");
  }

  function bindComponentEvents(prefix) {
    // Sample buttons
    document.querySelectorAll(`#${prefix}_samples .sketch-sample-btn`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const sampleKey = btn.dataset.sample;
        selectSample(sampleKey);
      });
    });

    // Camera button
    const btnCamera = document.getElementById(`${prefix}_btnCamera`);
    const cameraInput = document.getElementById(`${prefix}_cameraInput`);
    btnCamera?.addEventListener("click", () => cameraInput?.click());
    cameraInput?.addEventListener("change", () => {
      const f = cameraInput.files?.[0];
      cameraInput.value = "";
      if (f) handleFileUpload(f);
    });

    // Upload button & File input
    const btnUpload = document.getElementById(`${prefix}_btnUpload`);
    const fileInput = document.getElementById(`${prefix}_fileInput`);
    btnUpload?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", () => {
      const f = fileInput.files?.[0];
      fileInput.value = "";
      if (f) handleFileUpload(f);
    });

    // Dropzone
    const dropzone = document.getElementById(`${prefix}_dropzone`);
    dropzone?.addEventListener("click", (e) => {
      if (e.target === fileInput) return;
      fileInput?.click();
    });
    dropzone?.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone?.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });
    dropzone?.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files?.[0]) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    // Copy prompt
    document.querySelector(`[data-copy="${prefix}_analysisPrompt"]`)?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const text = document.getElementById(`${prefix}_analysisPrompt`)?.textContent?.trim() || "";
      try { await navigator.clipboard.writeText(text); } catch (_) {}
      const old = btn.innerHTML;
      btn.textContent = "복사됨 ✓";
      setTimeout(() => { btn.innerHTML = old; }, 1400);
    });

    // Launch 3D World Button
    document.getElementById(`${prefix}_btnLaunch`)?.addEventListener("click", () => {
      const promptText = document.getElementById(`${prefix}_analysisPrompt`)?.textContent?.trim();
      if (!promptText) return;

      closeModal();

      // Smooth scroll to 3D section
      const labSec = document.getElementById("spatialLabSection");
      if (labSec) {
        labSec.scrollIntoView({ behavior: "smooth" });
      }

      // Populate input and trigger generate
      const mainInput = document.getElementById("inputWorldPrompt");
      const mainBtn = document.getElementById("btnGenerateWorld");
      if (mainInput) mainInput.value = promptText;
      if (mainBtn) mainBtn.click();

      showToast("✨ 제미나이 3D 공간 프롬프트 반영 완료! 월드 랩스 3D 합성을 시작합니다.");
    });
  }

  function selectSample(key) {
    const sample = SAMPLES[key];
    if (!sample) return;

    activeSample = key;

    ["modal", "panel"].forEach((p) => {
      document.querySelectorAll(`#${p}_samples .sketch-sample-btn`).forEach((b) => {
        b.classList.toggle("is-active", b.dataset.sample === key);
      });

      const img = document.getElementById(`${p}_canvasImg`);
      if (img) img.src = sample.img;

      const title = document.getElementById(`${p}_analysisTitle`);
      const scale = document.getElementById(`${p}_analysisScale`);
      const bullets = document.getElementById(`${p}_analysisBullets`);
      const tags = document.getElementById(`${p}_analysisTags`);
      const prompt = document.getElementById(`${p}_analysisPrompt`);

      if (title) title.textContent = sample.title;
      if (scale) scale.textContent = sample.scale;
      if (bullets) bullets.innerHTML = sample.analysis.map((x) => `<li>${x}</li>`).join("");
      if (tags) tags.innerHTML = sample.equipment.map((t) => `<span class="sketch-analysis__chip">${t}</span>`).join("");
      if (prompt) prompt.textContent = sample.prompt;
      const src = document.getElementById(`${p}_analysisSource`);
      if (src) src.hidden = true;

      const overlay = document.getElementById(`${p}_scannerOverlay`);
      if (overlay) {
        overlay.classList.add("is-scanning");
        setTimeout(() => overlay.classList.remove("is-scanning"), 900);
      }
    });
    renderKpis(sample.scale);
    setViewerMeta(sample.name, sample.code);
  }

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const readAsDataURL = (blob) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image_decode_failed"));
      img.src = src;
    });

  // Normalise any raster/SVG drawing to a ≤2000px JPEG on white so Gemini always
  // receives a supported, reasonably sized image (phone photos can be 10MB+).
  async function normaliseImage(dataUrl) {
    const img = await loadImage(dataUrl);
    const w0 = img.naturalWidth || 1600;
    const h0 = img.naturalHeight || 1200;
    const k = Math.min(1, 2000 / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * k));
    const h = Math.max(1, Math.round(h0 * k));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { dataUrl: c.toDataURL("image/jpeg", 0.9), width: w0, height: h0 };
  }

  function pdfPlaceholder(name) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><rect width="800" height="520" fill="#0b1220"/><rect x="300" y="110" width="200" height="250" rx="14" fill="#111c30" stroke="#00f0ff" stroke-width="4"/><text x="400" y="255" fill="#00f0ff" font-family="sans-serif" font-size="56" font-weight="700" text-anchor="middle">PDF</text><text x="400" y="420" fill="#e2e8f0" font-family="sans-serif" font-size="26" text-anchor="middle">${esc(name).slice(0, 48)}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function setSource(name, previewSrc, state) {
    ["modal", "panel"].forEach((p) => {
      const box = document.getElementById(`${p}_analysisSource`);
      if (!box) return;
      box.hidden = false;
      if (previewSrc) document.getElementById(`${p}_analysisSourceImg`).src = previewSrc;
      if (name != null) document.getElementById(`${p}_analysisSourceName`).textContent = name;
      const st = document.getElementById(`${p}_analysisSourceState`);
      st.textContent = state.text;
      st.dataset.state = state.kind;
    });
  }

  async function handleFileUpload(file) {
    if (!file) return;
    const name = file.name || "업로드 도면";
    const ext = (name.split(".").pop() || "").toLowerCase();

    if (ext === "dwg" || ext === "dxf") {
      showToast("DWG/DXF 원본은 브라우저에서 읽을 수 없어요. CAD에서 PDF 또는 PNG로 내보낸 뒤 올려주세요.");
      return;
    }

    try {
      const raw = await readAsDataURL(file);
      const isPdf = file.type === "application/pdf" || ext === "pdf";
      let payload, mime, preview;

      if (isPdf) {
        payload = raw;
        mime = "application/pdf";
        preview = pdfPlaceholder(name);
      } else {
        const norm = await normaliseImage(raw);
        payload = norm.dataUrl;
        mime = "image/jpeg";
        preview = norm.dataUrl;
      }
      currentImageBase64 = payload;

      ["modal", "panel"].forEach((p) => {
        const img = document.getElementById(`${p}_canvasImg`);
        if (img) img.src = preview;
        document.querySelectorAll(`#${p}_samples .sketch-sample-btn`).forEach((b) => b.classList.remove("is-active"));
      });
      setSource(name, preview, { kind: "scanning", text: "Gemini가 도면을 읽는 중… (약 10~20초)" });
      setViewerMeta(name, isPdf ? "PDF" : "업로드");

      await analyzeWithGemini(payload, mime, name);
    } catch (err) {
      console.warn("[Sketch-to-3D] upload failed:", err);
      showToast("이 파일은 열 수 없어요. JPG · PNG · WEBP · PDF 도면을 올려주세요.");
    }
  }

  function renderResult(r, bulletsFallback) {
    ["modal", "panel"].forEach((p) => {
      const title = document.getElementById(`${p}_analysisTitle`);
      const scale = document.getElementById(`${p}_analysisScale`);
      const bullets = document.getElementById(`${p}_analysisBullets`);
      const tags = document.getElementById(`${p}_analysisTags`);
      const prompt = document.getElementById(`${p}_analysisPrompt`);
      if (title) title.textContent = r.blueprintTitle || "첨부 도면 분석 결과";
      if (scale) scale.textContent = r.detectedScale || "";
      const list = Array.isArray(r.structuralAnalysis) && r.structuralAnalysis.length ? r.structuralAnalysis : bulletsFallback;
      if (bullets && list) bullets.innerHTML = list.map((x) => `<li>${esc(x)}</li>`).join("");
      const eq = Array.isArray(r.equipmentDetected) ? r.equipmentDetected : Array.isArray(r.tags) ? r.tags : [];
      if (tags) tags.innerHTML = eq.map((t) => `<span class="sketch-analysis__chip">${esc(t)}</span>`).join("");
      if (prompt) prompt.textContent = r.optimizedWorldLabsPrompt || "";
    });
    renderKpis(r.detectedScale);
    // Bring the report into view (mobile stacks it below the preview)
    const card = document.getElementById("modal_analysisCard");
    if (modalEl?.classList.contains("is-open") && card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function analyzeWithGemini(base64, mimeType, sourceName = null) {
    isScanning = true;
    ["modal", "panel"].forEach((p) => {
      document.getElementById(`${p}_scannerOverlay`)?.classList.add("is-scanning");
      document.getElementById(`${p}_analysisCard`)?.classList.add("is-loading");
      const btn = document.getElementById(`${p}_btnLaunch`);
      if (btn) btn.disabled = true;
    });

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 75000);
    try {
      const res = await fetch("/api/sketch-to-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.result) {
        throw new Error(data.detail || data.error || `HTTP ${res.status}`);
      }

      renderResult(data.result);
      setSource(sourceName, null, { kind: "done", text: `✓ Gemini 실시간 분석 완료 · ${data.model || "Gemini"}` });
      showToast("✅ Gemini가 첨부 도면을 분석했어요. 면적·층고·동선이 오른쪽에 반영되었습니다.");
    } catch (err) {
      console.warn("[Sketch-to-3D] Gemini analysis failed, using offline estimate:", err);
      let estW = 42, estD = 30;
      try {
        const im = await loadImage(base64);
        if (im.naturalWidth && im.naturalHeight) {
          const ratio = im.naturalWidth / im.naturalHeight;
          estW = Math.round(Math.max(24, Math.min(80, 36 * Math.sqrt(ratio))));
          estD = Math.round(Math.max(18, Math.min(60, 36 / Math.sqrt(ratio))));
        }
      } catch (_) {}
      const dynamicScale = `약 ${(estW * estD).toLocaleString()}㎡ (${estW}m × ${estD}m) · 층고 8.5m (추정)`;
      renderResult({
        blueprintTitle: "오프라인 추정 결과 (AI 연결 실패)",
        detectedScale: dynamicScale,
        structuralAnalysis: [
          `도면 비율 기준 약 ${estW}m × ${estD}m 직사각형 평면으로 추정`,
          "표준 물류 동선 기준 중앙 3.8m 양방향 통로 가정",
          "보관 랙 존과 입출고 구역을 표준 배치로 가정",
          "정확한 분석을 위해 잠시 후 다시 업로드해 주세요",
        ],
        equipmentDetected: ["추정값", "재시도 권장"],
        optimizedWorldLabsPrompt: `A photorealistic smart industrial facility of ${dynamicScale}, with structural columns, multi-tier storage racks, polished concrete floor and 5000K high-bay LED lighting.`,
      });
      setSource(sourceName, null, { kind: "error", text: "⚠ AI 연결 실패 — 추정값 표시 중 (다시 올리면 재분석)" });
      showToast("⚠ Gemini 연결이 원활하지 않아 추정값을 표시했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      clearTimeout(timer);
      isScanning = false;
      ["modal", "panel"].forEach((p) => {
        document.getElementById(`${p}_scannerOverlay`)?.classList.remove("is-scanning");
        document.getElementById(`${p}_analysisCard`)?.classList.remove("is-loading");
        const btn = document.getElementById(`${p}_btnLaunch`);
        if (btn) btn.disabled = false;
      });
    }
  }

  function setActive(active) {
    const panel = document.getElementById("sketchStudioPanel");
    if (panel) {
      panel.classList.toggle("is-active", !!active);
    }
  }

  function openModal() {
    if (!modalEl) initModal();
    modalEl?.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modalEl?.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function initUI() {
    initInCanvasPanel();
    initModal();
  }

  // Public API
  window.SketchTo3D = {
    init: initUI,
    openModal,
    closeModal,
    setActive,
    selectSample,
    handleFileUpload,
    analyzeWithGemini,
    get isScanning() { return isScanning; }
  };

  // Auto-init once DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUI);
  } else {
    initUI();
  }
})();
