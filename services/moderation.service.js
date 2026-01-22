/* =====================================================
   MODERATION SERVICE – FINAL (LOW QUOTA VERSION)
   - Hard / Soft rule-based
   - Gemini only when necessary
   - Cache + single concurrency
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

  return aiInstance;
}

// ✅ Backend-stable model
const GEMINI_MODEL = "gemini-2.0-flash";

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
// 🔴 HARD RULE – chắc chắn vi phạm → KHÔNG gọi Gemini
const HARD_RULES = [
  /\b(do ngu|ngu dot|oc cho|suc vat|con cho|dit me|vai lon)\b/,
];

// 🟡 SOFT RULE – cần Gemini xác định ngữ cảnh
const SOFT_RULES = [
  /\b(chet|giet|dam|dap|chem)\b/,
  /\b(tu tu|ket lieu)\b/,
];

/* =======================
   5. RULE CHECK
======================= */
function checkRules(text) {
  const normalized = normalizeVietnamese(text);

  for (const regex of HARD_RULES) {
    if (regex.test(normalized)) {
      return { type: "hard", hit: true };
    }
  }

  for (const regex of SOFT_RULES) {
    if (regex.test(normalized)) {
      return { type: "soft", hit: true };
    }
  }

  return { type: "none", hit: false };
}

/* =======================
   6. GEMINI CHECK (CONTENT ONLY)
   return true  = UNSAFE
   return false = SAFE
======================= */
async function geminiCheckContent(content) {
  const ai = await getGeminiAI();

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `
Bạn là hệ thống kiểm duyệt nội dung.

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

  const text = response.text().trim().toUpperCase();
  return text.includes("UNSAFE");
}

/* =======================
   7. MAIN MODERATION API
======================= */
async function moderateContent(content) {
  if (!content || !content.trim()) {
    return { safe: true, reason: "empty_content" };
  }

  /* 1️⃣ RULE-BASED (GIẢM QUOTA MẠNH) */
  const ruleResult = checkRules(content);

  // 🔴 HARD RULE → UNSAFE, KHÔNG GỌI GEMINI
  if (ruleResult.type === "hard") {
    return {
      safe: false,
      reason: "hard_rule_violation",
    };
  }

  // 🟢 KHÔNG DÍNH RULE → SAFE, KHÔNG GỌI GEMINI
  if (ruleResult.type === "none") {
    return {
      safe: true,
      reason: "no_rule_detected",
    };
  }

  /* 2️⃣ CACHE */
  const key = getCacheKey(content);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.result;
  }

  /* 3️⃣ SOFT RULE → GỌI GEMINI */
  try {
    const unsafe = await runSingle(() =>
      geminiCheckContent(content)
    );

    const result = unsafe
      ? { safe: false, reason: "gemini_unsafe" }
      : { safe: true, reason: "clean" };

    cache.set(key, {
      time: Date.now(),
      result,
    });

    return result;
  } catch (err) {
    // 🔴 QUOTA / 429 → FAIL-SAFE
    if (err.message?.includes("429")) {
      console.warn("Gemini quota exceeded → fallback pending");
      return {
        safe: true,
        reason: "quota_exceeded_pending",
      };
    }

    console.error("Gemini moderation error:", err.message);
    return {
      safe: true,
      reason: "gemini_error_fallback",
    };
  }
}

module.exports = { moderateContent };
