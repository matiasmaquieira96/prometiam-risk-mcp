# `prometiam-risk-mcp`

> Model Context Protocol server for the **Prometiam company data API** — official company-registry data for Spain, France, the UK, Ireland, Poland and Norway, plus directors, corporate events, insolvency, VAT/LEI lookup and sanctions screening, as native MCP tools for Claude Desktop, Cursor, Continue, Cline, and any MCP-compatible client.

[![npm version](https://img.shields.io/npm/v/prometiam-risk-mcp.svg)](https://www.npmjs.com/package/prometiam-risk-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-green)](https://www.prometiam.com/openapi.json)

## What you get

30 MCP tools that wrap the [Prometiam Risk API](https://www.prometiam.com/risk-api/docs):

| Tool | Description |
|---|---|
| `companies_search` | Search EU + UK companies by name, NIF (ES), SIREN/SIRET (FR), company_number (UK), or organisation number (NO). |
| `company_detail` | Full company profile by Prometiam ID — officers, registry coordinates, capital, status. `include=risk_flags` attaches published tax-debt / debarment signals (ES). |
| `events_search` | Search normalized corporate events: capital changes, director changes, dissolutions, mergers, insolvency. |
| `events_timeline` | Chronological event history for one company (oldest first). |
| `event_detail` | A single corporate-event record by ID, with before/after values and source notice. |
| `people_search` | Search officers / directors / shareholders by name across registries. |
| `person_detail` | Officer / director profile with full appointment history across companies. |
| `directors_network` | Cross-directorship rollup — people appointed to many companies (nominee/hub detection, ES). |
| `sanctions_screen` | Trigram-fuzzy match against 44,000+ active designations — five sanctions lists (EU consolidated, UN, OFAC, UK OFSI, French Registre des gels) plus 11 US export-control lists (BIS Entity List, Denied Persons, Unverified, MEU; State ITAR-Debarred, ISN; OFAC SSI, CMIC, MBS, PLC, CAPTA). Refreshed daily. `include_pep=true` adds a PEP block (beta, ES, national politicians only — no relatives or close associates). |
| `sanctions_entity` | Full detail for one sanctions entity by ID — aliases, programme, listing date. |
| `sanctions_changes` | Additions, removals and amendments detected on the sanctions lists, newest first — answer "what changed" without re-screening a whole book of business. |
| `sanctions_watchlist` | Your sanctions watchlists and any recent hits against them. Read-only; requires the `sanctions_watch` scope. |
| `vat_validate` | Validate an EU VAT number against VIES (27 EU states + XI) — returns registered name/address when valid. |
| `lei_lookup` | Look up a Legal Entity Identifier in the GLEIF global register — legal name, jurisdiction, status, address. |
| `lei_search` | Resolve a company name to candidate LEIs (GLEIF full-text search). |
| `lei_relationships` | GLEIF Level-2 ownership: direct and ultimate parents/children of an LEI. |
| `insolvency_search` | Search insolvency / risk notices (bankruptcies, liquidations, judgments). |
| `insolvency_notices_search` | Corporate insolvency notices from official gazettes in FR, DE, GB, AT, CH, NO, FI, US — distress coverage in markets with no registry held. Corporate only; personal insolvency is never returned. |
| `insolvency_record` | A single insolvency / risk notice by ID, with related events. |
| `notice_detail` | Registry gazette PDF metadata: edition, parse status, hash, raw text. |
| `coverage` | Dataset coverage stats per country (companies, events, freshness). |
| `account` | Calling key's plan, rate limits, remaining quota, and scopes. |
| `monitor_list` | List companies subscribed to ongoing monitoring for this key. |
| `monitor_get` | One monitored company by ID, with its alert history. |
| `monitor_subscribe` | Subscribe a company to daily monitoring (events/status/sanctions → signed webhook). ES, IE and PL only. **Mutating.** |
| `monitor_stop` | Stop monitoring a company and delete the subscription. **Mutating.** |
| `prospect_companies_search` | Search companies by firmographics — sector group, NACE code, company age, employee band — for ICP / prospect-list building. |
| `prospect_people_search` | Find contactable decision-makers (officers ES/FR, PSC owners GB) by seniority, department, and contact-route availability. Compliance-safe. |
| `prospect_company_contacts` | Compliance-safe contact routes (role/company emails, phone, website, LinkedIn) published by the organisation. Suppression-filtered. |
| `prospect_suppress` | Add an email/domain/LinkedIn/phone/person/company to the prospecting opt-out list (GDPR). **Mutating.** |

Source: Spain (BORME), France (BODACC), United Kingdom (Companies House), Ireland (CRO), Poland (KRS), Norway (Brønnøysundregistrene / Enhetsregisteret, NLOD) — 26M+ companies. Daily updates. EU data residency.

Officer/director data is held for Spain, France, the UK and Norway. Ireland and Poland are company-level for now. Norway has no corporate-event stream, so the event tools return nothing for `country=NO`.

## Install

```bash
npx -y prometiam-risk-mcp   # one-shot run, no install needed
# or
npm install -g prometiam-risk-mcp   # global install for the bin
```

## Configure

You need a Prometiam API key. **Free tier: 1,000 calls/month, no credit card.** Sign up at <https://www.prometiam.com/signup>.

Set it as an environment variable:

```bash
export PROMETIAM_API_KEY="rk_live_..."
```

## Use with Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "prometiam-risk": {
      "command": "npx",
      "args": ["-y", "prometiam-risk-mcp"],
      "env": {
        "PROMETIAM_API_KEY": "rk_live_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. The 30 tools appear in the tool list. Try:

> "What's the Prometiam coverage today?"
> "Search for companies named Mercadona in Spain."
> "Run a sanctions screen on the name Juan Perez at threshold 85."
> "Build a corporate-event timeline for Inditex."

## Use with Cursor

Edit `.cursor/mcp.json` in your project (or globally at `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "prometiam-risk": {
      "command": "npx",
      "args": ["-y", "prometiam-risk-mcp"],
      "env": {
        "PROMETIAM_API_KEY": "rk_live_your_key_here"
      }
    }
  }
}
```

## Use with Continue

Add to `~/.continue/config.json` under `experimental.modelContextProtocolServers`:

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "prometiam-risk-mcp"],
          "env": { "PROMETIAM_API_KEY": "rk_live_your_key_here" }
        }
      }
    ]
  }
}
```

## Use with any other MCP client

Anything that speaks MCP over stdio works. Run the binary with `PROMETIAM_API_KEY` set in the environment. JSON-RPC requests on stdin, responses on stdout, logs on stderr.

## Environment variables

| Variable | Required | Default |
|---|---|---|
| `PROMETIAM_API_KEY` | **Yes** | — |
| `PROMETIAM_BASE_URL` | No | `https://api.prometiam.com/functions/v1/risk-api` |

## Smoke test

Once installed and configured, you can verify the server lists tools without spinning up an MCP client:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | PROMETIAM_API_KEY=rk_live_... npx -y prometiam-risk-mcp
```

You should see a JSON-RPC response with all 30 tools and their schemas.

## Rate limits & pricing

Per Prometiam tier (returned in every response's `meta.rate_limit`):

| Tier | Price | Calls/month | Daily cap | RPM |
|---|---|---|---|---|
| Free | €0 | 1,000 | 200 | 10 |
| Starter | €9.99 | 10,000 | 2,000 | 60 |
| Professional | €29.99 | 100,000 | 20,000 | 300 |
| Scale | €99.99 | 1,000,000 | 200,000 | 600 |
| Enterprise | Custom | Custom | Custom | Custom |

## Privacy and data residency

- All requests hit the Prometiam Risk API in **EU** (AWS eu-central-1, Frankfurt).
- The MCP server adds **no telemetry of its own** — it just forwards requests to the API.
- Officer data is processed under GDPR Article 6(1)(c) (legal obligation of public registries) and 6(1)(f) (legitimate interest in fraud prevention).
- Mostly read-only. The only mutating tools are `monitor_subscribe` and `monitor_stop` (create/delete a monitoring subscription tied to your key) and `prospect_suppress` (adds a GDPR opt-out); every other tool is read-only.

## Source

This package is open source under the MIT license. The Risk API itself is a commercial service — see <https://www.prometiam.com> for terms.

- API documentation: <https://www.prometiam.com/risk-api/docs>
- OpenAPI 3.0 spec: <https://www.prometiam.com/openapi.json>
- Pricing: <https://www.prometiam.com/pricing>
- Support: <https://www.prometiam.com/contact>

## License

MIT © Prometiam
