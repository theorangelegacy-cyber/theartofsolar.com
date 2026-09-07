/**
 * First arrival for this tab only. Retain bounded campaign/click identifiers,
 * never full URLs with query strings, contact fields or referrer search terms.
 */
export type Arrival = {
  landing_path: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  gclid: string | null;
};
const KEY = "commercial_arrival_v1";
const SOURCES = new Set(["google", "bing", "yahoo", "duckduckgo", "facebook", "instagram", "linkedin", "youtube", "newsletter", "roofer", "referral"]);
const MEDIA = new Set(["organic", "cpc", "ppc", "paid", "paid_social", "social", "email", "referral", "qr"]);
function origin(value: string): string | null {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.origin : null;
  } catch { return null; }
}
function code(value: unknown, allowed: Set<string>): string | null {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  return allowed.has(normalized) ? normalized : null;
}
function campaign(value: unknown): string | null {
  return typeof value === "string" && /^[a-z][a-z0-9_-]{1,79}$/i.test(value) && !/\d{7}/.test(value) ? value : null;
}
function clickId(value: unknown): string | null {
  return typeof value === "string" && /^[a-z0-9_-]{20,200}$/i.test(value) ? value : null;
}
export function firstArrival(): Arrival {
  const fallback = { landing_path: "/", referrer: null, utm_source: null, utm_medium: null, utm_campaign: null, gclid: null };
  if (typeof window === "undefined") return fallback;
  const q = new URLSearchParams(window.location.search);
  const current: Arrival = {
    landing_path: window.location.pathname.slice(0, 400),
    referrer: origin(document.referrer),
    utm_source: code(q.get("utm_source"), SOURCES),
    utm_medium: code(q.get("utm_medium"), MEDIA),
    utm_campaign: campaign(q.get("utm_campaign")),
    gclid: clickId(q.get("gclid")),
  };
  try {
    const stored = window.sessionStorage.getItem(KEY);
    if (stored) {
      const saved = JSON.parse(stored) as Arrival;
      if (typeof saved.landing_path === "string" && /^\/[a-z0-9/_-]*$/i.test(saved.landing_path)) {
        return {
          landing_path: saved.landing_path.slice(0, 400),
          referrer: typeof saved.referrer === "string" ? origin(saved.referrer) : null,
          utm_source: code(saved.utm_source, SOURCES),
          utm_medium: code(saved.utm_medium, MEDIA),
          utm_campaign: campaign(saved.utm_campaign),
          gclid: clickId(saved.gclid),
        };
      }
    }
    window.sessionStorage.setItem(KEY, JSON.stringify(current));
  } catch { /* Blocked storage must never block a visitor. */ }
  return current;
}
