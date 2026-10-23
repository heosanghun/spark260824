/**
 * Gemini 3.8 Live: real-time speech-to-speech client for the Nova voice assistant.
 *
 * - Mic: getUserMedia (echo cancellation + noise suppression) -> AudioWorklet -> 16 kHz PCM16 (~40 ms chunks)
 * - Speaker: 24 kHz PCM16 from Gemini -> AudioWorklet ring buffer (small jitter buffer, gapless)
 * - Barge-in: serverContent.interrupted flushes playback immediately
 * - Robustness: session resumption on goAway / unexpected close, context window compression
 * - Cost guards: idle timeout, max session length, stop when the tab is hidden
 *
 * Auth: POST /api/live-token returns a single-use ephemeral token (real key stays on Cloudflare).
 * Exposes window.NovaLive = { start, stop, sendText, isActive }.
 */
(function () {
  "use strict";

  const TOKEN_ENDPOINT = "/api/live-token";
  const WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";
  const DEFAULT_MODEL = "models/gemini-3.8-live";
  const IN_RATE = 16000;
  const OUT_RATE = 24000;

  // ---------- AudioWorklet processors (inlined as a Blob module) ----------
  const WORKLET_SRC = `
  class MicCapture extends AudioWorkletProcessor {
    constructor(opts) {
      super();
      this.ratio = sampleRate / ${IN_RATE};
      this.pos = 0;
      this.chunk = new Int16Array(640); // 40 ms @ 16 kHz
      this.n = 0;
      this.levelAcc = 0; this.levelN = 0;
    }
    process(inputs) {
      const ch = inputs[0] && inputs[0][0];
      if (!ch) return true;
      // Linear-interpolated resample to 16 kHz
      while (this.pos < ch.length) {
        const i = Math.floor(this.pos), f = this.pos - i;
        const a = ch[i], b = i + 1 < ch.length ? ch[i + 1] : a;
        let s = a + (b - a) * f;
        s = Math.max(-1, Math.min(1, s));
        this.chunk[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
        this.levelAcc += s * s; this.levelN++;
        if (this.n === this.chunk.length) {
          const out = this.chunk.slice(0);
          this.port.postMessage({ pcm: out.buffer, level: Math.sqrt(this.levelAcc / this.levelN) }, [out.buffer]);
          this.n = 0; this.levelAcc = 0; this.levelN = 0;
        }
        this.pos += this.ratio;
      }
      this.pos -= ch.length;
      return true;
    }
  }
  class PcmPlayer extends AudioWorkletProcessor {
    constructor() {
      super();
      this.cap = ${OUT_RATE} * 120; // 120 s ring buffer
      this.buf = new Float32Array(this.cap);
      this.r = 0; this.w = 0; this.size = 0; this.tick = 0;
      this.playing = false; this.flushReq = false;
      this.prebuffer = Math.round(${OUT_RATE} * 0.08); // 80 ms jitter buffer
      this.port.onmessage = (e) => {
        const m = e.data;
        if (m.type === "push") {
          const d = new Float32Array(m.data);
          for (let i = 0; i < d.length; i++) {
            if (this.size === this.cap) { this.r = (this.r + 1) % this.cap; this.size--; }
            this.buf[this.w] = d[i]; this.w = (this.w + 1) % this.cap; this.size++;
          }
        } else if (m.type === "clear") {
          this.r = this.w = this.size = 0; this.flushReq = false;
          if (this.playing) { this.playing = false; this.port.postMessage({ type: "state", playing: false }); }
        } else if (m.type === "flush") {
          this.flushReq = true;
        }
      };
    }
    process(_, outputs) {
      const out = outputs[0][0];
      if (!this.playing && this.size > 0 && (this.size >= this.prebuffer || this.flushReq)) {
        this.playing = true; this.port.postMessage({ type: "state", playing: true });
      }
      let sum = 0;
      for (let i = 0; i < out.length; i++) {
        if (this.playing && this.size > 0) {
          const v = this.buf[this.r]; this.r = (this.r + 1) % this.cap; this.size--;
          out[i] = v; sum += v * v;
        } else out[i] = 0;
      }
      if (this.playing && this.size === 0) {
        this.playing = false; this.flushReq = false;
        this.port.postMessage({ type: "state", playing: false });
      }
      if (this.playing && (++this.tick & 7) === 0) this.port.postMessage({ type: "level", level: Math.sqrt(sum / out.length) });
      return true;
    }
  }
  registerProcessor("nova-mic-capture", MicCapture);
  registerProcessor("nova-pcm-player", PcmPlayer);
  `;
  let workletUrl = null;
  const getWorkletUrl = () => (workletUrl ||= URL.createObjectURL(new Blob([WORKLET_SRC], { type: "application/javascript" })));

  // ---------- helpers ----------
  function b64FromBuffer(buf) {
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function pcm16B64ToFloat32(b64) {
    const bin = atob(b64);
    const n = bin.length >> 1;
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
      if (v & 0x8000) v -= 0x10000;
      out[i] = v / 0x8000;
    }
    return out;
  }
  const dec = new TextDecoder();
  function resampleLinear(src, from, to) {
    const n = Math.max(1, Math.round((src.length * to) / from));
    const out = new Float32Array(n);
    const k = from / to;
    for (let i = 0; i < n; i++) {
      const x = i * k, j = Math.floor(x), f = x - j;
      const a = src[Math.min(j, src.length - 1)], b = src[Math.min(j + 1, src.length - 1)];
      out[i] = a + (b - a) * f;
    }
    return out;
  }

  // ---------- session ----------
  let S = null; // active session state

  async function obtainToken() {
    try {
      const r = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.token) return j;
      console.warn("[Nova Live] /api/live-token returned:", r.status, j);
    } catch (e) {
      console.warn("[Nova Live] /api/live-token fetch error:", e);
    }

    // Client-side fallback if server endpoint is pending redeploy or running offline
    const fallbackKey =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("GEMINI_API_KEY")
        : null;
    if (fallbackKey) {
      try {
        const resp = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/auth_tokens",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": fallbackKey,
            },
            body: JSON.stringify({
              uses: 1,
              expireTime: new Date(Date.now() + 6 * 60 * 1000).toISOString(),
              bidiGenerateContentSetup: { model: DEFAULT_MODEL },
            }),
          }
        );
        const data = await resp.json().catch(() => ({}));
        if (data.name) {
          console.log("[Nova Live] Ephemeral token minted via Gemini API key");
          return { token: data.name, model: DEFAULT_MODEL };
        }
      } catch (err) {
        console.warn("[Nova Live] Fallback token mint failed:", err);
      }
    }

    const err = new Error("token_unavailable");
    err.code = "TOKEN";
    throw err;
  }

  /**
   * @param {object} opts
   *   systemInstruction: string, tools: FunctionDeclaration[], voice: string,
   *   greeting: string|null, idleMs, maxMs,
   *   on: { status(type,label), user(text,final), ai(text,final), tool(name,args)->string, level(v), end(reason), error(err) }
   */
  async function start(opts) {
    if (S) return;
    const on = opts.on || {};
    const s = (S = {
      opts, on, ws: null, token: null, model: DEFAULT_MODEL, handle: null,
      micCtx: null, outCtx: null, stream: null, micNode: null, player: null,
      ready: false, closing: false, reconnects: 0,
      userText: "", aiText: "", aiPlaying: false,
      lastActivity: performance.now(), startedAt: performance.now(),
      timers: [], farewellSent: false,
    });

    // AudioContexts must be created inside the user gesture (before any await).
    const AC = window.AudioContext || window.webkitAudioContext;
    s.micCtx = new AC();
    try { s.outCtx = new AC({ sampleRate: OUT_RATE }); } catch { s.outCtx = new AC(); }

    try {
      on.status?.("connecting", "연결 중...");
      const micP = navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const tokenP = obtainToken();
      const [stream, tok] = await Promise.all([micP, tokenP]);
      if (S !== s) { stream.getTracks().forEach((t) => t.stop()); return; }
      s.stream = stream;
      s.token = tok.token;
      s.model = tok.model || DEFAULT_MODEL;

      await Promise.all([s.micCtx.audioWorklet.addModule(getWorkletUrl()), s.outCtx.audioWorklet.addModule(getWorkletUrl())]);
      await Promise.all([s.micCtx.resume(), s.outCtx.resume()]);

      // Speaker chain (resamples automatically if the context could not run at 24 kHz)
      s.player = new AudioWorkletNode(s.outCtx, "nova-pcm-player", { outputChannelCount: [1] });
      s.player.connect(s.outCtx.destination);
      s.player.port.onmessage = (e) => {
        const m = e.data;
        if (m.type === "state") {
          s.aiPlaying = m.playing;
          s.lastActivity = performance.now();
          if (m.playing) on.status?.("speaking", "말하는 중 · 언제든 끼어들어도 돼요");
          else if (s.ready) on.status?.("listening", "듣고 있어요 · 편하게 말씀하세요");
        } else if (m.type === "level") on.level?.(m.level);
      };

      // Mic chain
      const src = s.micCtx.createMediaStreamSource(stream);
      s.micNode = new AudioWorkletNode(s.micCtx, "nova-mic-capture");
      src.connect(s.micNode);
      const sink = s.micCtx.createGain(); sink.gain.value = 0; // keep the graph pulling without echoing the mic
      s.micNode.connect(sink).connect(s.micCtx.destination);
      s.micNode.port.onmessage = (e) => {
        const { pcm, level } = e.data;
        if (level > 0.04) s.lastActivity = performance.now();
        if (!s.aiPlaying) on.level?.(level);
        if (s.ready && s.ws?.readyState === 1) {
          s.ws.send(JSON.stringify({ realtimeInput: { audio: { data: b64FromBuffer(pcm), mimeType: `audio/pcm;rate=${IN_RATE}` } } }));
        }
      };

      await connect(s, false);
      startGuards(s);
    } catch (err) {
      const reason = err && err.code === "TOKEN" ? "token" : (err && err.name) || "error";
      teardown(s);
      if (S === s) S = null;
      on.error?.(err);
      on.end?.(reason);
      throw err;
    }
  }

  function setupMessage(s) {
    const o = s.opts;
    return {
      setup: {
        model: s.model,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: o.voice || "Kore" } } },
        },
        systemInstruction: { parts: [{ text: o.systemInstruction || "" }] },
        tools: o.tools && o.tools.length ? [{ functionDeclarations: o.tools }] : undefined,
        realtimeInputConfig: {
          automaticActivityDetection: {
            // Exhibition halls are noisy: be a little stricter about what counts as speech start.
            startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
            prefixPaddingMs: 120,
            silenceDurationMs: 450,
          },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        contextWindowCompression: { slidingWindow: {} },
        sessionResumption: s.handle ? { handle: s.handle } : {},
      },
    };
  }

  function connect(s, isResume) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_URL}?access_token=${encodeURIComponent(s.token)}`);
      ws.binaryType = "arraybuffer";
      s.ws = ws;
      s.ready = false;
      let settled = false;
      const openTimer = setTimeout(() => { if (!settled) { settled = true; reject(new Error("setup_timeout")); try { ws.close(); } catch {} } }, 12000);

      ws.onopen = () => ws.send(JSON.stringify(setupMessage(s)));
      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(typeof ev.data === "string" ? ev.data : dec.decode(ev.data)); } catch { return; }
        if (msg.setupComplete) {
          s.ready = true;
          s.reconnects = 0;
          clearTimeout(openTimer);
          if (!settled) { settled = true; resolve(); }
          s.on.status?.("listening", "듣고 있어요 · 편하게 말씀하세요");
          if (!isResume && s.opts.greeting) sendText(s.opts.greeting);
          return;
        }
        handleServerMessage(s, msg);
      };
      ws.onerror = () => {};
      ws.onclose = (ev) => {
        clearTimeout(openTimer);
        if (S !== s || s.closing) return;
        if (!settled) { settled = true; reject(new Error(`ws_closed_${ev.code}${ev.reason ? ":" + ev.reason : ""}`)); return; }
        // Unexpected drop mid-conversation: resume transparently.
        resume(s, `close_${ev.code}`);
      };
    });
  }

  async function resume(s, why) {
    if (S !== s || s.closing) return;
    if (s.reconnects >= 3 || !s.handle) { stop(`disconnected:${why}`); return; }
    s.reconnects++;
    s.on.status?.("connecting", "잠시만요, 다시 연결 중...");
    try { s.ws && s.ws.readyState <= 1 && s.ws.close(); } catch {}
    try {
      await connect(s, true);
    } catch (err) {
      // Token may have expired: fetch a fresh one and try again.
      try {
        const tok = await obtainToken();
        s.token = tok.token;
        await connect(s, true);
      } catch (e2) {
        stop(`disconnected:${why}`);
      }
    }
  }

  function handleServerMessage(s, msg) {
    const sc = msg.serverContent;
    if (sc) {
      if (sc.interrupted) {
        s.player?.port.postMessage({ type: "clear" });
        s.aiPlaying = false;
        s.on.status?.("listening", "듣고 있어요 · 편하게 말씀하세요");
      }
      const parts = sc.modelTurn && sc.modelTurn.parts;
      if (parts) {
        for (const p of parts) {
          const d = p.inlineData;
          if (d && d.data && /audio/.test(d.mimeType || "audio")) {
            let f32 = pcm16B64ToFloat32(d.data);
            const rate = s.outCtx ? s.outCtx.sampleRate : OUT_RATE;
            if (rate !== OUT_RATE) f32 = resampleLinear(f32, OUT_RATE, rate);
            s.player?.port.postMessage({ type: "push", data: f32.buffer }, [f32.buffer]);
            s.lastActivity = performance.now();
          }
        }
      }
      if (sc.inputTranscription && sc.inputTranscription.text) {
        if (s.aiText) { s.on.ai?.(s.aiText, true); s.aiText = ""; }
        s.userText += sc.inputTranscription.text;
        s.lastActivity = performance.now();
        s.on.user?.(s.userText.trim(), false);
      }
      if (sc.outputTranscription && sc.outputTranscription.text) {
        if (s.userText) { s.on.user?.(s.userText.trim(), true); s.userText = ""; }
        s.aiText += sc.outputTranscription.text;
        s.on.ai?.(s.aiText.trim(), false);
      }
      if (sc.generationComplete || sc.turnComplete) s.player?.port.postMessage({ type: "flush" });
      if (sc.turnComplete) {
        if (s.userText) { s.on.user?.(s.userText.trim(), true); s.userText = ""; }
        if (s.aiText) { s.on.ai?.(s.aiText.trim(), true); s.aiText = ""; }
      }
    }

    if (msg.toolCall && msg.toolCall.functionCalls) {
      const functionResponses = msg.toolCall.functionCalls.map((fc) => {
        let result;
        try {
          result = s.on.tool ? s.on.tool(fc.name, fc.args || {}) : "";
        } catch (e) {
          return { id: fc.id, name: fc.name, response: { error: String(e && e.message || e) } };
        }
        // The model already told the visitor what it is doing; don't make it talk again.
        return { id: fc.id, name: fc.name, response: { result: result || "done", scheduling: "SILENT" } };
      });
      if (s.ws?.readyState === 1) s.ws.send(JSON.stringify({ toolResponse: { functionResponses } }));
    }

    if (msg.sessionResumptionUpdate && msg.sessionResumptionUpdate.resumable && msg.sessionResumptionUpdate.newHandle) {
      s.handle = msg.sessionResumptionUpdate.newHandle;
    }

    if (msg.goAway) resume(s, "goAway");
  }

  function startGuards(s) {
    const idleMs = s.opts.idleMs || 15000;
    const maxMs = s.opts.maxMs || 180000;
    s.timers.push(setInterval(() => {
      if (S !== s) return;
      const now = performance.now();
      if (!s.aiPlaying && now - s.lastActivity > idleMs) { stop("idle"); return; }
      if (!s.farewellSent && now - s.startedAt > maxMs) {
        s.farewellSent = true;
        sendText("(시스템 안내: 관람객 체험 시간이 끝났어요. 다른 관람객을 위해 한 문장으로 짧고 따뜻하게 마무리 인사를 해 주세요. 도구는 호출하지 마세요.)");
        s.timers.push(setTimeout(() => stop("max_duration"), 9000));
      }
    }, 500));
    s.onVis = () => { if (document.hidden) stop("hidden"); };
    document.addEventListener("visibilitychange", s.onVis);
  }

  function sendText(text) {
    const s = S;
    if (!s || !s.ws || s.ws.readyState !== 1 || !s.ready) return false;
    s.ws.send(JSON.stringify({ realtimeInput: { text } }));
    s.lastActivity = performance.now();
    return true;
  }

  function teardown(s) {
    s.closing = true;
    s.timers.forEach((t) => { clearInterval(t); clearTimeout(t); });
    if (s.onVis) document.removeEventListener("visibilitychange", s.onVis);
    try { s.ws && s.ws.readyState <= 1 && s.ws.close(1000, "bye"); } catch {}
    try { s.stream && s.stream.getTracks().forEach((t) => t.stop()); } catch {}
    try { s.micNode && s.micNode.disconnect(); } catch {}
    try { s.player && s.player.disconnect(); } catch {}
    try { s.micCtx && s.micCtx.state !== "closed" && s.micCtx.close(); } catch {}
    try { s.outCtx && s.outCtx.state !== "closed" && s.outCtx.close(); } catch {}
  }

  function stop(reason = "user") {
    const s = S;
    if (!s) return;
    S = null;
    teardown(s);
    s.on.end?.(reason);
  }

  window.NovaLive = {
    start,
    stop,
    sendText,
    get isActive() { return !!S; },
    get isReady() { return !!(S && S.ready); },
  };
})();
