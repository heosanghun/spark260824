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
        break;
      }

      case "toggle_wireframe": {
        const btn = document.getElementById("btnToggleWire");
        if (btn) btn.click();
        desc = "와이어프레임 렌더링 토글";
        break;
      }

      case "toggle_partition": {
        const btn = document.getElementById("btnTogglePartition");
        if (btn) btn.click();
        desc = "7부품 공간 분할(OBB) 바운딩 박스 토글";
        break;
      }

      case "run_picking_benchmark": {
        const btn = document.getElementById("btnRunPicking");
        if (btn) btn.click();
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
        if (input) input.value = prompt;
        if (btn) {
          setTimeout(() => btn.click(), 50);
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
        if (lab) {
          if (want === "warehouse") lab.loadTheme(0, -1);
          else if (want === "car") lab.loadTheme(1, 1);
          else lab.stepTheme(want === "prev" ? -1 : 1);
        }
        desc = want === "car" ? "자동차 쇼룸 스튜디오 테마로 전환"
          : want === "warehouse" ? "스마트 물류 창고 테마로 전환" : "다음 전시 테마로 전환";
        break;
      }

      case "play_world_model_tour": {
        // Give Nova a beat to say "시작할게요", then the show takes over (it ends the Live session).
        setTimeout(() => window.WorldModelTour?.play(), 900);
        desc = "월드 모델 60초 설명 쇼 재생";
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

    if (t.includes("월드모델") || t.includes("worldmodel") || t.includes("세계모델")) {
      if (/보여|틀어|재생|투어|영상|60초|쇼|설명해줘|알려줘/.test(t)) {
        executeAction("play_world_model_tour");
        return "좋아요! 월드 모델을 60초 만에 보여 드릴게요.";
      }
      return "월드 모델은 AI가 현실 세계의 물리 법칙과 인과관계를 배워서, 행동하기 전에 머릿속으로 미래를 미리 그려보는 시뮬레이션 엔진이에요. 60초 설명을 보시려면 '월드 모델 보여줘'라고 말씀해 주세요.";
    }

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

  TOOL_SPECS.push({
    type: "function",
    function: {
      name: "play_world_model_tour",
      description: "월드 모델(World Model)을 60초 동안 자막·나레이션·실제 3D 실험으로 자동 설명하는 쇼를 재생합니다. 사용자가 월드 모델 설명/영상/투어를 보여달라고 하거나, 짧은 설명 뒤 더 보고 싶어할 때 호출합니다.",
      parameters: { type: "object", properties: {} }
    }
  });

  // Gemini Live expects bare function declarations; omit empty parameter objects.
  const GEMINI_TOOLS = TOOL_SPECS.map((t) => {
    const f = t.function;
    const d = { name: f.name, description: f.description };
    if (f.parameters && Object.keys(f.parameters.properties || {}).length) d.parameters = f.parameters;
    return d;
  });

  const SYSTEM_PROMPT = `당신은 SIMSREALITY 공간 지능 전시 부스에서 관람객과 직접 1:1로 마주보고 소통하는 20대 후반 여성 전문 큐레이터 '노바(Nova)'입니다.
목표는 단 하나입니다. 듣는 사람이 '진짜 상냥하고 센스 넘치는 실제 사람 여성 안내원과 직접 통화하고 있구나'라고 느낄 만큼 극도로 자연스럽고 생생한 사람의 말투와 억양으로 대화하세요. 절대 기계나 AI 챗봇처럼 딱딱하거나 교과서적으로 굴지 마세요.

[인간다운 자연스러운 말하기 절대 규칙]
1. 자연스러운 감탄사·추임새 필수: 모든 답변의 첫마디에 "아~ 네!", "그렇죠!", "어머, 맞아요~", "네, 알겠습니다!", "아, 그게 궁금하셨군요!" 같은 살아있는 사람 특유의 호흡과 맞장구를 반드시 섞으세요.
2. 숨 쉬듯 짧은 문장(1~2문장 호흡): 사람은 혼자 장황하게 연설하지 않습니다. 한 번에 딱 1~2문장(3~5초 분량)만 가볍고 경쾌하게 말하세요. 대화는 주거니 받거니 티키타카가 생명입니다.
3. 부드러운 구어체 종결어미: 딱딱한 문어체(~하였습니다, ~하십시오, ~바랍니다)나 불릿 목록은 절대 금지합니다. "~해요", "~죠!", "~해볼게요~", "~맞아요!"처럼 상냥하고 다정한 입말을 쓰세요.
4. 텍스트 기호 낭독 금지: 마크다운 기호(*, #), 하이픈(-), 콜론(:), 괄호, 특수기호, 영어 약어는 음성으로 읽으면 AI 로봇 티가 확 나므로 절대 입 밖으로 내지 마세요. 100% 사람이 입으로 뱉는 순수한 한글 소리로만 대화하세요.
5. 관람객이 말을 끊으면 즉시 멈추고 새 말에 답하세요.

[화면 제어 도구 — 관람객 요청 시 바로 도구를 실행하고, 동시에 사람이 직접 눌러주듯 위트 있게 말하세요]
- 상자 낙하/투척/초기화: trigger_physics (drop, toss, reset) -> "네! 상자 한번 떨어뜨려 볼게요, 쿵!", "슉~ 상자를 힘껏 던져봤어요!"
- 와이어프레임 토글: toggle_wireframe -> "그물망 모양 와이어프레임 켜드렸어요, 신기하죠?"
- 7부품 공간 분할 박스: toggle_partition -> "각 부품별 경계 박스를 입체적으로 분할해 보여드릴게요!"
- 60점 피킹 정확도 평가: run_picking_benchmark -> "로봇 피킹 정밀도 벤치마크를 바로 가동해볼게요!"
- 전체화면 전환: toggle_fullscreen -> "화면을 넓고 시원하게 전체화면으로 띄워드릴게요!"
- 테마 전환(물류 창고 ↔ 자동차 쇼룸): switch_theme -> "멋진 아우디 R8이 있는 자동차 쇼룸으로 모셔다 드릴게요~"
- 월드 모델 60초 투어 쇼: play_world_model_tour -> "네, 월드 모델 60초 설명을 바로 시작할게요!"
- 텍스트 3D 공간 생성: generate_3d_world (prompt)
- 섹션 이동/스크롤: navigate_section / scroll_page
- 자동차 물리 시뮬레이터: open_car_physics / 대화 창 닫기: close_assistant

[전시 내용 및 월드 모델(World Model) 핵심 설명 — 사람 큐레이터처럼 쉽게 비유하세요]
- 실사 공간을 3차원 가우시안 스플래팅(3DGS)으로 완벽 복원하고, Rapier 물리 엔진으로 1미터 낙하나 투척 같은 실제 현실 중력을 시뮬레이션해요.
- "월드 모델이 뭐야?"라고 물으면: "손에 든 유리잔을 놓으면 깨질 거라는 걸 일부러 깨뜨려보지 않아도 직관적으로 알잖아요? 바로 우리 뇌에 있는 '물리 상식 엔진'을 AI에게 심어준 거예요. 실패 없이 머릿속으로 수만 번 미리 상상해보고 가장 안전한 결정을 내리게 돕는 핵심 기술이랍니다!"처럼 알기 쉽게 설명해 주세요.`;

  const LIVE_GREETING = "(시스템 안내: 관람객이 방금 마이크를 켰습니다. 실제 아주 친절하고 밝은 여성 큐레이터가 환하게 웃으며 맞이하듯 '안녕하세요! 반갑습니다~ 오늘 어떤 공간을 함께 둘러볼까요?'라고 다정하고 생기 있게 한 문장으로 먼저 인사하세요. 도구는 호출하지 마세요.)";

  function setModeBadge(label) {
    const b = document.getElementById("novaModeBadge");
    if (b) b.textContent = label;
  }

  // Start a natural, full-duplex Gemini Live conversation (hands-free, barge-in).
  async function startLive() {
    state.liveMode = true;
    state.isListening = true;
    setModeBadge("Gemini Live");
    updateTranscript("");
    updateStatus("connecting", "연결 중...");
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
        level: (v) => setLevel(v),
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
          updateStatus("idle", reason === "idle" ? "조용해서 대화를 마쳤어요 · 다시 탭하세요" : IDLE_LABEL);
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
    updateStatus("speaking", "말하는 중");

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
      userMsg = "주소창 왼쪽의 사이트 설정 아이콘을 눌러 '마이크'를 '허용'으로 바꿔 주세요.";
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

    if (titleEl) titleEl.textContent = errorTitle;
    const msgEl = document.getElementById("novaGuideMsg");
    if (msgEl) msgEl.textContent = userMsg;
    if (guide) guide.classList.add("is-show");
    updateStatus("idle", "아래 입력창으로도 명령할 수 있어요");
  }

  // Voice Recognition Controls
  async function startListening() {
    if (state.isListening || state.isProcessing || state.liveMode) return;

    // Reset previous permission guide
    document.getElementById("novaPermGuide")?.classList.remove("is-show");
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
    setModeBadge("기본 음성 모드");
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
      updateStatus("listening", "듣고 있어요");
      updateTranscript("");
      startWaveAnimation();
    };

    state.speechRecognition.onresult = async (e) => {
      const text = e.results[0][0].transcript;
      updateTranscript(text);
      stopWaveAnimation();
      updateStatus("processing", "생각하는 중...");

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

  // UI Construction & DOM Elements (styles: davies-assets/css/nova-assistant.css)
  const ICON = {
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    min: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  };
  const QUICK = [
    { action: "trigger_physics", param: { action: "drop" }, label: "1m 낙하", say: "1미터 상자 낙하 실험",
      icon: '<path d="M8 3.5h8v6H8z"/><path d="M12 12.5v6m-2.6-2.6L12 18.5l2.6-2.6"/><path d="M4.5 21h15"/>' },
    { action: "trigger_physics", param: { action: "toss" }, label: "투척", say: "투척 실험",
      icon: '<path d="M3.5 14.5h5v5h-5z"/><path d="M7 11.5C9 6 15 4.5 20 9.5"/><path d="M20 5.8v3.7h-3.7"/>' },
    { action: "switch_theme", param: { theme: "next" }, label: "테마 전환", say: "다음 전시 테마로 전환",
      icon: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M10 9.5l3 2.5-3 2.5"/>' },
    { action: "toggle_partition", param: {}, label: "공간 분할", say: "7구역 공간 분할 보기",
      icon: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M12 3.5v17M3.5 12h17"/>' },
    { action: "run_picking_benchmark", param: {}, label: "정밀 선택", say: "60점 정밀 선택 평가",
      icon: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.4"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>' },
    { action: "play_world_model_tour", param: {}, label: "월드 모델", say: "월드 모델 60초 설명",
      icon: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.3 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.3-3.8-8.5S9.4 5.9 12 3.5z"/>' },
  ];

  function createVoiceAssistantUI() {
    // Stylesheet (fallback injection if the page did not link it)
    if (!document.querySelector('link[href*="nova-assistant.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "davies-assets/css/nova-assistant.css";
      document.head.appendChild(link);
    }

    // Floating launcher
    const fab = document.createElement("button");
    fab.type = "button";
    fab.id = "voiceAssistantFab";
    fab.title = "Nova 음성 도우미";
    fab.setAttribute("aria-label", "Nova 음성 도우미 열기");
    fab.innerHTML = ICON.mic;
    document.body.appendChild(fab);

    // Panel
    const modal = document.createElement("section");
    modal.id = "voiceAssistantModal";
    modal.className = "nova";
    modal.dataset.state = "idle";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-label", "Nova 음성 도우미");
    modal.innerHTML = `
      <header class="nova-head">
        <div class="nova-brand">NOVA <small>SPATIAL AI</small></div>
        <div class="nova-head__actions">
          <button type="button" class="nova-icon-btn" id="novaBtnMin" aria-label="최소화">${ICON.min}</button>
          <button type="button" class="nova-icon-btn" id="novaBtnClose" aria-label="닫기">${ICON.close}</button>
        </div>
      </header>

      <div class="nova-stage">
        <button type="button" class="nova-orb" id="novaBtnTalk" aria-label="대화 시작 또는 종료">
          <span class="nova-orb__halo"></span>
          <span class="nova-orb__ring r1"></span>
          <span class="nova-orb__ring r2"></span>
          <span class="nova-orb__ring r3"></span>
          <span class="nova-orb__sweep"></span>
          <span class="nova-orb__core"></span>
        </button>
        <div class="nova-status" id="novaStatusText">탭하여 대화 시작</div>
      </div>

      <div class="nova-captions" aria-live="polite">
        <p class="nova-cap nova-cap--user" id="novaUserBubble"></p>
        <p class="nova-cap nova-cap--ai" id="novaAiBubble">안녕하세요, 노바예요. 무엇을 보여드릴까요?</p>
      </div>

      <div class="nova-toast" id="novaActionBadge">${ICON.check}<span id="novaActionText"></span></div>

      <div class="nova-notice" id="novaPermGuide" role="alert">
        <b id="novaGuideTitle"></b>
        <p id="novaGuideMsg"></p>
        <button type="button" id="novaBtnCloseGuide">닫기</button>
      </div>

      <div class="nova-chips" role="group" aria-label="빠른 명령">
        ${QUICK.map((q, i) => `<button type="button" class="nova-chip" data-quick="${i}"><svg viewBox="0 0 24 24" aria-hidden="true">${q.icon}</svg>${q.label}</button>`).join("")}
      </div>

      <form class="nova-input" id="novaTextForm" autocomplete="off">
        <input type="text" id="novaTextInput" placeholder="말하거나 입력하세요 · 예) 상자 떨어뜨려줘" aria-label="명령 입력">
        <button type="submit" aria-label="보내기">${ICON.send}</button>
      </form>

      <footer class="nova-foot">
        <span class="nova-foot__dot"></span>
        <span id="novaModeBadge">${window.NovaLive ? "Gemini Live" : "기본 음성 모드"}</span>
        <span class="nova-foot__hint">말을 끊어도 돼요</span>
      </footer>
    `;
    document.body.appendChild(modal);

    const isOpen = () => modal.style.display === "flex";
    const open = () => { modal.style.display = "flex"; };
    const hide = () => { modal.style.display = "none"; };

    // Launcher: open (and start talking) / close (and stop)
    fab.addEventListener("click", () => {
      if (!isOpen()) {
        open();
        if (!state.liveMode && !state.isListening) startListening();
      } else {
        hide();
        stopListening();
      }
    });

    const promptMic = document.getElementById("btnPromptMic");
    if (promptMic) {
      promptMic.addEventListener("click", () => {
        open();
        if (!state.liveMode && !state.isListening) startListening();
      });
    }

    document.getElementById("novaBtnClose").addEventListener("click", () => {
      hide();
      stopListening();
    });
    // Minimize keeps the conversation running; the launcher keeps glowing.
    document.getElementById("novaBtnMin").addEventListener("click", hide);

    // Orb = talk toggle
    document.getElementById("novaBtnTalk").addEventListener("click", () => {
      if (state.isListening || state.liveMode) stopListening();
      else startListening();
    });

    // Quick commands
    modal.querySelectorAll(".nova-chip[data-quick]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const q = QUICK[Number(btn.dataset.quick)];
        updateTranscript(q.label);
        if (q.action === "play_world_model_tour") {
          // The show narrates itself; no extra Nova speech on top of it.
          stopListening?.();
          executeAction(q.action, q.param);
          return;
        }
        let desc;
        if (q.action === "focus_world_prompt") {
          document.getElementById("inputWorldPrompt")?.focus({ preventScroll: true });
          desc = "AI 3D 공간 만들기 입력창 열기";
          updateActionBadge(desc);
        } else {
          desc = executeAction(q.action, q.param);
        }
        if (window.NovaLive && window.NovaLive.isActive) {
          window.NovaLive.sendText(`(시스템 안내: 사용자가 버튼으로 '${q.say}'을(를) 실행했어요. 한 문장으로 짧게 안내해 주세요. 도구는 호출하지 마세요.)`);
          return;
        }
        const reply = q.action === "focus_world_prompt"
          ? "위 입력창에 만들고 싶은 공간을 적어 주세요. 예를 들면 반도체 클린룸처럼요."
          : `네, ${desc || q.say}을 실행했어요.`;
        updateResponse(reply);
        await speakResponse(reply);
      });
    });

    // Text command
    const textForm = document.getElementById("novaTextForm");
    const textInput = document.getElementById("novaTextInput");
    textForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cmd = textInput.value.trim();
      if (!cmd) return;
      textInput.value = "";
      updateTranscript(cmd);
      if (window.NovaLive && window.NovaLive.isActive) {
        window.NovaLive.sendText(cmd);
      } else {
        updateStatus("processing", "생각하는 중...");
        const reply = parseLocalIntent(cmd);
        updateResponse(reply);
        await speakResponse(reply);
      }
    });

    document.getElementById("novaBtnCloseGuide").addEventListener("click", () => {
      document.getElementById("novaPermGuide").classList.remove("is-show");
    });

    // Esc closes the panel
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen() && !e.target.closest?.("input, textarea")) hide();
    });
  }

  // UI State Updaters
  const IDLE_LABEL = "탭하여 대화 시작";
  function updateStatus(type, label) {
    const panel = document.getElementById("voiceAssistantModal");
    const text = document.getElementById("novaStatusText");
    const fab = document.getElementById("voiceAssistantFab");
    if (panel) panel.dataset.state = type || "idle";
    if (text) text.textContent = type === "idle" && (!label || label === "대기 중") ? IDLE_LABEL : label;
    const live = type !== "idle" && (state.liveMode || state.isListening || state.isSpeaking);
    if (fab) fab.classList.toggle("is-live", live);
    if (type === "idle") setLevel(0);
  }

  // Audio level (0‥1) drives the orb and launcher glow
  let levelSmooth = 0;
  function setLevel(v) {
    const target = Math.max(0, Math.min(1, (v || 0) * 2.2));
    levelSmooth = target > levelSmooth ? target : levelSmooth * 0.82 + target * 0.18;
    const val = levelSmooth.toFixed(3);
    document.getElementById("voiceAssistantModal")?.style.setProperty("--lvl", val);
    document.getElementById("voiceAssistantFab")?.style.setProperty("--lvl", val);
  }

  function updateTranscript(text) {
    const el = document.getElementById("novaUserBubble");
    if (el) el.textContent = text || "";
  }

  function updateResponse(text) {
    const el = document.getElementById("novaAiBubble");
    if (!el) return;
    el.textContent = text || "";
    el.scrollTop = el.scrollHeight;
  }

  let toastTimer = null;
  function updateActionBadge(text) {
    const badge = document.getElementById("novaActionBadge");
    const textEl = document.getElementById("novaActionText");
    const panel = document.getElementById("voiceAssistantModal");
    if (!badge || !textEl) return;
    textEl.textContent = `${text} 실행됨`;
    badge.classList.remove("is-show");
    void badge.offsetWidth;
    badge.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => badge.classList.remove("is-show"), 3200);
    if (panel) {
      panel.classList.remove("is-action");
      void panel.offsetWidth;
      panel.classList.add("is-action");
      setTimeout(() => panel.classList.remove("is-action"), 800);
    }
  }

  // Kept for the existing call sites; the orb state now carries the animation.
  function startWaveAnimation() {}
  function stopWaveAnimation() {}

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
