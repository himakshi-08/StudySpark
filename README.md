# StudySpark — AI Study Assistant

Paste notes or name a topic, get back flashcards and a multiple-choice quiz
you can actually interact with: flip through cards, take the quiz, and
retest just the questions you got wrong.

Built for the frontend internship assignment.

**🚀 Live Demo:** https://study-spark-git-main-himakshis-projects-1bbbb23b.vercel.app/

## How it works

```
Topic/notes input
      │
      ▼
POST /api/generate  (Express backend)
      │
      ▼
Groq API — Llama 3.3 70B (structured JSON prompt)
      │
      ▼
Raw text returned to the client
      │
      ▼
validateStudyData() — parse + shape-check, throws ValidationError on anything wrong
      │
      ▼
Validated data enters React state → renders flashcards + quiz
```

The model never talks to the browser directly, and the browser never trusts
model output blindly — everything goes through one validation function
before it's allowed into application state.

## Setup

Requirements: Node 18+.

### Local development

```bash
npm install
cp .env.example .env
# then edit .env and add your GROQ_API_KEY
# (free key: https://console.groq.com -> API Keys -> Create API Key)
npm start
```

`npm start` runs the Express backend (port 3001) and the Vite dev server
(port 5173) together, with `/api/*` requests proxied from the frontend to
the backend. It's powered by a small script (`scripts/dev.js`) that uses
only Node's built-in `child_process` — no extra package required, so
there's nothing that can fail to install. Open **http://localhost:5173**.

Backend and frontend can also be run separately if you prefer two terminals:

```bash
npm run server   # backend only, port 3001
npm run dev       # frontend only, port 5173 (proxies /api to 3001)
```

### Deploy to Vercel

This project is ready to deploy to Vercel with the frontend and serverless API routes in the `api/` folder.

1. Push the repo to GitHub.
2. Import it in Vercel.
3. Add these environment variables in Vercel Project Settings → Environment Variables:
   - `GROQ_API_KEY`
   - `GROQ_MODEL` (optional)
4. Deploy.

Vercel will serve the Vite frontend and expose the API routes at:
- `/api/generate`
- `/api/refine`

### Using a different AI provider

The only file that talks to an AI provider is `server/server.js`. Right now
it's a single `fetch` call to Groq's OpenAI-compatible endpoint
(`https://api.groq.com/openai/v1/chat/completions`). Because it's
OpenAI-compatible, pointing it at OpenAI itself is a one-line change (just
the URL and the API key header). Swapping to Anthropic, Gemini, OpenRouter,
or a local Ollama endpoint means adjusting the request/response shape for
that provider's API — keep the same `SYSTEM_PROMPT` and the same response
contract back to the client (`{ raw: "<model text>" }`). Nothing else in the
app needs to change, since `validateStudyData.js` only cares about the text
it receives, not which provider produced it.

## Stretch goals implemented

Of the five optional stretch items, I implemented three and intentionally
skipped two — reasoning below, since "why" matters more here than "did I do
all of them."

**Save & reload sessions** — every generated study set is saved to
`localStorage` (`src/utils/sessionStorage.js`), and the start screen shows
a "Continue a saved session" list. No login needed since it's local to the
browser; capped at 10 sessions so it doesn't grow unbounded.

**Refinement loop** — instead of only being able to regenerate from
scratch, there's a follow-up input at the bottom of a study set ("add 3
more flashcards", "make the quiz easier", or your own instruction). It
hits a new `/api/refine` endpoint that sends the model the *current* JSON
plus your instruction and asks for an edited version — same validation,
same error handling, same stale-request protection as the initial
generation (`useRefineStudySet.js` mirrors `useGenerateStudySet.js`).

**Polish** — dark mode (`useTheme.js`, persisted, respects system
preference on first load), keyboard navigation, and animation throughout:
- Flashcards: ← → to move between cards, space to flip
- App-wide shortcuts (`useKeyboardShortcuts.js`): `1`/`2` to switch tabs,
  `d` for dark mode, `n` for a new set, `?` to open a shortcuts panel
  (all ignored while typing in a text field, so they never fight with input)
- Fade/slide-in on state changes (loading→success, tab switches, saved
  session list, quiz results), plus small tactile touches (button/option
  press feedback) — all respect `prefers-reduced-motion`

**Skipped: streaming.** The app's core design choice is "validate the
*whole* response before any of it enters state" — that's what makes
malformed/wrong-shape output safe to reject outright. Streaming means
rendering partial JSON before you know it's well-formed, which either means
parsing incomplete JSON (fragile) or building a second, more lenient
parser just for the streaming path — undermining the one thing this
assignment weights most heavily. Doable with more time budget, but not a
good trade against the 8-hour constraint.

**Skipped: mixed block types (card/chart/checklist).** This stretch goal
reads as written for the recipe or trip-planner picks, where different
step types are a natural product need. For a study assistant, flashcards
and quiz questions are already the "blocks" the assignment separately
asks for by name — inventing extra block types here would be adding
complexity without a real product reason for it.

## Project structure

```
src/
├── components/
│   ├── InputForm.jsx        free-form topic/notes textarea
│   ├── LoadingState.jsx     loading state with skeleton
│   ├── ErrorState.jsx       error state with retry
│   ├── Flashcard.jsx        single flip card (mouse + keyboard)
│   ├── FlashcardDeck.jsx    navigation between cards, arrow-key nav
│   ├── Quiz.jsx             answer state, scoring, submit
│   ├── QuizQuestion.jsx     one question + options
│   ├── Results.jsx          score + retest trigger
│   ├── RefineForm.jsx       follow-up instruction to edit the set in place
│   ├── SavedSessions.jsx    list of locally-saved study sets
│   └── ShortcutsHelp.jsx    keyboard shortcuts popover (toggled with ?)
├── utils/
│   ├── validateStudyData.js     parses + validates raw AI text
│   ├── useGenerateStudySet.js   request lifecycle: loading/error/abort/timeout
│   ├── useRefineStudySet.js     same lifecycle, for the refinement loop
│   ├── useTheme.js              dark mode, persisted to localStorage
│   ├── useKeyboardShortcuts.js  app-wide shortcuts (tabs, theme, new set, help)
│   └── sessionStorage.js        save/list/update/delete sessions in localStorage
├── App.jsx                  wires everything together, owns tab/retest/session state
└── index.css                design system (tokens, layout, flip animation, dark mode)

server/
└── server.js                Express proxy to Groq; /api/generate + /api/refine; API key stays server-side
```

## Handling bad AI output

This was the main thing I optimized for, per the assignment brief.

- **Malformed JSON** — `JSON.parse` is wrapped in try/catch inside
  `validateStudyData.js`; a parse failure becomes a `ValidationError` with a
  human-readable message, not a crash.
- **Stray code fences** — some models wrap JSON in ` ```json ... ``` ` even
  when told not to; `stripCodeFences()` handles that before parsing.
- **Correct JSON, wrong shape** — every field is explicitly checked
  (`title` is a non-empty string, `flashcards`/`quiz` are non-empty arrays,
  each flashcard has both fields, each quiz question has ≥2 non-empty
  options and a `correctAnswer` index that's actually in range). Anything
  that doesn't match is rejected before it reaches React state.
- **Empty response** — checked both server-side (empty text from the model)
  and client-side (empty/whitespace string, or valid-but-empty arrays).
- **Slow/hung requests** — the backend aborts the upstream call after 30s;
  the frontend has its own 35s timeout via `AbortController` so the UI
  never gets stuck on a spinner forever.
- **Stale responses overwriting newer ones** — `useGenerateStudySet` aborts
  any in-flight request before starting a new one, and additionally tags
  every request with an incrementing id; a response is only applied to
  state if its id still matches the latest request. Belt-and-suspenders,
  since an abort isn't always guaranteed to stop a response from resolving.
- **API/network failures** — the backend returns a proper error status and
  message; the frontend surfaces it in `ErrorState` with a **Try again**
  button that retries the same topic without the user retyping it.

## AI-usage note

I used Claude while building this: to scaffold boilerplate (Vite config,
Express server skeleton), to sanity-check the validation edge cases I
should cover, and to review/tighten the CSS for the flashcard flip
animation. I wrote and understand every file — I can walk through and
modify any part of it in the interview, including the request-cancellation
logic in `useGenerateStudySet.js` and the validation rules in
`validateStudyData.js`, which is the part I focused on most.

## Known limitations

- Saved sessions store the generated content, not quiz progress —
  reloading a session gives you a fresh, unanswered quiz rather than
  resuming where you left off.
- No streaming — the full response is validated and rendered at once
  rather than appearing incrementally (see "Skipped: streaming" above for why).
- Retesting keeps going against the *original* wrong-answer set within a
  session; it doesn't yet track improvement across multiple retest rounds.
- Quiz scoring only requires exact single-answer selection (no partial
  credit, no multi-select questions).
- The refinement loop trusts the model to apply "keep everything else the
  same" reasonably — it's prompted for that but not enforced structurally,
  so a very unusual instruction could occasionally change more than
  intended (validation still guarantees the *shape* is correct either way).
- The AI occasionally produces flashcards/quiz questions that overlap in
  content since there's no de-duplication step against the model's output.

## Time spent

~8 hours core assignment: architecture and validation logic (~2.5h), backend
proxy (~1h), flashcard/quiz UI and flip interaction (~2.5h), error/loading
states and stale-request handling (~1h), styling and mobile responsiveness (~1h).

Plus ~2 hours on stretch goals: save/reload sessions (~40m), refinement
loop including the new backend endpoint (~50m), dark mode + keyboard nav
(~30m).
