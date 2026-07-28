import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3001;
const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// The exact shape we require the model to return. This is repeated to the
// model in the system prompt so it has zero ambiguity about the contract.
const SYSTEM_PROMPT = `You are a study material generator. Given a topic or a
block of notes from the user, produce flashcards and a multiple-choice quiz
about that content.

You must respond with ONLY raw JSON — no markdown fences, no commentary,
no leading or trailing text. The JSON must match this exact shape:

{
  "title": "string, a short title for this study set",
  "flashcards": [
    { "question": "string", "answer": "string" }
  ],
  "quiz": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": 0
    }
  ]
}

Rules:
- Produce between 5 and 10 flashcards and between 5 and 8 quiz questions.
- Every quiz question must have exactly 4 options.
- "correctAnswer" is the zero-based index into "options" of the right answer.
- Base everything strictly on the topic/notes the user provides.
- Do not include any keys other than the ones shown above.
- Output must be valid, parseable JSON and nothing else.`;

// Used by /api/refine: the model edits an existing study set instead of
// starting over, per the user's follow-up instruction (e.g. "add 3 more
// cards about subnetting" or "make the quiz easier").
const REFINE_SYSTEM_PROMPT = `You are editing an existing study set (flashcards
+ quiz) based on the user's instruction. You will be given the CURRENT study
set as JSON, followed by an EDIT INSTRUCTION describing what to change.

Apply only the requested change. Keep everything else from the current set
intact unless the instruction implies otherwise (e.g. "remove the last 2
flashcards" means fewer cards; "add 3 more about X" means the existing cards
stay and 3 new ones are added).

You must respond with ONLY raw JSON, in this exact shape — no markdown
fences, no commentary:

{
  "title": "string",
  "flashcards": [ { "question": "string", "answer": "string" } ],
  "quiz": [
    { "question": "string", "options": ["string","string","string","string"], "correctAnswer": 0 }
  ]
}

Rules:
- Keep between 3 and 15 flashcards and 3 and 12 quiz questions after the edit.
- Every quiz question must have exactly 4 options.
- "correctAnswer" is the zero-based index into "options" of the right answer.
- Output must be valid, parseable JSON and nothing else.`;

/**
 * Shared call to Groq's chat completions endpoint. Both /api/generate and
 * /api/refine use this — same timeout, same JSON-mode, same error shape.
 */
async function callGroq({ systemPrompt, userContent, res }) {
  if (!GROQ_API_KEY) {
    res.status(500).json({
      error: "Server is missing GROQ_API_KEY. Add it to server/.env (see .env.example).",
    });
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      console.error("Groq API error:", upstream.status, errText);
      res.status(502).json({
        error: `AI provider returned an error (status ${upstream.status}). Please try again.`,
      });
      return null;
    }

    const data = await upstream.json();
    const rawText = data.choices?.[0]?.message?.content ?? "";

    if (!rawText.trim()) {
      res.status(502).json({ error: "AI provider returned an empty response." });
      return null;
    }

    return rawText;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      res.status(504).json({ error: "The AI provider took too long to respond." });
    } else {
      console.error("Unexpected server error:", err);
      res.status(500).json({ error: "Unexpected server error. Please try again." });
    }
    return null;
  }
}

/**
 * POST /api/generate
 * body: { topic: string }
 * Calls the Anthropic Messages API and returns the raw text the model
 * produced. We deliberately do NOT trust/parse-and-forward blindly here —
 * we do a light sanity check, but full validation happens again on the
 * client (defense in depth), since the client is what renders it.
 */
app.post("/api/generate", async (req, res) => {
  const { topic } = req.body || {};

  if (!topic || typeof topic !== "string" || !topic.trim()) {
    return res.status(400).json({ error: "A non-empty 'topic' string is required." });
  }

  const rawText = await callGroq({
    systemPrompt: SYSTEM_PROMPT,
    userContent: topic.trim().slice(0, 6000),
    res,
  });
  if (rawText === null) return; // callGroq already sent the error response

  // Send the raw text back — the client owns parsing/validation so that
  // the "handle bad AI output" logic lives in one place and is testable
  // against the actual failure modes (malformed JSON, wrong shape, etc.)
  return res.json({ raw: rawText });
});

/**
 * POST /api/refine
 * body: { currentData: object, instruction: string }
 * The "refinement loop" stretch goal: edits the existing study set based on
 * a follow-up instruction instead of regenerating from scratch. Reuses the
 * exact same response contract ({ raw: "<model text>" }) and the exact same
 * client-side validation as /api/generate — a bad refine response is
 * rejected the same way a bad initial generation would be.
 */
app.post("/api/refine", async (req, res) => {
  const { currentData, instruction } = req.body || {};

  if (!currentData || typeof currentData !== "object") {
    return res.status(400).json({ error: "'currentData' (the existing study set) is required." });
  }
  if (!instruction || typeof instruction !== "string" || !instruction.trim()) {
    return res.status(400).json({ error: "A non-empty 'instruction' string is required." });
  }

  const userContent = `CURRENT STUDY SET:\n${JSON.stringify(currentData)}\n\nEDIT INSTRUCTION:\n${instruction.trim().slice(0, 1000)}`;

  const rawText = await callGroq({
    systemPrompt: REFINE_SYSTEM_PROMPT,
    userContent: userContent.slice(0, 8000),
    res,
  });
  if (rawText === null) return;

  return res.json({ raw: rawText });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`StudySpark backend listening on http://localhost:${PORT}`);
  if (!GROQ_API_KEY) {
    console.warn("⚠️  GROQ_API_KEY is not set — /api/generate will fail until you add it.");
  } else {
    console.log("✅ GROQ_API_KEY loaded successfully.");
  }
});
