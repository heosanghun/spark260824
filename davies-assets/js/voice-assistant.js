/**
 * World Labs Spark 3D - AI Voice Assistant (Nova)
 * Primary: Gemini 3.8 Live real-time speech-to-speech (see gemini-live.js, token via /api/live-token).
 * Fallback: Browser Native free mode (Web Speech API + speechSynthesis + local intent rules).
 */

(function () {
  "use strict";

  // State Management
  const state = {
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    liveMode: false, // true while a Gemini Live session is active
    speechRecognition: null,
  };

  // Purge the OpenAI key that older builds cached in localStorage (it was exposed publicly).
  try {
    localStorage.removeItem("OPENAI_API_KEY");
  } catch (e) {}

  // Section Mapping
  const sectionMap = {
    hero: "#top",
    top: "#top",
    home: "#top",
    spatialLab: "#spatialLabSection",
    lab: "#spatialLabSection",
    warehouse: "#spatialLabSection",
    works: "#workScroll",
    portfolio: "#workScroll",
    whitepapers: "#whitepaperSection",
    research: "#whitepaperSection",
    services: "#serviceScroll",
    about: "#aboutScroll",
    pricing: "#pricingSection",
    price: "#pricingSection",
    tier: "#pricingSection",
    awards: "#awardScroll",
    certifications: "#awardScroll",
    faq: "#faqScroll",
    contact: "#contactScroll",
    footer: "#footerScroll",
    bottom: "#footerScroll",
  };

  // Action Dispatcher
  function executeAction(actionName, params = {}) {
    console.log(`[Nova Voice Action] Executing: ${actionName}`, params);
    let desc = "";

    switch (actionName) {
      case "trigger_physics": {
        const mode = params.action || "drop";
        const labSec = document.querySelector("#spatialLabSection");
        if (labSec) labSec.scrollIntoView({ behavior: "smooth" });

        setTimeout(() => {
          if (mode === "drop") {
            const btn = document.getElementById("btnDropTest");
            if (btn) btn.click();
            desc = "1m 상자 낙하 시뮬레이션 실행";
          } else if (mode === "toss") {
            const btn = document.getElementById("btnTossTest");
            if (btn) btn.click();
            desc = "2.5m/s 상자 투척 시뮬레이션 실행";
          } else if (mode === "reset") {
            const btn = document.getElementById("btnResetPhysics");
            if (btn) btn.click();
            desc = "물리 시뮬레이션 및 상자 위치 초기화";
          }
        }, 300);
        break;
      }

      case "toggle_wireframe": {
        const labSec = document.querySelector("#spatialLabSection");
        if (labSec) labSec.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          const btn = document.getElementById("btnToggleWire");
          if (btn) btn.click();
        }, 300);
        desc = "와이어프레임 렌더링 토글";
        break;
      }

      case "toggle_partition": {
        const labSec = document.querySelector("#spatialLabSection");
        if (labSec) labSec.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          const btn = document.getElementById("btnTogglePartition");
          if (btn) btn.click();
        }, 300);
        desc = "7부품 공간 분할(OBB) 바운딩 박스 토글";
        break;
      }

      case "run_picking_benchmark": {
        const labSec = document.querySelector("#spatialLabSection");
        if (labSec) labSec.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          const btn = document.getElementById("btnRunPicking");
          if (btn) btn.click();
        }, 300);
        desc = "60점 레이캐스팅 정확도 평가 가동";
        break;
      }

      case "navigate_section": {
        const sec = params.section || "spatialLab";
        if (sec === "hero" || sec === "top" || sec === "home") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          desc = "페이지 최상단 홈으로 이동";
        } else if (sec === "footer" || sec === "bottom") {
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
          desc = "페이지 최하단 사이트맵으로 이동";
        } else {
          const secId = sectionMap[sec] || sec;
          const target = document.querySelector(secId);
          if (target) {
            target.scrollIntoView({ behavior: "smooth" });
            desc = `${sec} 섹션으로 이동`;
          }
        }
        break;
      }

      case "open_car_physics": {
        desc = "자동차 3D 물리 시뮬레이터 페이지로 이동";
        setTimeout(() => {
          window.location.href = "car-physics.html";
        }, 1000);
        break;
      }

      case "toggle_fullscreen": {
        const btn = document.getElementById("btnFullscreen");
        if (btn) btn.click();
        desc = "3D 뷰포트 전체화면 모드 전환";
        break;
      }

      case "generate_3d_world": {
        let prompt = params.prompt || "";
        const lower = prompt.toLowerCase();
        if (lower.includes("반도체") || lower.includes("클린룸")) {
          prompt = "A high-tech cleanroom semiconductor fabrication plant with robotic wafer handling arms and overhead conveyor tracks";
        } else if (lower.includes("사이버펑크") || lower.includes("격납고")) {
          prompt = "A massive cyberpunk industrial cargo hangar with heavy lifter drones and neon holographic waypoints";
        } else if (lower.includes("콜드체인") || lower.includes("냉장") || lower.includes("냉동")) {
          prompt = "An automated cold-chain logistics facility with autonomous mobile forklift robots and stacked cooling crates";
        } else if (!prompt || lower.includes("스마트") || lower.includes("물류")) {
          prompt = "A futuristic automated smart warehouse with high-bay pallet racks, AGV logistics robots, and glowing LED path guides";
        }

        const input = document.getElementById("inputWorldPrompt");
        const btn = document.getElementById("btnGenerateWorld");
        const labSec = document.querySelector("#spatialLabSection");
        if (labSec) labSec.scrollIntoView({ behavior: "smooth" });
        if (input) input.value = prompt;
        if (btn) {
          setTimeout(() => btn.click(), 400);
        }
        desc = `AI 3D 공간 생성 가동: "${prompt.slice(0, 30)}..."`;
        break;
      }

      case "open_lingbot_world": {
        window.open("https://lingbot-world-v2-webui.pages.dev/", "_blank", "noopener,noreferrer");
        desc = "LingBot-World 2.0 무한 3D 시뮬레이터 새 창 열기";
        break;
      }

      case "open_research_article": {
        window.open("https://www.aicitybuilders.com/gn1#1", "_blank", "noopener,noreferrer");
        desc = "AI City Builders 시뮬레이션 칼럼 새 창 열기";
        break;
      }

      case "control_faq": {
        const itemNum = parseInt(params.item, 10) || 1;
        const faqSec = document.querySelector("#faqScroll");
        if (faqSec) faqSec.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          const targetBtn = document.querySelector(`[data-bs-target="#faq-${itemNum}"]`);
          if (targetBtn) {
            const collapseElem = document.querySelector(`#faq-${itemNum}`);
            if (!collapseElem || !collapseElem.classList.contains("show")) {
              targetBtn.click();
            }
          }
        }, 400);
        desc = `자주 묻는 질문(FAQ) ${itemNum}번 항목 펼치기`;
        break;
      }

      case "scroll_page": {
        const dir = params.direction || "down";
        const amount = params.amount === "page" ? window.innerHeight * 0.8 : 550;
        const delta = dir === "up" ? -amount : amount;
        window.scrollBy({ top: delta, behavior: "smooth" });
        desc = `화면 ${dir === "up" ? "위로" : "아래로"} 스크롤`;
        break;
      }

      case "close_assistant": {
        const modal = document.getElementById("voiceAssistantModal");
        if (modal) modal.style.display = "none";
        stopListening();
        desc = "어시스턴트 창 닫기";
        break;
      }

      case "test_voice": {
        desc = "Nova 음성 소개 및 테스트";
        break;
      }

      case "switch_theme": {
        const want = params.theme || "next";
        const lab = window.spatialLab;
        const labSec = document.querySelector("#spatialLabSection");
        if (labSec) labSec.scrollIntoView({ behavior: "smooth" });
        if (lab) {
          if (want === "warehouse") lab.loadTheme(0, -1);
          else if (want === "car") lab.loadTheme(1, 1);
          else lab.stepTheme(want === "prev" ? -1 : 1);
        }
        desc = want === "car" ? "자동차 쇼룸 스튜디오 테마로 전환"
          : want === "warehouse" ? "스마트 물류 창고 테마로 전환" : "다음 전시 테마로 전환";
        break;
      }

      default:
        console.warn("[Nova] Unknown action:", actionName);
    }

    if (desc) {
      updateActionBadge(desc);
    }
    return desc;
  }

  // Local Intent Rule Parser (Fallback or fast matching)
  function parseLocalIntent(text) {
    const t = text.toLowerCase().replace(/\s+/g, "");

    if (t.includes("낙하") || t.includes("떨어") || t.includes("1미터") || t.includes("1m") || t.includes("상자낙하") || t.includes("박스낙하")) {
      executeAction("trigger_physics", { action: "drop" });
      return "네! 1미터 상자 낙하 시뮬레이션을 실행해 드렸어요.";
    }
    if (t.includes("던져") || t.includes("투척") || t.includes("날려") || t.includes("2.5m") || t.includes("박스투척")) {
      executeAction("trigger_physics", { action: "toss" });
      return "통로 방향으로 2.5m/s 상자 투척 시뮬레이션을 가동했습니다.";
    }
    if (t.includes("리셋") || t.includes("초기화") || t.includes("원래대로") || t.includes("처음으로") || t.includes("상자치워")) {
      executeAction("trigger_physics", { action: "reset" });
      return "물리 시뮬레이션과 상자 위치를 초기 상태로 리셋했습니다.";
    }
    if (t.includes("와이어") || t.includes("격자") || t.includes("그리드") || t.includes("와이어프레임")) {
      executeAction("toggle_wireframe");
      return "와이어프레임 렌더링 표시 상태를 전환했습니다.";
    }
    if (t.includes("분할") || t.includes("바운딩") || t.includes("obb") || t.includes("7부품") || t.includes("박스표시") || t.includes("섹터")) {
      executeAction("toggle_partition");
      return "스마트 물류창고 7부품 공간 분할 OBB 바운딩 박스를 표시합니다.";
    }
    if (t.includes("피킹") || t.includes("레이캐스팅") || t.includes("정확도") || t.includes("오딧") || t.includes("검사") || t.includes("60점")) {
      executeAction("run_picking_benchmark");
      return "60점 레이캐스팅 정확도 평가 벤치마크를 가동했습니다.";
    }
    if (t.includes("쇼룸") || t.includes("스튜디오") || (t.includes("자동차") && (t.includes("테마") || t.includes("보여")))) {
      executeAction("switch_theme", { theme: "car" });
      return "자동차 쇼룸 스튜디오로 바꿔 드렸어요. 드래그해서 둘러보세요.";
    }
    if (t.includes("다음테마") || t.includes("테마바꿔") || t.includes("테마넘겨") || t.includes("다른공간")) {
      executeAction("switch_theme", { theme: "next" });
      return "다음 전시 테마로 넘겨 드렸어요.";
    }
    if (t.includes("창고") || t.includes("시뮬레이터") || t.includes("연구실") || t.includes("랩") || t.includes("스마트창고") || t.includes("물류창고")) {
      executeAction("navigate_section", { section: "spatialLab" });
      return "3D 스마트 물류창고 연구실 섹션으로 안내해 드릴게요.";
    }
    if (t.includes("자동차") || t.includes("차량") || t.includes("카피직스") || t.includes("차")) {
      executeAction("open_car_physics");
      return "자동차 3D 물리 시뮬레이터 페이지로 이동합니다.";
    }
    if (t.includes("질문") || t.includes("faq") || t.includes("자주묻는")) {
      executeAction("navigate_section", { section: "faq" });
      return "자주 묻는 질문(FAQ) 섹션으로 이동합니다.";
    }
    if (t.includes("벤치마크") || t.includes("인증") || t.includes("표준") || t.includes("성과") || t.includes("tier-1")) {
      executeAction("navigate_section", { section: "awards" });
      return "공식 벤치마크 및 글로벌 표준 인증 섹션으로 이동합니다.";
    }
    if (t.includes("소개") || t.includes("월드랩스") || t.includes("회사") || t.includes("about")) {
      executeAction("navigate_section", { section: "about" });
      return "월드랩스 공간 지능 소개 섹션으로 안내합니다.";
    }
    if (t.includes("서비스") || t.includes("솔루션") || t.includes("디지털트윈") || t.includes("트윈os")) {
      executeAction("navigate_section", { section: "services" });
      return "공간 지능 아키텍처 및 디지털 트윈 OS 서비스 섹션으로 이동합니다.";
    }
    if (t.includes("요금") || t.includes("가격") || t.includes("얼마") || t.includes("달러") || t.includes("원화") || t.includes("환율") || t.includes("pricing") || t.includes("tier")) {
      executeAction("navigate_section", { section: "pricing" });
      return "요금 정책 섹션으로 이동해 드렸어요! 본 요금제는 상용화 도입 가이드라인(예시)이며, 각 달러 가격 위에 마우스를 올리시면 원화 환산 금액을 실시간으로 확인하실 수 있습니다.";
    }
    if (t.includes("포트폴리오") || t.includes("작업물") || t.includes("works") || t.includes("프로젝트")) {
      executeAction("navigate_section", { section: "works" });
      return "주요 프로젝트 및 포트폴리오 섹션으로 이동합니다.";
    }
    if (t.includes("링봇") || t.includes("lingbot") || t.includes("인피니티") || t.includes("월드시뮬레이터")) {
      executeAction("open_lingbot_world");
      return "LingBot-World 2.0 무한 월드 시뮬레이터를 새 창에서 열었습니다. 2D 이미지로 생성된 3D 가상 세계를 WASD 키보드로 자유롭게 탐험해 보세요!";
    }
    if (t.includes("칼럼") || t.includes("시티빌더스") || t.includes("aicity") || t.includes("굿나잇") || t.includes("강화학습")) {
      executeAction("open_research_article");
      return "AI City Builders의 'LLM 다음은 시뮬레이션이다, 강화학습' 특별 연구 칼럼을 새 창에서 열었습니다.";
    }
    if (t.includes("백서") || t.includes("논문") || t.includes("리포트") || t.includes("연구") || t.includes("whitepaper")) {
      executeAction("navigate_section", { section: "whitepapers" });
      return "연구 전략 백서 및 Physical AI 시뮬레이션 섹션으로 안내합니다.";
    }
    if (t.includes("문의") || t.includes("연락") || t.includes("이메일") || t.includes("contact")) {
      executeAction("navigate_section", { section: "contact" });
      return "프로젝트 문의 및 파트너십 섹션으로 안내해 드릴게요.";
    }
    if (t.includes("맨위") || t.includes("상단") || t.includes("홈으로") || t.includes("메인")) {
      executeAction("navigate_section", { section: "hero" });
      return "페이지 최상단 홈 화면으로 이동했습니다.";
    }
    if (t.includes("맨아래") || t.includes("하단") || t.includes("푸터") || t.includes("사이트맵")) {
      executeAction("navigate_section", { section: "footer" });
      return "페이지 최하단 사이트맵으로 이동했습니다.";
    }
    if (t.includes("전체화면") || t.includes("크게") || t.includes("화면확대")) {
      executeAction("toggle_fullscreen");
      return "3D 뷰포트 전체화면 모드를 전환합니다.";
    }
    if (t.includes("생성") || t.includes("만들어") || t.includes("월드") || t.includes("프롬프트")) {
      executeAction("generate_3d_world", { prompt: text });
      return "World Labs AI 3D 공간 생성을 시작했습니다.";
    }
    if (t.includes("내려") || t.includes("스크롤다운")) {
      executeAction("scroll_page", { direction: "down" });
      return "화면을 아래로 스크롤했습니다.";
    }
    if (t.includes("올려") || t.includes("스크롤업")) {
      executeAction("scroll_page", { direction: "up" });
      return "화면을 위로 스크롤했습니다.";
    }
    if (t.includes("닫아") || t.includes("숨겨") || t.includes("종료") || t.includes("그만")) {
      executeAction("close_assistant");
      return "네, 필요하실 때 언제든 마이크를 눌러주세요.";
    }
    if (t.includes("안녕") || t.includes("누구") || t.includes("목소리") || t.includes("테스트") || t.includes("반가워")) {
      executeAction("test_voice");
      return "안녕하세요! 저는 World Labs의 공간 지능 AI 어시스턴트 노바예요. 3D 물리 시뮬레이션, 섹션 이동, AI 공간 생성 등 웹사이트의 모든 기능을 말씀해 주시면 바로 실행해 드릴게요.";
    }

    return "말씀하신 요청을 접수했습니다. 화면 제어 명령을 실행하거나 적절한 섹션으로 안내해 드릴게요.";
  }

  // Tool specs (function-calling schema) shared by Gemini Live; converted to functionDeclarations below.
  const TOOL_SPECS = [
    {
      type: "function",
      function: {
        name: "trigger_physics",
        description: "3D 공간 물리 시뮬레이션 충돌 액션을 실행합니다.",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["drop", "toss", "reset"],
              description: "drop: 1m 상자 낙하, toss: 2.5m/s 투척 충돌, reset: 초기화"
            }
          },
          required: ["action"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "navigate_section",
        description: "웹페이지 내 특정 섹션으로 부드럽게 스크롤 이동합니다.",
        parameters: {
          type: "object",
          properties: {
            section: {
              type: "string",
              enum: ["hero", "spatialLab", "awards", "faq", "about", "services", "whitepapers", "contact", "works", "pricing", "footer"],
              description: "이동할 대상 섹션 ID"
            }
          },
          required: ["section"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "toggle_wireframe",
        description: "3D 스마트 물류창고 바닥 및 랙 와이어프레임 렌더링 표시를 켜거나 끕니다.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "toggle_partition",
        description: "7부품 공간 분할 OBB(지향성 바운딩 박스) 표시를 켜거나 끕니다.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "run_picking_benchmark",
        description: "60점 레이캐스팅 정확도 평가 벤치마크 루틴을 가동합니다.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "open_lingbot_world",
        description: "LingBot-World 2.0 무한 3D 월드 시뮬레이터(lingbot-world-v2-webui.pages.dev)를 새 창에서 엽니다.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "open_car_physics",
        description: "자동차 3D 물리 시뮬레이터 페이지(car-physics.html)로 이동합니다.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "toggle_fullscreen",
        description: "3D 뷰포트 전체화면 모드를 전환합니다.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "generate_3d_world",
        description: "AI 텍스트 프롬프트를 기입하고 새로운 3D 공간을 실시간 생성합니다.",
        parameters: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "생성할 3D 공간 설명 (영문/한글)" }
          },
          required: ["prompt"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "open_research_article",
        description: "AI City Builders의 'LLM 다음은 시뮬레이션이다, 강화학습' 특별 연구 칼럼을 새 브라우저 창에서 엽니다.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "control_faq",
        description: "자주 묻는 질문(FAQ)의 특정 질문 아코디언을 펼치고 안내합니다.",
        parameters: {
          type: "object",
          properties: {
            item: { type: "integer", minimum: 1, maximum: 6, description: "FAQ 번호 (1: 3DGS vs 메시, 2: 물리 엔진, 3: 로봇 연동, 4: 센서 및 포맷, 5: 피킹 정확도, 6: 강화학습)" }
          },
          required: ["item"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "scroll_page",
        description: "화면을 위나 아래로 부드럽게 스크롤합니다.",
        parameters: {
          type: "object",
          properties: {
            direction: { type: "string", enum: ["up", "down"], description: "스크롤 방향" }
          },
          required: ["direction"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "close_assistant",
        description: "AI 음성 어시스턴트 창을 닫고 음성 대화를 종료합니다.",
        parameters: { type: "object", properties: {} }
      }
    }
  ];

  TOOL_SPECS.push({
    type: "function",
    function: {
      name: "switch_theme",
      description: "전시 테마를 전환합니다 (물류 창고 ↔ 자동차 쇼룸). 사용자가 다른 장면/쇼룸/자동차/창고를 보여달라고 할 때 호출합니다.",
      parameters: {
        type: "object",
        properties: {
          theme: { type: "string", enum: ["warehouse", "car", "next", "prev"], description: "warehouse=스마트 물류 창고, car=자동차 쇼룸, next/prev=다음/이전 테마" }
        },
        required: ["theme"]
      }
    }
  });

  // Gemini Live expects bare function declarations; omit empty parameter objects.
  const GEMINI_TOOLS = TOOL_SPECS.map((t) => {
    const f = t.function;
    const d = { name: f.name, description: f.description };
    if (f.parameters && Object.keys(f.parameters.properties || {}).length) d.parameters = f.parameters;
    return d;
  });

  const SYSTEM_PROMPT = `당신은 SIMSREALITY 전시 부스의 3D 공간 지능 포털에서 관람객을 안내하는 AI 음성 도우미 '노바(Nova)'입니다.
지금은 전시장이고, 관람객 대부분은 처음 보는 일반인이에요. 실제 사람 안내원처럼 따뜻하고 자연스럽게 대화하세요.

[말하기 규칙]
- 항상 한국어 해요체로, 한 번에 1~2문장만 짧게 말하세요. 목록·기호·이모지·영어 약어 나열은 피하세요.
- 질문이 길어도 핵심만 쉽게 설명하고, 필요하면 "더 알려드릴까요?"처럼 짧게 이어가세요.
- 관람객이 말을 끊으면 즉시 멈추고 새 말에 답하세요.

[화면 제어 도구 — 요청이 있으면 바로 호출하고, 동시에 "네, 상자를 떨어뜨려 볼게요!"처럼 짧게 말해 주세요]
- 상자 낙하/던지기/초기화: trigger_physics (drop, toss, reset)
- 와이어프레임: toggle_wireframe / 7부품 공간 분할: toggle_partition
- 60점 피킹 정확도 평가: run_picking_benchmark / 전체화면: toggle_fullscreen
- 테마 전환(물류 창고 ↔ 자동차 쇼룸, 다음/이전): switch_theme
- 3D 공간 생성: generate_3d_world (prompt)
- 섹션 이동: navigate_section / 스크롤: scroll_page
- 자동차 물리 시뮬레이터: open_car_physics / 연구 칼럼: open_research_article / FAQ: control_faq
- 대화 종료나 창 닫기 요청: 짧게 작별 인사 후 close_assistant

[전시 내용 요약]
- 실사 공간을 3D 가우시안 스플래팅(3DGS)으로 복원하고, Rapier 물리 엔진으로 1미터 높이 낙하 같은 실제 중력 실험을 보여줘요.
- 스마트 물류 창고 디지털 트윈, 자동차 쇼룸 테마, 로봇 피킹 정확도 평가, 텍스트로 3D 세상을 만드는 World Labs AI 기능이 있어요.
- 모르는 내용은 지어내지 말고 부스 담당자에게 문의하시라고 안내하세요.`;

  const LIVE_GREETING = "(시스템 안내: 관람객이 방금 마이크를 켰어요. 한 문장으로 짧고 반갑게 인사하고 무엇을 도와드릴지 물어보세요. 도구는 호출하지 마세요.)";

  function setModeBadge(label) {
    const b = document.getElementById("novaModeBadge");
    if (b) b.textContent = label;
  }

  // Start a natural, full-duplex Gemini Live conversation (hands-free, barge-in).
  async function startLive() {
    state.liveMode = true;
    state.isListening = true;
    setModeBadge("Gemini Live");
    updateTranscript("🎙️ 연결 중이에요... 편하게 말씀하세요");
    startWaveAnimation();
    await window.NovaLive.start({
      systemInstruction: SYSTEM_PROMPT,
      tools: GEMINI_TOOLS,
      voice: "Kore",
      greeting: LIVE_GREETING,
      idleMs: 15000,
      maxMs: 180000,
      on: {
        status: (type, label) => {
          state.isSpeaking = type === "speaking";
          updateStatus(type, label);
        },
        user: (text) => { if (text) updateTranscript(text); },
        ai: (text) => { if (text) updateResponse(text); },
        tool: (name, args) => {
          if (name === "close_assistant") {
            // Let Nova finish the goodbye line before closing.
            setTimeout(() => executeAction("close_assistant"), 2500);
            return "어시스턴트 창을 닫습니다";
          }
          const desc = executeAction(name, args || {});
          return desc ? `${desc} 실행 완료` : "실행 완료";
        },
        end: (reason) => {
          state.liveMode = false;
          state.isListening = false;
          state.isSpeaking = false;
          stopWaveAnimation();
          updateStatus("idle", reason === "idle" ? "조용해서 대화를 마쳤어요 · 마이크를 다시 눌러주세요" : "대기 중");
        },
        error: (err) => console.warn("[Nova Live]", err),
      },
    });
  }
  // Pre-load and cache voices for Web Speech API
  let cachedVoices = [];
  function populateVoices() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      cachedVoices = window.speechSynthesis.getVoices();
    }
  }
  populateVoices();
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }

  function getKoreanFemaleVoice() {
    let voices = cachedVoices;
    if (!voices || voices.length === 0) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        voices = window.speechSynthesis.getVoices();
        cachedVoices = voices;
      }
    }
    if (!voices || voices.length === 0) return null;

    // Filter all Korean voice entries
    const koVoices = voices.filter((v) => {
      const lang = (v.lang || "").toLowerCase().replace("_", "-");
      const name = (v.name || "").toLowerCase();
      return lang.includes("ko") || lang.startsWith("ko-kr") || name.includes("korean") || name.includes("한국");
    });

    if (koVoices.length === 0) return null;

    // Known female voice keywords across Windows, Edge, macOS, iOS, Android, Chrome
    const femaleKeywords = [
      "sunhi", "sun-hi", "선희",
      "heami", "혜미",
      "yuna", "유나",
      "sora", "소라",
      "chaewon", "chae-won", "채원",
      "jimin", "지민",
      "soonbok", "순복",
      "female", "woman", "girl", "여성", "여자",
      "kfg", "ko-kr-x-kfg",
      "neural2-a", "neural2-b",
      "wavenet-a", "wavenet-b",
      "standard-a", "standard-b",
      "google 한국어"
    ];

    // Explicit male exclusion keywords
    const maleKeywords = [
      "injoon", "in-joon", "인준",
      "bongjin", "봉진",
      "sehyeon", "se-hyeon", "세현",
      "jinho", "진호",
      "male", "남성", "남자",
      "standard-c", "standard-d",
      "wavenet-c", "wavenet-d",
      "neural2-c"
    ];

    // 1st priority: Verified female Korean voice that does not match male keywords
    for (const v of koVoices) {
      const name = (v.name || "").toLowerCase();
      const isFemale = femaleKeywords.some((kw) => name.includes(kw));
      const isMale = maleKeywords.some((kw) => name.includes(kw));
      if (isFemale && !isMale) {
        console.log(`[Nova] Selected verified Korean Female voice: ${v.name}`);
        return v;
      }
    }

    // 2nd priority: Any Korean voice that is NOT explicitly male
    for (const v of koVoices) {
      const name = (v.name || "").toLowerCase();
      const isMale = maleKeywords.some((kw) => name.includes(kw));
      if (!isMale) {
        console.log(`[Nova] Selected non-male Korean voice: ${v.name}`);
        return v;
      }
    }

    // 3rd priority: Fallback to first Korean voice (pitch shift will feminine it)
    console.log(`[Nova] Fallback to OS Korean voice: ${koVoices[0].name}`);
    return koVoices[0];
  }


  // Speech Output Helper (browser speechSynthesis — used only in free fallback mode;
  // Gemini Live streams its own native voice)
  async function speakResponse(text) {
    if (!text || !text.trim()) return;
    state.isSpeaking = true;
    startWaveAnimation();
    updateStatus("speaking", "Nova 답변 중...");

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ko-KR";

      const femaleVoice = getKoreanFemaleVoice();
      if (femaleVoice) {
        utter.voice = femaleVoice;
        const nameLower = (femaleVoice.name || "").toLowerCase();
        const isMale = ["injoon", "in-joon", "인준", "bongjin", "봉진", "sehyeon", "세현", "jinho", "진호", "male", "남성"].some((kw) => nameLower.includes(kw));
        if (isMale) {
          // Pitch-shift to feminine tone if OS only has male Korean voice
          utter.pitch = 1.36;
          utter.rate = 1.08;
        } else {
          utter.pitch = 1.22;
          utter.rate = 1.05;
        }
      } else {
        utter.pitch = 1.25;
        utter.rate = 1.05;
      }

      const finishSynth = () => {
        state.isSpeaking = false;
        stopWaveAnimation();
        updateStatus("idle", "대기 중");
      };
      utter.onend = finishSynth;
      utter.onerror = finishSynth;
      window.speechSynthesis.speak(utter);
    } else {
      state.isSpeaking = false;
      stopWaveAnimation();
      updateStatus("idle", "대기 중");
    }
  }

  // Permission & Error Guide Helper (Graceful in-modal banner, no blocking alert)
  function showPermissionGuide(err) {
    const guide = document.getElementById("novaPermGuide");
    const titleEl = document.getElementById("novaGuideTitle");
    let errorTitle = "마이크 사용 권한이 필요합니다";
    let userMsg = "브라우저에서 마이크 접근이 차단되어 있습니다. 상단 주소창 왼쪽의 설정 아이콘을 눌러 허용해 주세요.";

    if (err && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
      errorTitle = "마이크 사용 권한이 차단되어 있습니다";
      userMsg = "브라우저 보안 설정으로 인해 마이크가 차단되었습니다. 상단 주소창 왼쪽의 설정(🔒/🎚️) 아이콘을 클릭하여 '마이크'를 '허용'으로 변경해 주세요.";
    } else if (err && (err.name === "NotFoundError" || err.name === "DevicesNotFoundError")) {
      errorTitle = "마이크 장치를 찾을 수 없습니다";
      userMsg = "PC에 연결된 마이크 장치가 없습니다. 마이크 연결 또는 Windows 사운드 설정을 확인해 주세요.";
    } else if (err && (err.name === "NotReadableError" || err.name === "TrackStartError")) {
      errorTitle = "마이크가 다른 앱에서 사용 중입니다";
      userMsg = "다른 프로그램(Zoom, 녹음기 등)이 마이크를 독점 사용 중입니다. 다른 앱을 종료 후 다시 시도해 주세요.";
    } else if (err && err.name === "NotSupportedError") {
      errorTitle = "마이크 기능을 지원하지 않는 환경입니다";
      userMsg = "Chrome 또는 Edge 최신 브라우저를 이용하시거나, 아래 직접 텍스트 입력창을 이용해 주세요.";
    }

    if (titleEl) titleEl.textContent = `🎙️ ${errorTitle}`;
    if (guide) guide.style.display = "block";

    updateTranscript("⚠️ " + errorTitle);
    updateResponse(userMsg);
  }

  // Voice Recognition Controls
  async function startListening() {
    if (state.isListening || state.isProcessing || state.liveMode) return;

    // Reset previous permission guide
    const guide = document.getElementById("novaPermGuide");
    if (guide) guide.style.display = "none";
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    if (window.NovaLive) {
      try {
        await startLive();
        return;
      } catch (err) {
        console.warn("[Nova] Gemini Live unavailable, using browser mode:", err);
        state.liveMode = false;
        state.isListening = false;
        stopWaveAnimation();
        if (err && /NotAllowed|PermissionDenied|NotFound|DevicesNotFound|NotReadable|TrackStart/.test(err.name || "")) {
          updateStatus("idle", "대기 중");
          showPermissionGuide(err);
          return;
        }
      }
    }
    setModeBadge("브라우저 무료 모드");
    startBrowserRecognition();
  }

  // Free Browser SpeechRecognition Fallback
  function startBrowserRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      showPermissionGuide({ name: "NotSupportedError" });
      return;
    }

    state.speechRecognition = new SpeechRec();
    state.speechRecognition.lang = "ko-KR";
    state.speechRecognition.continuous = false;
    state.speechRecognition.interimResults = false;

    state.speechRecognition.onstart = () => {
      state.isListening = true;
      updateStatus("listening", "말씀하세요... (무료 모드)");
      updateTranscript("🎙️ 말씀하세요... (예: '1m 상자 떨어뜨려 줘')");
      startWaveAnimation();
    };

    state.speechRecognition.onresult = async (e) => {
      const text = e.results[0][0].transcript;
      updateTranscript(text);
      stopWaveAnimation();
      updateStatus("processing", "명령 분석 및 화면 제어 중...");

      const reply = parseLocalIntent(text);
      updateResponse(reply);
      await speakResponse(reply);
    };

    state.speechRecognition.onerror = (e) => {
      console.warn("[Nova] SpeechRecognition error:", e);
      stopWaveAnimation();
      state.isListening = false;
      updateStatus("idle", "대기 중");
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        showPermissionGuide({ name: "NotAllowedError" });
      }
    };

    state.speechRecognition.onend = () => {
      stopWaveAnimation();
      state.isListening = false;
      if (!state.isSpeaking && !state.isProcessing) {
        updateStatus("idle", "대기 중");
      }
    };

    try {
      state.speechRecognition.start();
    } catch (e) {
      console.warn("[Nova] SpeechRec start err:", e);
      showPermissionGuide(e);
    }
  }

  function stopListening() {
    if (state.liveMode && window.NovaLive) {
      window.NovaLive.stop("user");
      return;
    }
    if (!state.isListening) return;
    state.isListening = false;
    stopWaveAnimation();
    if (state.speechRecognition) {
      try {
        state.speechRecognition.stop();
      } catch (e) {}
    }
  }

  // UI Construction & DOM Elements
  function createVoiceAssistantUI() {
    // Inject Styles
    const style = document.createElement("style");
    style.id = "nova-voice-styles";
    style.textContent = `
      #voiceAssistantFab {
        position: fixed;
        bottom: 28px;
        right: 28px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
        box-shadow: 0 4px 25px rgba(56, 189, 248, 0.6), 0 0 20px rgba(56, 189, 248, 0.4);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 99999;
        border: 2px solid rgba(255, 255, 255, 0.4);
        transition: transform 0.25s ease, box-shadow 0.25s ease;
      }
      #voiceAssistantFab:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 32px rgba(56, 189, 248, 0.8), 0 0 25px rgba(56, 189, 248, 0.5);
      }
      #voiceAssistantFab .pulse-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid #38bdf8;
        animation: novaPulse 2s infinite cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
      }
      @keyframes novaPulse {
        0% { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(1.6); opacity: 0; }
      }
      #voiceAssistantModal {
        position: fixed;
        bottom: 96px;
        right: 28px;
        width: 390px;
        max-width: calc(100vw - 32px);
        max-height: calc(100vh - 120px);
        background: rgba(10, 15, 26, 0.96);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(56, 189, 248, 0.35);
        border-radius: 20px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(56, 189, 248, 0.2);
        z-index: 100000;
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: novaSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes novaSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .nova-head {
        padding: 14px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(255, 255, 255, 0.03);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .nova-title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .nova-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #38bdf8;
        box-shadow: 0 0 8px #38bdf8;
      }
      .nova-status-dot.listening {
        background: #22c55e;
        box-shadow: 0 0 10px #22c55e;
        animation: blinkDot 0.8s infinite alternate;
      }
      .nova-status-dot.processing {
        background: #a855f7;
        box-shadow: 0 0 10px #a855f7;
      }
      .nova-status-dot.speaking {
        background: #f59e0b;
        box-shadow: 0 0 10px #f59e0b;
      }
      @keyframes blinkDot {
        from { opacity: 0.3; }
        to { opacity: 1; }
      }
      .nova-title {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 1px;
        color: #ffffff;
      }
      .nova-badge-mode {
        font-size: 10px;
        padding: 2px 7px;
        border-radius: 12px;
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.3);
        font-weight: 700;
      }
      .nova-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .nova-btn-icon {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        padding: 4px;
        font-size: 14px;
        border-radius: 6px;
        transition: color 0.2s, background 0.2s;
      }
      .nova-btn-icon:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.1);
      }
      .nova-body {
        padding: 14px 16px 16px 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
        max-height: calc(100vh - 180px);
      }
      .nova-body::-webkit-scrollbar {
        width: 4px;
      }
      .nova-body::-webkit-scrollbar-track {
        background: transparent;
      }
      .nova-body::-webkit-scrollbar-thumb {
        background: rgba(56, 189, 248, 0.3);
        border-radius: 4px;
      }
      .nova-status-text {
        font-size: 11px;
        color: #94a3b8;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      .nova-visualizer {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        height: 28px;
      }
      .nova-wave-bar {
        width: 3px;
        height: 6px;
        background: #38bdf8;
        border-radius: 3px;
        transition: height 0.15s ease;
      }
      .nova-visualizer.active .nova-wave-bar:nth-child(1) { animation: wave 0.8s infinite 0.1s; }
      .nova-visualizer.active .nova-wave-bar:nth-child(2) { animation: wave 0.8s infinite 0.25s; }
      .nova-visualizer.active .nova-wave-bar:nth-child(3) { animation: wave 0.8s infinite 0.4s; }
      .nova-visualizer.active .nova-wave-bar:nth-child(4) { animation: wave 0.8s infinite 0.25s; }
      .nova-visualizer.active .nova-wave-bar:nth-child(5) { animation: wave 0.8s infinite 0.1s; }
      @keyframes wave {
        0%, 100% { height: 6px; }
        50% { height: 26px; }
      }
      .nova-chat-box {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 160px;
        overflow-y: auto;
      }
      .nova-bubble-user {
        font-size: 12px;
        line-height: 1.4;
        color: #cbd5e1;
        background: rgba(255, 255, 255, 0.05);
        padding: 8px 12px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .nova-bubble-ai {
        font-size: 12px;
        line-height: 1.45;
        color: #ffffff;
        background: rgba(56, 189, 248, 0.12);
        padding: 8px 12px;
        border-radius: 12px;
        border: 1px solid rgba(56, 189, 248, 0.3);
      }
      .nova-action-badge {
        font-size: 11px;
        font-weight: 700;
        color: #38bdf8;
        background: rgba(56, 189, 248, 0.15);
        border: 1px dashed #38bdf8;
        padding: 6px 10px;
        border-radius: 8px;
        display: none;
        align-items: center;
        gap: 6px;
      }
      .nova-btn-talk {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 11px 16px;
        border-radius: 12px;
        background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(56, 189, 248, 0.35);
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .nova-btn-talk:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 22px rgba(56, 189, 248, 0.55);
      }
      .nova-btn-talk.recording {
        background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
        box-shadow: 0 4px 16px rgba(239, 68, 68, 0.45);
        animation: pulseRed 1.2s infinite alternate;
      }
      @keyframes pulseRed {
        from { transform: scale(1); }
        to { transform: scale(1.02); }
      }
      .nova-quick-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding-top: 4px;
      }
      .nova-chip {
        font-size: 10px;
        color: #94a3b8;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .nova-chip:hover {
        color: #ffffff;
        background: rgba(56, 189, 248, 0.2);
        border-color: #38bdf8;
      }
      .nova-settings-drawer {
        display: none;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .nova-settings-drawer input {
        width: 100%;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 11px;
        color: #ffffff;
        outline: none;
      }
      .nova-settings-drawer input:focus {
        border-color: #38bdf8;
      }
      .nova-settings-btn-row {
        display: flex;
        gap: 6px;
      }
      .nova-btn-sub {
        flex: 1;
        padding: 5px 8px;
        font-size: 11px;
        font-weight: 600;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
        cursor: pointer;
      }
      .nova-btn-sub:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      .nova-btn-sub.primary {
        background: #0284c7;
        border-color: #38bdf8;
      }
      .nova-text-form {
        display: flex;
        gap: 6px;
        margin: 2px 0 4px 0;
      }
      .nova-text-input {
        flex: 1;
        min-width: 0;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 8px;
        padding: 7px 10px;
        font-size: 11px;
        color: #ffffff;
        outline: none;
        transition: border-color 0.2s, background 0.2s;
      }
      .nova-text-input:focus {
        border-color: #38bdf8;
        background: rgba(255, 255, 255, 0.12);
      }
      .nova-btn-send {
        padding: 0 12px;
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        border: 1px solid rgba(56, 189, 248, 0.5);
        border-radius: 8px;
        color: #ffffff;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: opacity 0.2s;
      }
      .nova-btn-send:hover {
        opacity: 0.9;
      }
      .nova-perm-guide {
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(239, 68, 68, 0.35);
        border-radius: 10px;
        padding: 10px 12px;
        margin: 4px 0;
        font-size: 11px;
        line-height: 1.5;
      }
      .nova-perm-guide ol {
        margin: 4px 0 6px 0;
        padding-left: 16px;
        font-size: 10.5px;
        color: #f1f5f9;
      }
      .nova-perm-guide li {
        margin-bottom: 2px;
      }

      /* Category Tabs (대분류) */
      .nova-cat-tabs {
        display: flex;
        gap: 4px;
        background: rgba(255, 255, 255, 0.04);
        padding: 4px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .nova-cat-tab {
        flex: 1;
        padding: 6px 3px;
        font-size: 10.5px;
        font-weight: 700;
        color: #94a3b8;
        background: transparent;
        border: none;
        border-radius: 7px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
        white-space: nowrap;
      }
      .nova-cat-tab:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.06);
      }
      .nova-cat-tab.active {
        color: #ffffff;
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
      }

      /* Category Panes */
      .nova-cat-pane {
        display: none;
        flex-direction: column;
        gap: 7px;
        animation: novaFadeIn 0.2s ease;
      }
      .nova-cat-pane.active {
        display: flex;
      }
      @keyframes novaFadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Group Title (중분류) */
      .nova-group-title {
        font-size: 10px;
        font-weight: 700;
        color: #38bdf8;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
      }

      /* Action Chips (소분류) */
      .nova-chip-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .nova-chip-btn {
        font-size: 10px;
        font-weight: 600;
        color: #e2e8f0;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 5px 8px;
        border-radius: 7px;
        cursor: pointer;
        transition: all 0.18s ease;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .nova-chip-btn:hover {
        color: #ffffff;
        background: rgba(56, 189, 248, 0.25);
        border-color: #38bdf8;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(56, 189, 248, 0.25);
      }
      .nova-chip-btn:active {
        transform: translateY(0);
      }
      .nova-chip-btn.highlight {
        color: #38bdf8;
        background: rgba(56, 189, 248, 0.12);
        border-color: rgba(56, 189, 248, 0.4);
      }
    `;
    document.head.appendChild(style);

    // Floating FAB Button
    const fab = document.createElement("div");
    fab.id = "voiceAssistantFab";
    fab.title = "AI 음성 제어 어시스턴트 (Nova)";
    fab.innerHTML = `
      <div class="pulse-ring"></div>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="22"></line>
      </svg>
    `;
    document.body.appendChild(fab);

    // Modal HUD
    const modal = document.createElement("div");
    modal.id = "voiceAssistantModal";
    modal.innerHTML = `
      <div class="nova-head">
        <div class="nova-title-wrap">
          <div class="nova-status-dot" id="novaStatusDot"></div>
          <span class="nova-title">NOVA SPATIAL AI</span>
          <span class="nova-badge-mode" id="novaModeBadge">${window.NovaLive ? "Gemini Live" : "브라우저 무료 모드"}</span>
        </div>
        <div class="nova-actions">
          <button class="nova-btn-icon" id="novaBtnClose" title="닫기">✕</button>
        </div>
      </div>
      <div class="nova-body">
        <div class="d-flex justify-content-between align-items-center">
          <span class="nova-status-text" id="novaStatusText">대기 중</span>
          <div class="nova-visualizer" id="novaVisualizer">
            <span class="nova-wave-bar"></span>
            <span class="nova-wave-bar"></span>
            <span class="nova-wave-bar"></span>
            <span class="nova-wave-bar"></span>
            <span class="nova-wave-bar"></span>
          </div>
        </div>


        <div class="nova-chat-box">
          <div class="nova-bubble-user" id="novaUserBubble">
            🗣️ "상자 떨어뜨려 줘", "와이어프레임 켜줘" 등 음성으로 명령해 보세요.
          </div>
          <div class="nova-bubble-ai" id="novaAiBubble">
            ✨ 안녕하세요! 무엇을 도와드릴까요?
          </div>
        </div>

        <div class="nova-action-badge" id="novaActionBadge">
          <span>⚡</span>
          <span id="novaActionText"></span>
        </div>

        <button class="nova-btn-talk" id="novaBtnTalk">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="22"></line>
          </svg>
          <span id="novaBtnTalkText">마이크를 탭하고 말씀하세요</span>
        </button>

        <form class="nova-text-form" id="novaTextForm">
          <input type="text" class="nova-text-input" id="novaTextInput" placeholder="직접 명령어 입력 (예: 상자 떨어뜨려 줘)" autocomplete="off">
          <button type="submit" class="nova-btn-send" id="novaBtnSendText">전송</button>
        </form>

        <div class="nova-perm-guide" id="novaPermGuide" style="display: none;">
          <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 700; color: #fca5a5; margin-bottom: 4px;">
            <span id="novaGuideTitle">🎙️ 마이크 권한 허용 3단계</span>
            <button id="novaBtnCloseGuide" type="button" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 13px; padding: 0 4px;">✕</button>
          </div>
          <ol>
            <li>브라우저 맨 위 <strong>주소창 왼쪽의 설정 아이콘(🎚️ 또는 🔒)</strong>을 클릭합니다.</li>
            <li><strong>'마이크'</strong> 설정을 <strong>'허용(Allow)'</strong>으로 켭니다.</li>
            <li>키보드의 <strong>F5(새로고침)</strong>를 누르면 마이크가 즉시 연결됩니다!</li>
          </ol>
          <div style="margin-top: 4px; font-size: 10px; color: #38bdf8;">
            💡 마이크 없이도 바로 위 <strong>텍스트 입력창</strong>이나 아래 <strong>버튼</strong>을 누르시면 Nova의 부드러운 여성 목소리로 모든 기능을 이용하실 수 있습니다.
          </div>
        </div>

        <!-- Category Navigation Tabs (대분류) -->
        <div class="nova-cat-tabs" id="novaCatTabs">
          <button type="button" class="nova-cat-tab active" data-target="panePhysics">🎮 3D 물리/시각화</button>
          <button type="button" class="nova-cat-tab" data-target="paneLab">🌐 AI 공간 생성</button>
          <button type="button" class="nova-cat-tab" data-target="paneNav">🏢 사이트 탐색</button>
          <button type="button" class="nova-cat-tab" data-target="paneFaq">❓ FAQ/음성</button>
        </div>

        <!-- [대분류 1] 3D 물리 & 시각화 -->
        <div class="nova-cat-pane active" id="panePhysics">
          <div class="nova-group-title">📦 스마트 창고 물리 엔진 (Warehouse Physics)</div>
          <div class="nova-chip-grid">
            <button type="button" class="nova-chip-btn" data-action="trigger_physics" data-param='{"action":"drop"}' data-label="1m 상자 낙하 시뮬레이션">💥 1m 상자 낙하</button>
            <button type="button" class="nova-chip-btn" data-action="trigger_physics" data-param='{"action":"toss"}' data-label="2.5m 투척 시뮬레이션">🚀 2.5m 투척</button>
            <button type="button" class="nova-chip-btn" data-action="trigger_physics" data-param='{"action":"reset"}' data-label="물리 시뮬레이션 리셋">🔄 물리 리셋</button>
          </div>

          <div class="nova-group-title">🔬 3D 정밀 공간 시각화 (Spatial Vision)</div>
          <div class="nova-chip-grid">
            <button type="button" class="nova-chip-btn" data-action="toggle_wireframe" data-param='{}' data-label="와이어프레임 렌더링 토글">🕸️ 와이어프레임</button>
            <button type="button" class="nova-chip-btn" data-action="toggle_partition" data-param='{}' data-label="7부품 공간 분할 OBB 보여줘">📐 7부품 OBB 분할</button>
            <button type="button" class="nova-chip-btn" data-action="run_picking_benchmark" data-param='{}' data-label="60점 레이캐스팅 정확도 평가">🎯 60점 피킹 벤치마크</button>
            <button type="button" class="nova-chip-btn" data-action="toggle_fullscreen" data-param='{}' data-label="전체화면 전환">🖥️ 3D 전체화면</button>
          </div>

          <div class="nova-group-title">🏎️ 특수 시뮬레이터 (Simulator)</div>
          <div class="nova-chip-grid">
            <button type="button" class="nova-chip-btn highlight" data-action="open_car_physics" data-param='{}' data-label="자동차 물리 시뮬레이터 열어줘">🏎️ 자동차 3D 물리 ↗</button>
          </div>
        </div>

        <!-- [대분류 2] AI 공간 생성 & 연구 -->
        <div class="nova-cat-pane" id="paneLab">
          <div class="nova-group-title">✨ 3D 월드 자동 생성 (World Generator)</div>
          <div class="nova-chip-grid">
            <button type="button" class="nova-chip-btn" data-action="generate_3d_world" data-param='{"prompt":"반도체 클린룸 로봇 연구실"}' data-label="반도체 클린룸 생성">🔬 반도체 클린룸</button>
            <button type="button" class="nova-chip-btn" data-action="generate_3d_world" data-param='{"prompt":"사이버펑크 산업용 격납고"}' data-label="사이버펑크 격납고 생성">🤖 사이버펑크 격납고</button>
            <button type="button" class="nova-chip-btn" data-action="generate_3d_world" data-param='{"prompt":"스마트 자동화 물류센터"}' data-label="스마트 물류창고 생성">📦 스마트 풀필먼트</button>
            <button type="button" class="nova-chip-btn" data-action="generate_3d_world" data-param='{"prompt":"초저온 백신 콜드체인 창고"}' data-label="콜드체인 냉동창고 생성">❄️ 초저온 콜드체인</button>
          </div>

          <div class="nova-group-title">📄 물리 AI & 강화학습 연구 (Research Papers)</div>
          <div class="nova-chip-grid">
            <button type="button" class="nova-chip-btn highlight" data-action="open_lingbot_world" data-param='{}' data-label="링봇 월드 2.0 시뮬레이터 열어줘" style="border-color: #ff6f00 !important; color: #ffb74d !important;">🎮 LingBot-World 2.0 ↗</button>
            <button type="button" class="nova-chip-btn highlight" data-action="open_research_article" data-param='{}' data-label="강화학습 칼럼 아티클 열어줘">📚 AI시티빌더스 칼럼 ↗</button>
            <button type="button" class="nova-chip-btn" data-action="navigate_section" data-param='{"section":"whitepapers"}' data-label="화이트페이퍼 섹션 보여줘">📑 리서치 페이퍼</button>
          </div>
        </div>

        <!-- [대분류 3] 사이트 탐색 & 엔터프라이즈 -->
        <div class="nova-cat-pane" id="paneNav">
          <div class="nova-group-title">🚀 주요 섹션 바로가기 (Quick Jump)</div>
          <div class="nova-chip-grid">
            <button type="button" class="nova-chip-btn" data-action="navigate_section" data-param='{"section":"hero"}' data-label="홈 맨 위로 이동">🏠 홈 (맨 위로)</button>
            <button type="button" class="nova-chip-btn" data-action="navigate_section" data-param='{"section":"spatialLab"}' data-label="3D 스마트 창고 섹션으로 가줘">🏭 3D 스마트 창고</button>
            <button type="button" class="nova-chip-btn" data-action="navigate_section" data-param='{"section":"works"}' data-label="포트폴리오 쇼케이스 보여줘">💼 작품 쇼케이스</button>
            <button type="button" class="nova-chip-btn" data-action="navigate_section" data-param='{"section":"services"}' data-label="서비스 안내로 가줘">🛠️ 기술 솔루션</button>
            <button type="button" class="nova-chip-btn highlight" data-action="navigate_section" data-param='{"section":"pricing"}' data-label="요금 정책 및 원화 가격 확인">💰 요금 정책 (KRW)</button>
            <button type="button" class="nova-chip-btn" data-action="navigate_section" data-param='{"section":"about"}' data-label="회사 소개 보여줘">🏢 회사 소개</button>
            <button type="button" class="nova-chip-btn" data-action="navigate_section" data-param='{"section":"awards"}' data-label="표준 인증 내역 보여줘">🏆 표준 인증 6종</button>
            <button type="button" class="nova-chip-btn" data-action="navigate_section" data-param='{"section":"contact"}' data-label="문의하기 섹션으로 가줘">✉️ 프로젝트 문의</button>
            <button type="button" class="nova-chip-btn" data-action="navigate_section" data-param='{"section":"footer"}' data-label="푸터 사이트맵으로 이동">🗺️ 푸터 사이트맵</button>
          </div>
        </div>

        <!-- [대분류 4] FAQ & 보이스 제어 -->
        <div class="nova-cat-pane" id="paneFaq">
          <div class="nova-group-title">❓ 자주 묻는 질문 즉시 펼치기 (FAQ Accordions)</div>
          <div class="nova-chip-grid">
            <button type="button" class="nova-chip-btn" data-action="control_faq" data-param='{"item":1}' data-label="3DGS 가우시안 스플래팅 질문 펼쳐줘">💡 01. 3DGS vs 메시</button>
            <button type="button" class="nova-chip-btn" data-action="control_faq" data-param='{"item":2}' data-label="100Hz Wasm 물리 엔진 질문 펼쳐줘">⚙️ 02. 100Hz 물리</button>
            <button type="button" class="nova-chip-btn" data-action="control_faq" data-param='{"item":3}' data-label="ROS2 로봇 연동 질문 펼쳐줘">🤖 03. ROS2 로봇 연동</button>
            <button type="button" class="nova-chip-btn" data-action="control_faq" data-param='{"item":4}' data-label="공간 센서 포맷 지원 질문 펼쳐줘">📡 04. 3D 센서 정합</button>
            <button type="button" class="nova-chip-btn" data-action="control_faq" data-param='{"item":5}' data-label="60점 피킹 정확도 질문 펼쳐줘">🎯 05. 레이캐스팅 피킹</button>
            <button type="button" class="nova-chip-btn" data-action="control_faq" data-param='{"item":6}' data-label="물리 AI 강화학습 질문 펼쳐줘">🧠 06. 물리 AI 강화학습</button>
          </div>

          <div class="nova-group-title">🔊 음성 & 화면 컨트롤 (Voice & Controls)</div>
          <div class="nova-chip-grid">
            <button type="button" class="nova-chip-btn highlight" id="novaBtnVoiceTest">🔊 여성 목소리 테스트</button>
            <button type="button" class="nova-chip-btn" id="novaBtnToggleGuide">🔒 마이크 권한 안내</button>
            <button type="button" class="nova-chip-btn" data-action="scroll_page" data-param='{"direction":"up"}' data-label="화면 위로 스크롤">⬆️ 화면 위로</button>
            <button type="button" class="nova-chip-btn" data-action="scroll_page" data-param='{"direction":"down"}' data-label="화면 아래로 스크롤">⬇️ 화면 아래로</button>
            <button type="button" class="nova-chip-btn" data-action="close_assistant" data-param='{}' data-label="어시스턴트 창 닫아줘">✕ 창 닫기</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Event Bindings
    fab.addEventListener("click", () => {
      const isHidden = modal.style.display === "none" || modal.style.display === "";
      if (isHidden) {
        modal.style.display = "flex";
        startListening();
      } else {
        modal.style.display = "none";
        stopListening();
      }
    });

    const promptMic = document.getElementById("btnPromptMic");
    if (promptMic) {
      promptMic.addEventListener("click", () => {
        modal.style.display = "flex";
        startListening();
      });
    }

    document.getElementById("novaBtnClose").addEventListener("click", () => {
      modal.style.display = "none";
      stopListening();
    });


    // Talk Button Toggle
    const btnTalk = document.getElementById("novaBtnTalk");
    btnTalk.addEventListener("click", () => {
      if (state.isListening || state.liveMode) {
        stopListening();
      } else {
        startListening();
      }
    });

    // Category Tabs Switching (대분류 탭 전환)
    document.querySelectorAll(".nova-cat-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".nova-cat-tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".nova-cat-pane").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        const targetId = tab.dataset.target;
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add("active");
      });
    });

    // Chip Button Actions (소분류 버튼 클릭 -> 즉시 화면 이동 & 기능 실행 & Nova 음성 안내)
    document.querySelectorAll(".nova-chip-btn[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const action = btn.dataset.action;
        let param = {};
        try {
          param = JSON.parse(btn.dataset.param || "{}");
        } catch (e) {}
        const label = btn.dataset.label || btn.textContent.trim();

        updateTranscript(label);
        updateStatus("processing", "명령 실행 및 화면 이동 중...");

        const desc = executeAction(action, param);
        if (action !== "close_assistant" && window.NovaLive && window.NovaLive.isActive) {
          window.NovaLive.sendText(`(시스템 안내: 사용자가 버튼으로 '${label}'을(를) 실행했어요. 한 문장으로 짧게 안내해 주세요. 도구는 호출하지 마세요.)`);
          return;
        }
        const reply = `네! ${desc}를 완료하고 화면을 이동해 드렸어요.`;
        updateResponse(reply);
        await speakResponse(reply);
      });
    });

    // Voice Test Button
    document.getElementById("novaBtnVoiceTest")?.addEventListener("click", async () => {
      const greeting = "안녕하세요! World Labs Nova 음성 어시스턴트입니다. 카테고리별 버튼을 누르시면 해당 웹사이트 화면으로 즉시 이동하며 모든 기능이 실행됩니다.";
      updateResponse(greeting);
      await speakResponse(greeting);
    });

    // Toggle Guide Button
    document.getElementById("novaBtnToggleGuide")?.addEventListener("click", () => {
      const guide = document.getElementById("novaPermGuide");
      if (guide) {
        guide.style.display = guide.style.display === "none" || guide.style.display === "" ? "block" : "none";
      }
    });

    // Direct Text Command Form Submit
    const textForm = document.getElementById("novaTextForm");
    const textInput = document.getElementById("novaTextInput");
    if (textForm && textInput) {
      textForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const cmd = textInput.value.trim();
        if (!cmd) return;
        textInput.value = "";
        updateTranscript(cmd);
        updateStatus("processing", "명령 분석 및 화면 제어 중...");

        if (window.NovaLive && window.NovaLive.isActive) {
          window.NovaLive.sendText(cmd);
        } else {
          const reply = parseLocalIntent(cmd);
          updateResponse(reply);
          await speakResponse(reply);
        }
      });
    }

    document.getElementById("novaBtnCloseGuide")?.addEventListener("click", () => {
      const guide = document.getElementById("novaPermGuide");
      if (guide) guide.style.display = "none";
    });
  }

  // UI State Updaters
  function updateStatus(type, label) {
    const dot = document.getElementById("novaStatusDot");
    const text = document.getElementById("novaStatusText");
    const btnText = document.getElementById("novaBtnTalkText");
    const btn = document.getElementById("novaBtnTalk");

    if (dot) {
      dot.className = "nova-status-dot";
      if (type !== "idle") dot.classList.add(type);
    }
    if (text) text.textContent = label;

    if (btn && btnText) {
      if (state.liveMode && type !== "idle") {
        btn.classList.add("recording");
        btnText.textContent = "대화 중 · 탭하면 대화를 마쳐요";
      } else if (type === "listening") {
        btn.classList.add("recording");
        btnText.textContent = "말씀이 끝나면 탭하세요";
      } else {
        btn.classList.remove("recording");
        btnText.textContent = "마이크를 탭하고 말씀하세요";
      }
    }
  }

  function updateTranscript(text) {
    const el = document.getElementById("novaUserBubble");
    if (el) el.textContent = `🗣️ "${text}"`;
  }

  function updateResponse(text) {
    const el = document.getElementById("novaAiBubble");
    if (el) el.textContent = `✨ Nova: ${text}`;
  }

  function updateActionBadge(text) {
    const badge = document.getElementById("novaActionBadge");
    const textEl = document.getElementById("novaActionText");
    if (badge && textEl) {
      textEl.textContent = `[액션 완료] ${text}`;
      badge.style.display = "flex";
      setTimeout(() => {
        badge.style.display = "none";
      }, 5000);
    }
  }

  function startWaveAnimation() {
    const viz = document.getElementById("novaVisualizer");
    if (viz) viz.classList.add("active");
  }

  function stopWaveAnimation() {
    const viz = document.getElementById("novaVisualizer");
    if (viz) viz.classList.remove("active");
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createVoiceAssistantUI);
  } else {
    createVoiceAssistantUI();
  }

  // Expose global controller
  window.NovaVoiceAssistant = {
    startListening,
    stopListening,
    executeAction,
    state,
  };
})();
