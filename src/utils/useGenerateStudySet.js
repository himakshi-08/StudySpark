import { useCallback, useRef, useState } from "react";
import { validateStudyData, ValidationError } from "./validateStudyData";

const REQUEST_TIMEOUT_MS = 35_000;

/**
 * Encapsulates the full lifecycle of asking the backend for a study set:
 *   idle -> loading -> success | error
 *
 * Two failure modes this specifically guards against:
 *  1. Stale responses: if the user fires a second request before the first
 *     resolves, the first request's result must never overwrite the second's.
 *     We solve this with AbortController (cancel the in-flight request) AND
 *     a monotonically increasing request id (belt-and-suspenders — even if
 *     an abort doesn't stop a response from resolving, the id check does).
 *  2. Hung requests: a client-side timeout aborts the fetch so the UI never
 *     gets stuck on "loading" forever.
 */
export function useGenerateStudySet() {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const latestRequestIdRef = useRef(0);

  const generate = useCallback(async (topic) => {
    // Cancel any in-flight request before starting a new one.
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const requestId = ++latestRequestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch(import.meta.env.PROD ? "/api/generate" : "/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
        signal: controller.signal,
      });

      // A newer request has since started — silently drop this result.
      if (requestId !== latestRequestIdRef.current) return;

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || `Request failed with status ${response.status}.`);
      }
      if (!body?.raw) {
        throw new Error("Server response was missing content.");
      }

      const validated = validateStudyData(body.raw);

      if (requestId !== latestRequestIdRef.current) return; // stale guard, again

      setData(validated);
      setStatus("success");
    } catch (err) {
      if (requestId !== latestRequestIdRef.current) return; // ignore stale aborts/errors

      if (err.name === "AbortError") {
        setError("The request took too long and was cancelled. Please try again.");
      } else if (err instanceof ValidationError) {
        setError(`The AI response wasn't usable: ${err.message}`);
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
      setStatus("error");
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    latestRequestIdRef.current++;
    setStatus("idle");
    setData(null);
    setError(null);
  }, []);

  // Escape hatch used by App.jsx to load a saved session or apply an
  // already-validated refine result without going through a network
  // request. Any pending request is invalidated first so a slow in-flight
  // generate can't clobber data the user just loaded/refined.
  const setDataDirectly = useCallback((newData) => {
    latestRequestIdRef.current++;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setData(newData);
    setStatus("success");
    setError(null);
  }, []);

  return { status, data, error, generate, reset, setData: setDataDirectly };
}
