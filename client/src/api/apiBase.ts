// Deliberately import-free. http.ts also exports apiUrl/API_BASE_URL (most
// call sites import them from there), but auth.ts must import directly from
// *this* file instead of from http.ts — http.ts imports authStore.ts, which
// imports auth.ts, which used to import apiUrl back from http.ts, closing a
// three-module cycle (http -> authStore -> auth -> http). Whichever module
// the app's dependency graph happens to reach first, the cycle forces the
// other two to start evaluating before their own top-level code has run,
// so auth.ts's `const BASE_URL = apiUrl('/api/auth')` was reading
// API_BASE_URL before http.ts had assigned it - undefined, silently baked
// into BASE_URL for the rest of that page load. This module has no imports
// of its own, so nothing in that cycle can reach it prematurely.

// Empty by default: every fetch call and rendered /uploads/* path stays a
// root-relative URL, which resolves against the frontend's own origin — the
// Vite dev proxy (vite.config.ts) and the client container's nginx.conf
// both forward those to the API from there. Only set VITE_API_BASE_URL
// (build-time — Vite bakes it in via import.meta.env) when the frontend is
// deployed separately from the API, e.g. the Render frontend service
// pointed at the Render API's own origin.
//
// Guards against more than just "unset": `?? ''` alone only catches the JS
// values null/undefined, not a platform env var whose value is literally
// the 4-character string "undefined" (e.g. left over from clearing a
// dashboard field, or a broken template substitution upstream) - that
// string is truthy and passes `?? ''` right through, silently producing
// request URLs like "/undefined/api/...". Treat that string, and blank/
// whitespace-only values, the same as unset.
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
export const API_BASE_URL =
  rawApiBaseUrl && rawApiBaseUrl !== 'undefined' ? rawApiBaseUrl : ''

// Prefixes a root-relative API or /uploads/* path with API_BASE_URL. A
// no-op locally/in docker-compose, where API_BASE_URL is empty.
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}
