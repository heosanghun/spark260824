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
Your task is to visually analyze the user's architectural floor plan, CAD blueprint, sketch, or warehouse photograph, and engineer an ultra-detailed, photorealistic 3D generation prompt tailored specifically for World Labs Marble 1.1 Gaussian Splatting.

Follow these strict guidelines:
1. Identify the structural spatial features:
   - Scale & dimensions (width, depth, ceiling height)
   - Grid columns, walls, truss structure, loading bays, doors
   - Equipment: pallet racks, conveyor belts, AGV paths, robotics, vehicles, control desks
   - Atmosphere: lighting (5000K high-bay LED, neon indicators, natural daylight), floor surface (polished concrete, epoxy, metallic grid)

2. Craft an "optimizedWorldLabsPrompt" in English:
   - Must be 3-5 sentences of vivid, highly descriptive spatial language.
   - Describe the exact perspective: eye-level view, wide-angle lens (24mm), depth of field, atmospheric volumetric haze, pristine industrial detail.
   - Specifically mention objects, material textures (brushed steel, glossy floor reflections, matte yellow caution striping), and spatial layout matching the blueprint.
   - Do NOT use generic buzzwords like "hyperrealistic 8k". Instead, use concrete physical, material, and spatial descriptions that guide World Labs Gaussian splat generation.

3. Output MUST be valid strictly formatted JSON matching this exact schema:
{
  "blueprintTitle": "한국어 제목 (예: 50m 초고층 자동화 스마트 물류 허브)",
  "detectedScale": "추정 면적 및 층고 (예: 약 1,800㎡, 층고 9.5m)",
  "structuralAnalysis": [
    "구조 특징 1 (예: 4열 5단 고천장 헤비듀티 팔레트 랙 배열)",
    "구조 특징 2 (예: 중앙 4m 폭 자율주행 AGV 고속 이송 레인)",
    "구조 특징 3 (예: 상단 H빔 트러스 및 5000K 고천장 선형 LED 조명)",
    "구조 특징 4 (예: 좌측 스마트 도크 로딩 베이 및 화물 검수 구역)"
  ],
  "equipmentDetected": ["고천장 팔레트 랙", "자율이송 로봇(AGV)", "LED 유도선", "포크리프트 통로"],
  "atmosphere": "산업용 에폭시 바닥 반사, 차분한 블루 & 앰버 상태 표시등, 균일한 확산 조명",
  "optimizedWorldLabsPrompt": "Ultra-detailed English prompt for World Labs Marble...",
  "beforePromptSample": "사용자가 흔히 적는 단순 프롬프트 (예: 스마트 물류창고 만들어줘)",
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
