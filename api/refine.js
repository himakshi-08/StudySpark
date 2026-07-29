import { config } from "dotenv";
import fetch from "node-fetch";

config();

const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const REFINE_SYSTEM_PROMPT = `You are editing an existing study set (flashcards
+ quiz) based on the user's instruction. You will be given the CURRENT study
set as JSON, followed by an EDIT INSTRUCTION describing what to change.

Apply only the requested change. Keep everything else from the current set
intact unless the instruction implies otherwise.

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { currentData, instruction } = req.body || {};

  if (!currentData || typeof currentData !== "object") {
    return res.status(400).json({ error: "'currentData' (the existing study set) is required." });
  }
  if (!instruction || typeof instruction !== "string" || !instruction.trim()) {
    return res.status(400).json({ error: "A non-empty 'instruction' string is required." });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({
      error: "Server is missing GROQ_API_KEY. Add it in Vercel project settings.",
    });
  }

  try {
    const userContent = `CURRENT STUDY SET:\n${JSON.stringify(currentData)}\n\nEDIT INSTRUCTION:\n${instruction.trim().slice(0, 1000)}`;

    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: REFINE_SYSTEM_PROMPT },
          { role: "user", content: userContent.slice(0, 8000) },
        ],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      console.error("Groq API error:", upstream.status, errText);
      return res.status(502).json({
        error: "AI provider returned an error. Please try again.",
      });
    }

    const data = await upstream.json();
    const rawText = data.choices?.[0]?.message?.content ?? "";

    if (!rawText.trim()) {
      return res.status(502).json({ error: "AI provider returned an empty response." });
    }

    return res.json({ raw: rawText });
  } catch (err) {
    console.error("Unexpected server error:", err);
    return res.status(500).json({ error: "Unexpected server error. Please try again." });
  }
}
