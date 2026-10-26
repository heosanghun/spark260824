// Cloudflare Pages Function: POST /api/sketch-to-prompt
// Uses Gemini Multimodal API to analyze architectural blueprints / sketches
// and engineers optimized photorealistic World Labs Marble 1.1 3D prompts.

const ALLOWED_ORIGINS = new Set([
  "https://simsreality.app",
  "https://www.simsreality.app",
  "https://world-labs-260907.pages.dev",
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const u = new URL(origin);
    return (
      u.hostname.endsWith(".world-labs-260907.pages.dev") ||
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

const json = (body, status = 200, origin = "") =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(origin
        ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
        : {}),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });

export async function onRequestOptions({ request }) {
  const origin = request.headers.get("Origin") || "";
  return new Response(null, {
    status: 204,
    headers: {
      ...(origin && isAllowedOrigin(origin)
        ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
        : {}),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin") || "";
  if (origin && !isAllowedOrigin(origin)) {
    return json({ error: "forbidden_origin" }, 403, origin);
  }

  const apiKey = env.GEMINI_API_KEY || env.Gemini || env.gemini || env.GEMINI;
  if (!apiKey) {
    return json(
      { error: "Gemini API key is not configured on Cloudflare Pages" },
      503,
      origin,
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json_body" }, 400, origin);
  }

  const {
    imageBase64,
    mimeType = "image/jpeg",
    userNotes = "",
    presetType = "",
  } = body;
  if (!imageBase64) {
    return json({ error: "imageBase64 is required" }, 400, origin);
  }

  // System prompt instructing Gemini to act as a World-Class Spatial AI Architect
  const systemInstruction = `
You are the Chief Spatial Intelligence Architect for SIMSREALITY and World Labs Marble 3D.
Your task is to visually analyze the user's architectural floor plan, 2D CAD blueprint, sketch, or photograph, and extract REAL architectural numbers, circulation paths, structural features, and engineer an ultra-detailed 3D generation prompt for World Labs Marble 1.1 Gaussian Splatting.

Follow these strict guidelines:
1. "detectedScale":
   - Carefully inspect the image for dimension lines, room dimensions, scale bars, column grids, or estimate realistically based on standard architectural ratios (e.g. door width 0.9m, parking stall 2.5x5.0m, column bay 6~10m).
   - Formulate strictly as: "약 [면적]㎡ ([가로]m × [세로]m) · 층고 [층고]m" (예: "약 1,450㎡ (45m × 32m) · 층고 8.5m").
   - NEVER return vague placeholders like "면적 미상". Always calculate realistic width, depth, area, and ceiling height based on what is drawn in the 2D plan!

2. "structuralAnalysis":
   - Write 4 clear, specific bullet points strictly describing the 2D blueprint / drawing details:
     ① 기둥 그리드 간격, 내력벽 및 공간의 형태 (직사각형, L자형, 기둥 스팬 등)
     ② 주 출입구, 비상구 및 내부 이동/물류 보행 동선 (통로 폭, 직선 복도 등)
     ③ 도면에서 식별된 주요 기능 구역 배치 (보관 랙, 작업대, 사무실, 설비 존 등)
     ④ 천장 구조, 자연 채광창 위치 또는 조명 레일/덕트 배치
   - Each bullet point must be written in Korean, clear, professional, and directly reflect the 2D layout.

3. "equipmentDetected":
   - Array of 4-6 specific equipment, furniture, or structures detected in the 2D blueprint.

4. "optimizedWorldLabsPrompt":
   - 3-5 sentences of vivid, highly descriptive spatial English language for World Labs Marble Gaussian Splatting reflecting the 2D layout.

Output MUST be valid strictly formatted JSON matching this exact schema:
{
  "blueprintTitle": "한국어 제목 (예: 50m 초고층 자동화 스마트 물류 허브)",
  "detectedScale": "약 1,450㎡ (45m × 32m) · 층고 8.5m",
  "structuralAnalysis": [
    "도면 내 6m 간격 기둥 그리드와 4열 고천장 랙 정밀 배치",
    "중앙 3.8m 양방향 자율주행 AGV 및 지게차 메인 운송 동선 확보",
    "좌측 로딩 독 2개소와 입출고 검품 완충 스테이션 구획",
    "상단 선형 LED 하이베이 조명 레일 및 공조 덕트 라인 설계"
  ],
  "equipmentDetected": ["고천장 팔레트 랙", "AGV 주행로", "도크 레벨러", "검수 작업대"],
  "atmosphere": "산업용 에폭시 바닥 반사, 차분한 블루 & 앰버 상태 표시등, 균일한 확산 조명",
  "optimizedWorldLabsPrompt": "Ultra-detailed English prompt for World Labs Marble...",
  "tags": ["물류 자동화", "AGV 주행로", "고천장 랙", "스마트 팩토리"]
}
`;

  const userPrompt = userNotes
    ? `사용자의 추가 요구사항: "${userNotes}"\n\n첨부된 도면/스케치 이미지를 정밀 분석하여 World Labs 3D 생성을 위한 최고 품질의 프롬프트와 분석 결과를 JSON으로 출력해주세요.`
    : "첨부된 도면/스케치 이미지를 정밀 분석하여 World Labs 3D 생성을 위한 최고 품질의 프롬프트와 분석 결과를 JSON으로 출력해주세요.";

  // Gemini 2.5 Flash endpoint
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `${systemInstruction}\n\n${userPrompt}` },
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    };

    const resp = await fetch(geminiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[Gemini Error]", resp.status, errText);
      return json(
        { error: `Gemini API returned ${resp.status}`, detail: errText },
        502,
        origin,
      );
    }

    const data = await resp.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      return json({ error: "Empty response from Gemini" }, 502, origin);
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(candidate);
    } catch (parseErr) {
      // Clean up markdown code blocks if any
      const cleaned = candidate
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsedResult = JSON.parse(cleaned);
    }

    return json({ success: true, result: parsedResult }, 200, origin);
  } catch (err) {
    console.error("[Sketch-to-Prompt Exception]", err);
    return json({ error: err.message || "Internal server error" }, 500, origin);
  }
}
