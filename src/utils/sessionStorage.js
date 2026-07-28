/**
 * Save & reload sessions (stretch goal). Stores generated study sets in
 * localStorage so a user can leave and come back without regenerating.
 *
 * Kept deliberately simple: a capped list of full study-set snapshots,
 * newest first. No quiz progress is persisted — only the generated
 * content — see README "known limitations".
 */

const STORAGE_KEY = "studyspark:sessions";
const MAX_SESSIONS = 10;

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupted localStorage shouldn't crash the app — treat as empty.
    return [];
  }
}

function writeAll(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — fail silently,
    // saving sessions is a nice-to-have, not core functionality.
  }
}

export function listSessions() {
  return readAll().sort((a, b) => b.savedAt - a.savedAt);
}

export function saveSession(studyData, topic) {
  const sessions = readAll();
  const session = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    savedAt: Date.now(),
    topic,
    data: studyData,
  };
  const next = [session, ...sessions].slice(0, MAX_SESSIONS);
  writeAll(next);
  return session;
}

export function updateSession(id, studyData) {
  const sessions = readAll();
  const next = sessions.map((s) => (s.id === id ? { ...s, data: studyData, savedAt: Date.now() } : s));
  writeAll(next);
}

export function deleteSession(id) {
  writeAll(readAll().filter((s) => s.id !== id));
}
