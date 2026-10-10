# `prometiam-risk-mcp`

> Model Context Protocol server for the **Prometiam company data API** — official company-registry data for Spain, France, the UK, Ireland, Poland, Norway, Finland, Sweden, Croatia, Belgium, Denmark, Estonia, Slovakia, Switzerland and the United States (state registers, SEC EDGAR, GLEIF), plus directors, corporate events, insolvency, VAT/LEI lookup, sanctions screening, annual financial statements, public-procurement awards (Spain, France, the UK, Ireland, Poland, Norway) and public-buyer risk scores (Spain, France), as native MCP tools for Claude Desktop, Cursor, Continue, Cline, and any MCP-compatible client.

[![npm version](https://img.shields.io/npm/v/prometiam-risk-mcp.svg)](https://www.npmjs.com/package/prometiam-risk-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-green)](https://www.prometiam.com/openapi.json)

## What you get

35 MCP tools that wrap the [Prometiam Risk API](https://www.prometiam.com/risk-api/docs):

| Tool | Description |
|---|---|
| `companies_search` | Search EU + UK companies by name, NIF (ES), SIREN/SIRET (FR), company_number (UK), organisation number (NO), Y-tunnus (FI), organisationsnummer (SE), MBS/OIB (HR), enterprise number (BE), CVR number (DK), or state registration number, CIK or LEI (US). |
| `company_detail` | Full company profile by Prometiam ID — officers, registry coordinates, capital, status. `include=risk_flags` attaches published tax-debt / debarment signals (ES). |
| `company_financials` | Annual financial statements as filed, mapped to one standard chart, in the filing currency and euro. GB, FR, DK, SE and NO, plus FI (statements filed digitally with PRH, the Finnish Patent and Registration Office: XBRL, the company's own accounts, about one filer in twenty, registered since July 2023, no employee count, profit before tax before appropriations; plus listed groups) US SEC filers (EDGAR XBRL annual reports, fiscal years from 2023) and listed companies only in ES, PL, HR and BE (their ESEF annual financial reports, IFRS, mostly consolidated; not every listed company's report is held, and Polish reports arrive more than a year late; Spanish listed companies' reports are available free of charge on the CNMV website); FR accounts keyed by INPI from the filed documents, none for companies that declare them confidential (about 45% of French filers); elsewhere digitally filed accounts only (GB iXBRL about three in four; DK most small companies report gross profit instead of revenue; SE iXBRL; NO last three approved accounts, no employee count); the last three fiscal years at launch; Scale plan and above (Starter, Professional and free trial keys: 10 calls a month). Finnish companies also return `tax_records`, the Finnish Tax Administration's public corporate income tax data (Verohallinto, CC BY 4.0) per tax year from 2020 (0 means none, not unknown). Not available for other companies there, nor for IE. Contains CVR data (Erhvervsstyrelsen), CC BY 4.0. Contains data from the Finnish Patent and Registration Office (PRH), CC BY 4.0. |
| `events_search` | Search normalized corporate events: capital changes, director changes, dissolutions, mergers, insolvency (ES, FR, GB from their gazettes; register-change events for FI, SE, BE, HR, DK, EE, SK, CH, US; none for IE, PL, NO). |
| `events_timeline` | Event history for one company, newest first. |
| `event_detail` | A single corporate-event record by ID, with before/after values and source notice. |
| `people_search` | Search officers / directors / shareholders by name across registries. |
| `person_detail` | Officer / director profile with full appointment history across companies. |
| `directors_network` | Cross-directorship rollup — people appointed to many companies (nominee/hub detection, ES). |
| `sanctions_screen` | Trigram-fuzzy match against 44,000+ active designations — five sanctions lists (EU consolidated, UN, OFAC, the UK Sanctions List (FCDO), French Registre des gels) plus 11 US export-control lists (BIS Entity List, Denied Persons, Unverified, MEU; State ITAR-Debarred, ISN; OFAC SSI, CMIC, MBS, PLC, CAPTA). Refreshed daily. `include_pep=true` adds a PEP block (beta, ES, national politicians only — no relatives or close associates). |
| `sanctions_entity` | Full detail for one sanctions entity by ID — aliases, programme, listing date. |
| `sanctions_changes` | Additions, removals and amendments detected on the sanctions lists, newest first — answer "what changed" without re-screening a whole book of business. |
| `sanctions_watchlist` | Your sanctions watchlists and any recent hits against them. Read-only; requires the `sanctions_watch` scope. |
| `sanctions_watch` | Add a name to your sanctions watchlist: re-screened on every list update, with an optional webhook. Requires the `sanctions_watch` scope. **Mutating.** |
| `sanctions_unwatch` | Remove one of your watchlist entries by id. **Mutating.** |
| `vat_validate` | Validate an EU VAT number against VIES (27 EU states + XI) — returns registered name/address when valid. |
| `lei_lookup` | Look up a Legal Entity Identifier in the GLEIF global register — legal name, jurisdiction, status, address. |
| `lei_search` | Resolve a company name to candidate LEIs (GLEIF full-text search). |
| `lei_relationships` | GLEIF Level-2 ownership: direct and ultimate parents/children of an LEI. |
| `insolvency_search` | Search insolvency / risk notices (bankruptcies, liquidations, judgments). |
| `insolvency_notices_search` | Corporate insolvency notices from official gazettes in FR, DE, GB, AT, CH, NO, FI, US, NL, DK, HR, SE — distress coverage in markets with no registry held. Corporate only; personal insolvency is never returned. |
| `companies_lookup` | Resolve up to 100 companies in one call by registry number, NIF, SIREN, VAT or name (best fuzzy match with match_score). Every item counts as one request; an over-quota batch is refused up front with `max_items_now`. |
| `sanctions_screen_batch` | Screen up to 50 names in one call (sanctions scope). Per-item status match / clear / error / timeout with the same hits as `sanctions_screen`. |
| `insolvency_check` | Check up to 100 counterparties for corporate insolvency notices in one call across FR, DE, GB, AT, CH, NO, FI, US, NL, DK, HR, SE; up to 5 notices per item plus latest_filing_date. |
| `insolvency_record` | A single insolvency / risk notice by ID, with related events. |
| `coverage` | Dataset coverage stats per country (companies, events, freshness). |
| `account` | Calling key's plan, rate limits, remaining quota, and scopes. |
| `monitor_list` | List companies subscribed to ongoing monitoring for this key. |
| `monitor_get` | One monitored company by ID, with its alert history. |
| `monitor_subscribe` | Subscribe a company to daily monitoring (status, dissolution, sanctions and, for ES and FI/SE/BE/HR/DK/EE/SK/CH/US, corporate events → signed webhook). ES, IE, PL, FI, SE, BE, HR, DK, EE, SK, CH and US only. **Mutating.** |
| `monitor_stop` | Stop monitoring a company and delete the subscription. **Mutating.** |
| `procurement_awards` | Public-contract awards from Spain, France, the UK, Ireland, Poland and Norway by supplier, buyer, identifier, CPV code or date, one row per award to one supplier, linked to the supplier's registry record where the identifier resolves (ES, FR, GB). Ireland, Poland and Norway above the EU thresholds only. |
| `procurement_buyer` | Risk profile of a public buyer (the contracting body) in Spain or France — **beta**. Two calibrated scores: single-bid risk and supplier-insolvency exposure, each with a 1-10 score, a probability and the evidence awards. Never a supplier score. |
| `procurement_buyers` | List scored public buyers by either score — a portfolio screen, a region view, or a name lookup to find a buyer's id. Beta, ES + FR. |
| `procurement_relationship` | How dependent a public buyer and one of its five largest suppliers are on each other: awards, value, share, single-bid count, insolvency date. Beta, ES + FR. |

Source: Spain (BORME), France (BODACC), United Kingdom (Companies House), Ireland (CRO), Poland (KRS), Norway (Brønnøysundregistrene / Enhetsregisteret, NLOD), Finland (Kaupparekisteri), Sweden (Bolagsverket), Croatia (Sudski registar), Belgium (KBO/BCE), Denmark (CVR), Estonia (e-Business Register), Slovakia (RPO), Switzerland (Zefix), and in the United States the New York, Colorado, Connecticut and Pennsylvania state registers, SEC EDGAR and GLEIF — 33M+ companies. Daily updates for Spain, France, Ireland, Poland and Norway, monthly bulk plus daily delta for the UK, every working day for Finland, Sweden, Belgium, Denmark, Croatia, Estonia and Slovakia, and weekly for the United States. EU data residency.

Officer/director data is held for Spain, France, the UK and Norway. Ireland and Poland are company-level for now. Norway has no corporate-event stream, so the event tools return nothing for `country=NO` (nor for IE and PL). Finland, Sweden, Belgium, Croatia, Denmark, Estonia, Slovakia, Switzerland and the United States are company records only, with register-change events (name, status, legal form and registered address; share capital for Croatia; dated when the change first appears in the register data (for the United States, the weekly read of the registers that first sees it), not gazette notices, none before 2026-09-30) and monitoring, but no officers and no registry-compliance signal. Corporate insolvency notices are linked by business ID (Finland), organisationsnummer (Sweden), MBS (Croatia), CVR number (Denmark) and UID (Switzerland, where the SHAB notice names the debtor's UID): Swedish notices are Bolagsverket's procedure data (konkurs, företagsrekonstruktion, ackordsförhandling), updated weekly, with no court, case number or link; Croatian notices are court decisions with court and case number where the register states them, only for companies still on the register; Danish notices come from CVR credit information (konkurs and tvangsakkord): one notice per proceeding, dated by the decision that opened it, with the latest stage of the proceeding, with no court or case number. Belgium, Estonia and Slovakia have no insolvency notices (their bankruptcy shows in the company status and in their register-change events). Sole traders (enskild näringsverksamhet, trgovac pojedinac), enterprises of natural persons (eenmanszaak / entreprise individuelle), sole proprietorships (enkeltmandsvirksomhed) and estates are never served; Denmark has no share capital, and its status includes the register's bankruptcy state. Switzerland has no activity code, and its sole proprietorships and other natural persons are never served. Every company object carries `vat_number` and `vat_number_source` (published by the register, or built from the identifier by rule where the registration is not confirmed; null for the UK, Ireland, Slovakia and the United States). United States (country=US): company records from the business registers of New York, Colorado, Connecticut and Pennsylvania (state open data) plus SEC filers (EDGAR) and LEI holders (GLEIF) from every state, Delaware included, as one record per state registration (NY-4424185, CIK-0000320193, LEI-…); New York and Pennsylvania active entities only; updated weekly; no officers and no registry-compliance signal, with register-change events (dated by the weekly read) and monitoring; no VAT number; US insolvency notices are not linked to the company records; sole proprietorships never served; not every US company. US sources: New York Department of State, Colorado Secretary of State, Connecticut Secretary of the State, Pennsylvania Department of State (open data), SEC EDGAR, GLEIF (CC0). Contains CVR data (Erhvervsstyrelsen), CC BY 4.0. Source: Zefix, Federal Office of Justice, Federal Commercial Registry Office (open use, source required); restructured by Prometiam, not a certified register extract.

## Install

```bash
npx -y prometiam-risk-mcp   # one-shot run, no install needed
# or
npm install -g prometiam-risk-mcp   # global install for the bin
```

## Configure

**It works without any key.** The server ships with a shared demo key — 30 requests a minute and 2,000 a day for everyone using it — so the first tool call answers right after `npx`. When the shared quota is used up the error tells you how to continue.

For your own quota — **14-day free trial: 1,000 calls; a card is required, nothing is charged for 14 days** — sign up at <https://www.prometiam.com/signup?utm_source=mcp> and set the key as an environment variable:

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

Restart Claude Desktop. The 35 tools appear in the tool list. Try:

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
| `PROMETIAM_API_KEY` | No — the shared demo key is used without it | — |
| `PROMETIAM_BASE_URL` | No | `https://api.prometiam.com/functions/v1/risk-api` |

## Smoke test

Once installed and configured, you can verify the server lists tools without spinning up an MCP client:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | PROMETIAM_API_KEY=rk_live_... npx -y prometiam-risk-mcp
```

You should see a JSON-RPC response with all 35 tools and their schemas.

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
- Mostly read-only. The only mutating tools are `monitor_subscribe` and `monitor_stop` (create/delete a monitoring subscription tied to your key); every other tool is read-only.

## Source

This package is open source under the MIT license. The Risk API itself is a commercial service — see <https://www.prometiam.com/mcp> for the install page, or <https://www.prometiam.com> for terms.

- API documentation: <https://www.prometiam.com/risk-api/docs>
- OpenAPI 3.0 spec: <https://www.prometiam.com/openapi.json>
- Pricing: <https://www.prometiam.com/pricing>
- Support: <https://www.prometiam.com/contact>

## License

MIT © Prometiam
