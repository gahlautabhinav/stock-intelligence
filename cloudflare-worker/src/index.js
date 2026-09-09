// stock-intel relay — Cloudflare Worker
//
// Receives {action, entry} from the morning/evening cloud agents and writes the
// briefing JSON to GitHub. Exists because Anthropic's cloud-agent egress proxy
// returns 403 on writes to api.github.com (reads are fine).
//
// Secrets (never in this file — set via `wrangler secret put`):
//   GITHUB_PAT    fine-grained PAT, this repo only, Contents: Read and write
//   RELAY_SECRET  shared secret; callers must send it as the X-Relay-Secret header
//
// Unlike the Pipedream original there is no response-mode setting to get wrong:
// returning a Response IS the response.

const REPO = "gahlautabhinav/stock-intelligence";
const GH = `https://api.github.com/repos/${REPO}`;

const json = (status, body) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return json(405, { ok: false, error: "POST only" });
    }

    // Constant-time-ish comparison. The endpoint can write to the repo, so it is
    // a credential surface: reject before doing any work or touching the token.
    const supplied = request.headers.get("x-relay-secret") || "";
    const expected = env.RELAY_SECRET || "";
    if (!expected || supplied.length !== expected.length || supplied !== expected) {
      return json(403, { ok: false, error: "forbidden" });
    }

    if (!env.GITHUB_PAT) {
      return json(500, { ok: false, error: "GITHUB_PAT secret not set on the Worker" });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json(400, { ok: false, error: "body is not valid JSON" });
    }
    const { entry, action } = payload || {};

    const HDR = {
      Authorization: `Bearer ${env.GITHUB_PAT}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      "User-Agent": "stock-intel",
    };

    // GitHub returns the PAT's own expiry on every authenticated response:
    //   Github-Authentication-Token-Expiration: 2026-10-07 18:23:11 UTC
    // Nothing hardcoded, so this stays correct across rotations with no maintenance.
    let tokenExp = null;
    const noteExp = (r) => {
      const v = r.headers.get("github-authentication-token-expiration");
      if (v) tokenExp = v;
    };
    const daysLeft = () =>
      tokenExp
        ? Math.floor(
            (Date.parse(tokenExp.replace(" UTC", "Z").replace(" ", "T")) - Date.now()) / 86400000
          )
        : null;

    // Briefings contain ₹, em-dashes and emoji, so the base64 must be UTF-8 safe.
    // btoa() alone throws on any codepoint > 255; TextEncoder/TextDecoder are the
    // portable way to bridge that (no deprecated unescape/escape).
    const b64encode = (obj) => {
      const bytes = new TextEncoder().encode(JSON.stringify(obj));
      let bin = "";
      for (const b of bytes) bin += String.fromCharCode(b);
      return btoa(bin);
    };
    const b64decode = (content) => {
      const bin = atob(content.replace(/\s/g, ""));
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    };

    class GhError extends Error {
      constructor(status, msg) {
        super(msg);
        this.status = status;
      }
    }

    // Authenticated read: never CDN-cached, and returns content AND sha in one call.
    async function ghGet(path) {
      const r = await fetch(`${GH}/${path}?ref=main`, { headers: HDR });
      noteExp(r);
      if (r.status === 404) return null;
      if (!r.ok) throw new GhError(502, `GET ${path} -> ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return r.json();
    }

    async function ghPut(path, message, obj, sha) {
      const body = {
        message,
        branch: "main",
        content: b64encode(obj),
        ...(sha ? { sha } : {}),
      };
      const r = await fetch(`${GH}/${path}`, {
        method: "PUT",
        headers: HDR,
        body: JSON.stringify(body),
      });
      noteExp(r);
      if (!r.ok) throw new GhError(502, `PUT ${path} -> ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return (await r.json()).commit.sha;
    }

    const ok = (body) => json(200, { ok: true, ...body, token_expires: tokenExp, token_days_left: daysLeft() });

    try {
      if (action === "test") {
        // Read-only probe used by the rotation runbook. Writes nothing.
        const r = await fetch(GH, { headers: HDR });
        noteExp(r);
        if (!r.ok) throw new GhError(502, `token check -> ${r.status}: ${(await r.text()).slice(0, 200)}`);
        return ok({ action: "test", repo_status: r.status });
      }

      if (!entry?.date) {
        return json(400, { ok: false, action: action ?? null, error: `bad payload: missing entry.date (action=${action})` });
      }
      const DATE = entry.date;
      const FILE = `contents/data/${DATE}.json`;

      if (action === "morning") {
        const existing = await ghGet(FILE); // present on a rerun -> pass sha instead of 422
        const day = await ghPut(FILE, `Morning briefing ${DATE}`, entry, existing?.sha);

        const im = await ghGet("contents/data/index.json");
        const idx = im ? JSON.parse(b64decode(im.content)) : [];
        let index = "skipped";
        if (!idx.includes(DATE)) {
          idx.push(DATE);
          idx.sort();
          index = await ghPut("contents/data/index.json", `index: add ${DATE}`, idx, im?.sha);
        }
        return ok({ action, date: DATE, day, index });
      }

      if (action === "eod") {
        const existing = await ghGet(FILE);
        if (!existing) {
          return json(404, { ok: false, action, date: DATE, error: `no morning file for ${DATE} - cannot apply EOD update` });
        }
        const day = await ghPut(FILE, `EOD update ${DATE}`, entry, existing.sha);
        return ok({ action, date: DATE, day });
      }

      return json(400, { ok: false, action: action ?? null, error: `unknown action: ${action}` });
    } catch (e) {
      return json(e.status || 500, {
        ok: false,
        action: action ?? null,
        date: entry?.date ?? null,
        error: String(e.message).slice(0, 300),
      });
    }
  },
};
