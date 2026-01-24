/* =====================================================
   MODERATION SERVICE – FINAL VERSION
   - Hard rule first (fast reject, no AI)
   - Otherwise ALWAYS call Gemini
   - SAFE or UNSAFE đều lưu cho admin xem
   - Fail-safe when quota / error
===================================================== */

/* =======================
   0. GEMINI INIT (ESM FIX)
======================= */
let aiInstance = null;

async function getGeminiAI() {
  if (aiInstance) return aiInstance;

  const { GoogleGenAI } = await import("@google/genai");

  aiInstance = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  console.log("🤖 Gemini AI initialized");

  return aiInstance;
}

const GEMINI_MODEL = "gemini-3-flash-preview";

/* =======================
   1. CACHE CONFIG
======================= */
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 10; // 10 phút

function getCacheKey(text) {
  return text.trim().toLowerCase();
}

/* =======================
   2. SINGLE REQUEST LIMIT
======================= */
let running = false;

async function runSingle(fn) {
  while (running) {
    await new Promise((r) => setTimeout(r, 300));
  }
  running = true;
  try {
    return await fn();
  } finally {
    running = false;
  }
}

/* =======================
   3. NORMALIZE VIETNAMESE
======================= */
function normalizeVietnamese(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =======================
   4. RULE DEFINITIONS
======================= */
// 🔴 HARD RULE – chắc chắn vi phạm → loại ngay, không gọi AI
const HARD_RULES = [
  /\b(do ngu|ngu dot|oc cho|suc vat|con cho|dit me|vai lon)\b/,
];

/* =======================
   5. RULE CHECK
======================= */
function checkHardRules(text) {
  const normalized = normalizeVietnamese(text);

  for (const regex of HARD_RULES) {
    if (regex.test(normalized)) {
      return true;
    }
  }

  return false;
}

/* =======================
   6. GEMINI CHECK (CONTENT ONLY)
   return true  = UNSAFE
   return false = SAFE
======================= */
async function geminiCheckContent(content) {
  const ai = await getGeminiAI();

  console.log("🤖 CALLING GEMINI...");

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `
Bạn là hệ thống kiểm duyệt nội dung diễn đàn.

Chỉ trả lời đúng một từ:
SAFE hoặc UNSAFE

Nội dung:
"""${content}"""
            `,
          },
        ],
      },
    ],
  });

  const raw = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

  const text = raw.trim().toUpperCase();

  console.log("🤖 GEMINI RAW RESPONSE:", text);

  return text.includes("UNSAFE");
}

/* =======================
   7. MAIN MODERATION API
======================= */
async function moderateContent(content) {
  console.log("🧪 MODERATION INPUT:", content);

  if (!content || !content.trim()) {
    return { safe: true, reason: "empty_content" };
  }

  /* 1️⃣ HARD RULE CHECK FIRST */
  const hardHit = checkHardRules(content);

  // 🔴 HARD RULE → UNSAFE, KHÔNG GỌI GEMINI
  if (hardHit) {
    console.log("⛔ HARD RULE HIT → REJECT WITHOUT AI");

    return {
      safe: false,
      reason: "hard_rule_violation",
    };
  }

  /* 2️⃣ CACHE CHECK */
  const key = getCacheKey(content);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    console.log("📦 CACHE HIT:", cached.result);
    return cached.result;
  }

  /* 3️⃣ ALWAYS CALL GEMINI (EVEN IF LOOKS SAFE) */
  try {
    const unsafe = await runSingle(() => geminiCheckContent(content));

    console.log("🤖 GEMINI FINAL:", unsafe ? "UNSAFE" : "SAFE");

    const result = unsafe
      ? { safe: false, reason: "gemini_unsafe" }
      : { safe: true, reason: "gemini_safe" };

    cache.set(key, {
      time: Date.now(),
      result,
    });

    return result;
  } catch (err) {
    // 🔴 QUOTA / 429 → FAIL-SAFE (KHÔNG CHẶN USER)
    if (err.message?.includes("429")) {
      console.warn("⚠️ Gemini quota exceeded → fallback safe");

      return {
        safe: true,
        reason: "quota_exceeded_fallback",
      };
    }

    console.error("❌ Gemini moderation error:", err.message);

    return {
      safe: true,
      reason: "gemini_error_fallback",
    };
  }
}

module.exports = { moderateContent };
