# stock-intel relay (Cloudflare Worker)

Receives `{action, entry}` from the morning/evening cloud agents and writes the briefing
JSON to this repo. Replaces the Pipedream relay.

## Why a relay exists at all

Anthropic's cloud-agent egress proxy returns 403 on **writes** to `api.github.com`
(reads are fine). The agents therefore POST here, and this Worker does the write with a
PAT that never leaves Cloudflare.

## Why this replaced Pipedream

- **No response-mode setting.** Pipedream's `$.respond()` is inert until a UI dropdown is
  flipped, which silently turned every response into `<p><b>Success!</b></p>`. Here,
  returning a `Response` *is* the response — the failure mode cannot exist.
- **No credit meter.** 100k requests/day free vs ~2/day used.
- **It is in git.** The Pipedream workflow lived only in a web UI.

## Deploy

```bash
cd cloudflare-worker
npx wrangler login
npx wrangler secret put GITHUB_PAT      # fine-grained PAT, this repo only, Contents: R+W
npx wrangler secret put RELAY_SECRET    # shared secret the agents send
npx wrangler deploy
```

Secrets are encrypted at rest and are never in this repo. Do **not** add a `[vars]`
block for either — that would commit them in plaintext.

## Verify (writes nothing)

```bash
curl -sS -X POST https://<worker>.workers.dev \
  -H 'Content-Type: application/json' \
  -H "X-Relay-Secret: $RELAY_SECRET" \
  -d '{"action":"test"}'
```

Expect `{"ok":true,"action":"test","repo_status":200,"token_days_left":29}`.
`token_days_left` near 29 after a rotation confirms the *new* token is live.

Without the header, expect `403 {"ok":false,"error":"forbidden"}`.

## API

| action | Does | Success |
|---|---|---|
| `test` | Read-only token probe | `200 {ok:true, repo_status, token_days_left}` |
| `morning` | Writes `data/<date>.json`, appends `data/index.json` | `200 {ok:true, day, index}` |
| `eod` | Overwrites `data/<date>.json` with actuals | `200 {ok:true, day}` |

Failures return a non-2xx with `{ok:false, error}`: `403` bad/missing secret, `400` bad
payload or unknown action, `404` EOD with no morning file, `502` GitHub rejected the call
(the GitHub message is included), `500` `GITHUB_PAT` not set.

## Notes

- `index.json` is read through the authenticated Contents API rather than
  `raw.githubusercontent.com` — the CDN is ~5min stale and once caused duplicate
  `index: add` commits. The authenticated read also returns the `sha` in the same call.
- `morning` does a `ghGet` before its `PUT` so a rerun supplies a sha instead of 422ing.
- Base64 goes through `TextEncoder`, not `btoa` alone — briefings contain `₹`, em-dashes
  and emoji, and bare `btoa` throws on any codepoint above 255.
- The agents do **not** trust this Worker's reply. They read the file back from
  `api.github.com` and alert only if it genuinely did not land. The response body is used
  only for `token_days_left`.

## Tests

`scratchpad/test_worker.mjs` runs the handler against a mocked GitHub API — auth, payload
validation, morning/rerun/index cases, EOD, token expiry telemetry, and UTF-8 round-trip.
No network and no real token required.
