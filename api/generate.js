import { config } from "dotenv";
import fetch from "node-fetch";

config();

const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { topic } = req.body || {};

  if (!topic || typeof topic !== "string" || !topic.trim()) {
    return res.status(400).json({ error: "A non-empty 'topic' string is required." });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({
      error: "Server is missing GROQ_API_KEY. Add it in Vercel project settings.",
    });
  }

  try {
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: topic.trim().slice(0, 6000) },
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
