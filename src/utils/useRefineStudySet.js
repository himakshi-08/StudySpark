import { useCallback, useRef, useState } from "react";
import { validateStudyData, ValidationError } from "./validateStudyData";

const REQUEST_TIMEOUT_MS = 35_000;

/**
 * Same shape as useGenerateStudySet, but hits /api/refine and sends the
 * current data along with a follow-up instruction. Deliberately duplicates
 * (rather than shares) the request-lifecycle logic from useGenerateStudySet
 * — they're similar today but refine may grow different needs (e.g. undo),
 * and the assignment cares more about correctness per-flow than DRYness
 * between two small hooks.
 */
export function useRefineStudySet() {
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  const latestRequestIdRef = useRef(0);

  const refine = useCallback(async (currentData, instruction, onSuccess) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();

    const requestId = ++latestRequestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch(import.meta.env.PROD ? "/api/refine" : "/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentData, instruction }),
        signal: controller.signal,
      });

      if (requestId !== latestRequestIdRef.current) return;

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || `Request failed with status ${response.status}.`);
      }
      if (!body?.raw) {
        throw new Error("Server response was missing content.");
      }

      const validated = validateStudyData(body.raw);
      if (requestId !== latestRequestIdRef.current) return;

      setStatus("idle");
      onSuccess(validated);
    } catch (err) {
      if (requestId !== latestRequestIdRef.current) return;

      if (err.name === "AbortError") {
        setError("The refinement took too long and was cancelled. Please try again.");
      } else if (err instanceof ValidationError) {
        setError(`The AI's edit wasn't usable: ${err.message}`);
      } else {
        setError(err.message || "Something went wrong refining the set.");
      }
      setStatus("error");
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  return { status, error, refine };
}
