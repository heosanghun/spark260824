/* =====================================================================
 * Sketch-to-3D Pipeline Studio: Gemini Multimodal Vision + World Labs 3D
 * Enables mobile hand-drawn sketches, CAD blueprints, and photos to be
 * analyzed by Gemini 3.8 Flash and converted into photorealistic 3D worlds.
 * ===================================================================== */
(() => {
  "use strict";

  const SAMPLES = {
    warehouse: {
      name: "스마트 메가 물류 허브",
      img: "davies-assets/images/blueprints/blueprint_warehouse.svg",
      scale: "약 1,850㎡ (50m × 35m) · 층고 9.5m",
      title: "50m 초고층 자동화 스마트 물류 허브",
      analysis: [
        "4열 5단 고천장 헤비듀티 팔레트 랙 정밀 배열",
        "중앙 4.2m 폭 자율주행 AGV/AMR 고속 직진 레인 확보",
        "좌측 스마트 도크 1~3호 로딩 베이 및 입출고 검수로",
        "우측 실시간 비전 AI 바코드/외관 검품 및 분류 스테이션"
      ],
      equipment: ["고천장 팔레트 랙", "자율이송 로봇(AGV)", "도크 로딩 베이", "비전 검수기"],
      prompt: "A massive futuristic automated smart warehouse with high-bay pallet racks, wide AGV logistics runways with glowing neon cyan floor guides, autonomous forklift robots stacking standardized euro-pallets, high-contrast overhead linear LED light fixtures casting soft reflections on polished dark epoxy flooring, atmospheric industrial volumetric depth, ultra-detailed spatial geometry."
    },
    cleanroom: {
      name: "반도체 하이테크 클린룸",
      img: "davies-assets/images/blueprints/blueprint_cleanroom.svg",
      scale: "약 960㎡ (40m × 24m) · ISO Class 1",
      title: "초정밀 반도체 웨이퍼 팹 클린룸",
      analysis: [
        "ISO Class 1 규격 천장 전면 HEPA 필터 및 다운플로우 기류",
        "EUV 리소그래피 전용 옐로우 안전 필터 조명 구역 분할",
        "천장 궤도형 OHT(Overhead Hoist Transport) 무인 이송 모노레일",
        "플라즈마 식각 및 CVD 증착 로봇 클러스터 툴 배치"
      ],
      equipment: ["EUV 스캐너", "천장 OHT 모노레일", "에어샤워 인터록", "FOUP 버퍼 스토커"],
      prompt: "A state-of-the-art semiconductor cleanroom fabrication facility with overhead ceiling-mounted OHT robotic wafer pod tracks, amber-yellow lit photolithography bays, robotic robotic cluster arms handling silicon wafers, pristine mirror-finish raised floor tiles, ultra-pure stainless steel equipment casings with glowing indicator lights."
    },
    showroom: {
      name: "하이퍼카 쇼룸 & 다이노",
      img: "davies-assets/images/blueprints/blueprint_showroom.svg",
      scale: "약 750㎡ (35m × 22m) · 턴테이블 Ø 7.2m",
      title: "아우디 R8 하이퍼카 전시 & 섀시 랩",
      analysis: [
        "직경 7.2m 360도 전동 회전 전시 턴테이블 중앙 배치",
        "차량 진입용 고광택 미러 에폭시 드라이브인 런웨이",
        "후면 상시 4륜 다이노 섀시 롤러 파워 테스트 베드",
        "우측 VIP 맞춤형 비스포크 라운지 및 머티리얼 샘플 월"
      ],
      equipment: ["360° 전동 턴테이블", "4륜 다이노 롤러", "차량 진입 런웨이", "VIP 상담 부스"],
      prompt: "A luxury futuristic supercar design studio and exhibition showroom featuring an Audi R8 supercar elevated on a glowing circular rotating turntable platform, deep black mirror epoxy flooring reflecting dramatic neon magenta and ice-blue overhead halo light rings, dyno roller testing pit in the background, sleek minimalist architectural glass partitions."
    }
  };

  let activeSample = "warehouse";
  let currentImageBase64 = null;
  let isScanning = false;
  let modalEl = null;
  let toastEl = null;

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

  function createStudioContentHTML(idPrefix) {
    const s = SAMPLES[activeSample];
    return `
      <!-- Mobile / Top Quick Action Strip -->
      <div class="sketch-modal__quick-actions">
        <button type="button" class="sketch-quick-btn sketch-quick-btn--camera" id="${idPrefix}_btnCamera">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          <span>사진 / 손그림 촬영</span>
        </button>
        <button type="button" class="sketch-quick-btn sketch-quick-btn--upload" id="${idPrefix}_btnUpload">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>CAD 도면 / 파일 선택</span>
        </button>
        <input type="file" id="${idPrefix}_cameraInput" accept="image/*" capture="environment" style="display: none;">
        <input type="file" id="${idPrefix}_fileInput" accept="image/*,.pdf,.dwg,.dxf" style="display: none;">
      </div>

      <div class="sketch-modal__body">
        <!-- Left Column: Blueprint Preview & Samples & Dropzone -->
        <div class="sketch-modal__left">
          <!-- Interactive Blueprint Display Area -->
          <div class="sketch-viewer" id="${idPrefix}_viewer">
            <img id="${idPrefix}_canvasImg" class="sketch-viewer__canvas" src="${s.img}" alt="도면/스케치 프리뷰">
            
            <!-- Scanning Hologram Beam -->
            <div class="sketch-scanner-overlay" id="${idPrefix}_scannerOverlay">
              <div class="sketch-scanner__grid"></div>
              <div class="sketch-scanner__radar"></div>
              <div class="sketch-scanner__beam"></div>
              <div class="sketch-scanner__label">
                <span class="spinner-grow spinner-grow-sm" role="status" style="width: 10px; height: 10px;"></span>
                GEMINI 3.8 SPATIAL SCANNING IN PROGRESS...
              </div>
            </div>
          </div>

          <!-- Sample Blueprints -->
          <div class="sketch-samples" id="${idPrefix}_samples">
            <span class="sketch-samples__title">샘플 도면 선택:</span>
            <button type="button" class="sketch-sample-btn ${activeSample === 'warehouse' ? 'is-active' : ''}" data-sample="warehouse">
              <i class="icon icon-box"></i> 스마트 물류 허브
            </button>
            <button type="button" class="sketch-sample-btn ${activeSample === 'cleanroom' ? 'is-active' : ''}" data-sample="cleanroom">
              <i class="icon icon-cpu"></i> 반도체 클린룸
            </button>
            <button type="button" class="sketch-sample-btn ${activeSample === 'showroom' ? 'is-active' : ''}" data-sample="showroom">
              <i class="icon icon-car"></i> 하이퍼카 쇼룸
            </button>
          </div>

          <!-- Upload Dropzone -->
          <div class="sketch-dropzone" id="${idPrefix}_dropzone">
            <div class="sketch-dropzone__info">
              <div class="sketch-dropzone__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
              <div class="sketch-dropzone__text">
                <strong>모바일 손그림 스케치 / CAD 도면 / 현장 사진 업로드</strong><br>
                <span>드래그 앤 드롭 또는 클릭하여 업로드 (JPG, PNG, WEBP, PDF)</span>
              </div>
            </div>
            <button type="button" class="sketch-dropzone__btn">파일 선택</button>
          </div>
        </div>

        <!-- Right Column: Gemini Multimodal Spatial Inspector -->
        <div class="sketch-modal__right">
          <div class="sketch-analysis-card" id="${idPrefix}_analysisCard">
            <div class="sketch-analysis__header">
              <div class="sketch-analysis__tagline">GEMINI SPATIAL REASONING REPORT</div>
              <h4 class="sketch-analysis__title" id="${idPrefix}_analysisTitle">${s.title}</h4>
              <div class="sketch-analysis__scale" id="${idPrefix}_analysisScale">${s.scale}</div>
            </div>
            ${sourceBlockHTML(idPrefix)}

            <!-- Structural Bullets -->
            <div class="sketch-analysis__section">
              <div class="sketch-analysis__label">공간 구조 및 동선 분석</div>
              <ul class="sketch-analysis__bullets" id="${idPrefix}_analysisBullets">
                ${s.analysis.map((item) => `<li>${item}</li>`).join("")}
              </ul>
            </div>

            <!-- Detected Equipment -->
            <div class="sketch-analysis__section">
              <div class="sketch-analysis__label">식별된 설비 및 객체</div>
              <div class="sketch-analysis__tags" id="${idPrefix}_analysisTags">
                ${s.equipment.map((t) => `<span class="sketch-analysis__chip">${t}</span>`).join("")}
              </div>
            </div>

            <!-- Optimized Prompt Display -->
            <div class="sketch-prompt-box">
              <div class="sketch-prompt-box__label">
                <span>World Labs 전용 초고도화 프롬프트</span>
                <span style="color: #64748b;">3D Splatting Ready</span>
              </div>
              <div class="sketch-prompt-box__text" id="${idPrefix}_analysisPrompt">${s.prompt}</div>
            </div>

            <!-- CTA Generate World Labs 3D World -->
            <button type="button" class="sketch-btn-generate" id="${idPrefix}_btnLaunch">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              <span>이 도면으로 3D 월드 생성 (GENERATE 3D)</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "sketch-toast";
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${msg}</span>
    `;
    toastEl.classList.add("is-show");
    setTimeout(() => toastEl.classList.remove("is-show"), 3200);
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <h2>도면/스케치 AI 3D 스튜디오</h2>
            <span class="sketch-studio__badge">
              <span class="dot"></span>
              Gemini 3.8 Flash
            </span>
          </div>
          <button type="button" class="sketch-modal__close" id="modal_closeBtn" aria-label="닫기">✕</button>
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
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                도면/스케치 AI 3D 파이프라인
              </h3>
              <span class="sketch-studio__badge">
                <span class="dot"></span>
                Gemini 3.8 Flash
              </span>
            </div>
            <div style="font-size: 11px; color: #94a3b8; font-family: monospace;">
              World Labs Marble 1.1
            </div>
          </header>
          <div class="sketch-viewer" id="panel_viewer">
            <img id="panel_canvasImg" class="sketch-viewer__canvas" src="${SAMPLES[activeSample].img}" alt="도면/스케치 프리뷰">
            <div class="sketch-scanner-overlay" id="panel_scannerOverlay">
              <div class="sketch-scanner__grid"></div>
              <div class="sketch-scanner__radar"></div>
              <div class="sketch-scanner__beam"></div>
              <div class="sketch-scanner__label">
                <span class="spinner-grow spinner-grow-sm" role="status" style="width: 10px; height: 10px;"></span>
                GEMINI 3.8 SPATIAL SCANNING IN PROGRESS...
              </div>
            </div>
          </div>
          <div class="sketch-samples" id="panel_samples">
            <span class="sketch-samples__title">샘플 도면 선택:</span>
            <button type="button" class="sketch-sample-btn is-active" data-sample="warehouse">
              <i class="icon icon-box"></i> 스마트 물류 허브
            </button>
            <button type="button" class="sketch-sample-btn" data-sample="cleanroom">
              <i class="icon icon-cpu"></i> 반도체 클린룸
            </button>
            <button type="button" class="sketch-sample-btn" data-sample="showroom">
              <i class="icon icon-car"></i> 하이퍼카 쇼룸
            </button>
          </div>
          <div class="sketch-dropzone" id="panel_dropzone">
            <div class="sketch-dropzone__info">
              <div class="sketch-dropzone__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </div>
              <div class="sketch-dropzone__text">
                <strong>모바일 손그림 스케치 / CAD 도면 / 현장 사진 업로드</strong><br>
                <span>드래그 앤 드롭 또는 클릭하여 업로드 (JPG, PNG, WEBP, PDF)</span>
              </div>
            </div>
            <button type="button" class="sketch-dropzone__btn">파일 선택</button>
            <input type="file" id="panel_fileInput" accept="image/*,.pdf" style="display: none;">
          </div>
        </div>

        <div class="sketch-studio__side">
          <div class="sketch-analysis-card" id="panel_analysisCard">
            <div class="sketch-analysis__header">
              <div class="sketch-analysis__tagline">SPATIAL REASONING REPORT</div>
              <h4 class="sketch-analysis__title" id="panel_analysisTitle">${SAMPLES[activeSample].title}</h4>
              <div class="sketch-analysis__scale" id="panel_analysisScale">${SAMPLES[activeSample].scale}</div>
            </div>
            ${sourceBlockHTML("panel")}
            <div class="sketch-analysis__section">
              <div class="sketch-analysis__label">공간 구조 및 동선 분석</div>
              <ul class="sketch-analysis__bullets" id="panel_analysisBullets">
                ${SAMPLES[activeSample].analysis.map((item) => `<li>${item}</li>`).join("")}
              </ul>
            </div>
            <div class="sketch-analysis__section">
              <div class="sketch-analysis__label">식별된 설비 및 객체</div>
              <div class="sketch-analysis__tags" id="panel_analysisTags">
                ${SAMPLES[activeSample].equipment.map((t) => `<span class="sketch-analysis__chip">${t}</span>`).join("")}
              </div>
            </div>
            <div class="sketch-prompt-box">
              <div class="sketch-prompt-box__label">
                <span>World Labs 전용 초고도화 프롬프트</span>
                <span style="color: #64748b;">3D Splatting Ready</span>
              </div>
              <div class="sketch-prompt-box__text" id="panel_analysisPrompt">${SAMPLES[activeSample].prompt}</div>
            </div>
            <button type="button" class="sketch-btn-generate" id="panel_btnLaunch">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              <span>이 도면으로 3D 월드 생성 (GENERATE 3D)</span>
            </button>
          </div>
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
        setTimeout(() => overlay.classList.remove("is-scanning"), 1000);
      }
    });
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
