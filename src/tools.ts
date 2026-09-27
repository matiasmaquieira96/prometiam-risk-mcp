/**
 * MCP tool definitions for the Prometiam company data API.
 *
 * Each tool wraps one Risk API endpoint, with zod-validated input schemas
 * that get auto-converted to JSON Schema in the MCP tools/list response.
 *
 * Source of truth: public/openapi.json at https://www.prometiam.com/openapi.json
 */

import { z } from 'zod'
import { DEMO_NOTE, getClient, RiskApiError } from './client.js'

const Country = z.enum(['ES', 'FR', 'GB', 'IE', 'PL', 'NO']).describe('Country code: ES (Spain, BORME), FR (France, BODACC), GB (UK, Companies House), IE (Ireland, CRO), PL (Poland, KRS), or NO (Norway, Brønnøysundregistrene / Enhetsregisteret). Ireland and Poland are company-level (companies only). Norway has companies and officers but no corporate-event stream, so the event tools return nothing for NO. Defaults to first country in the API key allowlist.')

/**
 * Monitoring covers a NARROWER set than the registry corpus — see the
 * `/monitor` request body in public/openapi.json, which pins country to
 * ES/IE/PL. Norway, France and the UK have no monitoring implementation, so
 * they must not be offered here: an accepted value the API cannot honour is a
 * false capability, not a convenience.
 */
const MonitorCountry = z.enum(['ES', 'IE', 'PL']).describe('Country of the company to monitor: ES (default), IE, or PL. Monitoring is not available for the other registry countries.')

const Limit = z.number().int().min(1).max(100).default(20).describe('Maximum number of results to return (1–100, default 20).')
const Cursor = z.string().optional().describe('Pagination cursor — pass the previous response\'s pagination.next_cursor to fetch the next page.')

export interface ToolDef {
  name: string
  description: string
  /** zod object schema for arguments. */
  schema: z.ZodObject<z.ZodRawShape>
  /** Async handler returning the JSON-serializable result. */
  handler: (args: Record<string, unknown>) => Promise<unknown>
}

/** Idempotency-Key rides as a header, never as a body field — strip it from `args` at each
 *  batch tool's handler and pass it through here. */
function idempotencyHeader(key: unknown): Record<string, string> | undefined {
  return typeof key === 'string' && key.length > 0 ? { 'Idempotency-Key': key } : undefined
}

let demoNoteShown = false

/** Convert any thrown RiskApiError into a clean text response for the MCP client. On the shared
 *  demo key, the first successful result carries a one-time note on getting a personal key. */
async function safeCall(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    const result = await fn()
    if (!demoNoteShown && getClient().isDemo && result && typeof result === 'object' && !Array.isArray(result)) {
      demoNoteShown = true
      return { ...(result as Record<string, unknown>), demo_key_note: DEMO_NOTE }
    }
    return result
  } catch (err) {
    if (err instanceof RiskApiError) {
      return {
        error: {
          code: err.code,
          message: err.message,
          status: err.status,
          retry_after_seconds: err.retryAfter,
        },
      }
    }
    const e = err as Error
    return { error: { code: 'unknown_error', message: e.message ?? String(err) } }
  }
}

export const TOOLS: ToolDef[] = [
  // ── Companies ────────────────────────────────────────────────────────────
  {
    name: 'companies_search',
    description: 'Search EU + UK companies in official registries by name or identifier. Returns companies with legal form, capital, status, registry coordinates, plus a cross-country status_canonical/stage and legal_form_canonical/abbreviation/family next to each register\'s own status/legal_form (null when the dictionary does not recognise the stored value — never a guess). Use country to scope the search to Spain (BORME), France (BODACC), the UK (Companies House), Ireland (CRO), Poland (KRS), or Norway (Brønnøysundregistrene). Fuzzy name results carry a match_score (0–100) and are ranked by relevance, best first. NOTE: "dissolved" means different things by country — ES/FR still exists pending liquidation, GB/IE/PL/NO no longer exists — read status_canonical, not status, to compare across countries.',
    schema: z.object({
      name: z.string().optional().describe('Company name — fuzzy normalized match.'),
      // 'nif' was removed here because handleCompaniesSearch did not read it. It does now
      // (risk-api dc4b37b5, 2026-08-30): nif and vat are aliases for company_number. Keeping
      // it absent was not neutral -- the only working field was labelled "UK Companies House
      // number", so a model holding a Spanish NIF was steered away from the one parameter
      // that would have answered it.
      nif: z.string().optional().describe('Spanish NIF/CIF — exact match, e.g. A78053147. Alias of company_number.'),
      vat: z.string().optional().describe('VAT / tax identifier — exact match. Alias of company_number.'),
      siren: z.string().optional().describe('French SIREN (9 digits), e.g. 552032534.'),
      siret: z.string().optional().describe('French SIRET (14 digits).'),
      nip: z.string().optional().describe('Polish NIP (10 digits), exact match — use with country PL. The KRS number goes on company_number.'),
      regon: z.string().optional().describe('Polish REGON (9 or 14 digits), exact match — use with country PL.'),
      // Resolves per country: NIF for ES, SIREN for FR, registration number for GB/IE/PL/NO.
      // Describing it as UK-only was wrong and cost real lookups.
      company_number: z.string().optional().describe('Registry identifier — exact match. Resolves per country: Spanish NIF/CIF (A78053147), French SIREN, UK Companies House number (00445790, SC123456), or the IE/PL/NO registration number.'),
      has_risk_flag: z.boolean().optional().describe('Spain only. Return only companies carrying a published risk flag (currently the AEAT >€600,000 tax-debtor list).'),
      risk_flag_type: z.enum(['tax_debt', 'debarment', 'regulator_sanction', 'subsidy', 'registry_compliance']).optional().describe('Restrict to one flag type. registry_compliance also works for GB, IE and NO.'),
      status_canonical: z.enum([
        'active', 'active_strike_off_pending', 'suspended', 'not_yet_active',
        'in_restructuring', 'in_administration', 'in_receivership', 'insolvent',
        'in_liquidation_insolvent', 'in_liquidation', 'in_compulsory_liquidation',
        'in_dissolution', 'deregistered', 'merged', 'withheld',
      ]).optional().describe('Filter by the cross-country canonical status rather than each country\'s own vocabulary. Works for all six countries, but outside ES it must be combined with a name/company_number/siren/siret/nip/regon.'),
      country: Country.optional(),
      limit: Limit,
      cursor: Cursor,
    }),
    handler: (args) => safeCall(() => getClient().get('/companies/search', args)),
  },
  {
    name: 'company_detail',
    description: 'Fetch a single company by Prometiam internal ID. Returns full profile including officers, registry coordinates, founding date, capital, current status (with status_canonical/stage) and legal form (with legal_form_canonical/abbreviation/family). recent_events (ES/FR/GB) carries the same served event_type + raw act_type as events_search. Get an ID from companies_search first. Pass include to attach extra blocks — notably risk_flags (published tax-debt / debarment signals) and insolvency.',
    schema: z.object({
      id: z.union([z.number().int(), z.string()]).describe('Prometiam internal company ID (integer).'),
      country: Country.optional(),
      include: z.string().optional().describe('Comma-separated extra blocks: procurement, insolvency, lei, prospect, risk_flags — or all. risk_flags is Spain only and each row states whether its identifier was read directly from the source or reconstructed with name corroboration.'),
    }),
    handler: (args) => safeCall(() => {
      const { id, ...rest } = args
      return getClient().get(`/companies/${id}`, rest)
    }),
  },

  // ── Corporate events ─────────────────────────────────────────────────────
  {
    name: 'events_search',
    description: 'Search normalized corporate-event records (capital changes, director changes, dissolutions, mergers, insolvency, name changes, etc.) by company or date range, for Spain, France and the UK. Returns events with a served event_type matching this enum for all three countries (each row also carries act_type, the raw BORME/BODACC/Companies House code it was derived from, or null when not yet covered), event date, before/after values, and source notice URL. Norway publishes no corporate-event gazette; Ireland and Poland are company-level only (no event stream) — those three return an empty list.',
    schema: z.object({
      company_name: z.string().optional().describe('Company name — fuzzy match.'),
      company_number: z.string().optional().describe('Registry registration number — exact match.'),
      event_type: z.string().optional().describe('One of dissolution, director_change, capital_change, new_incorporation, name_change, address_change, liquidation, merger, demerger, status_change, insolvency — or a raw register code kept as an alias (e.g. GB\'s OFFICER_CHANGE).'),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Filter events on or after this date (YYYY-MM-DD).'),
      date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Filter events on or before this date (YYYY-MM-DD).'),
      country: Country.optional(),
      limit: Limit,
      cursor: Cursor,
    }),
    handler: (args) => safeCall(() => getClient().get('/company-events/search', args)),
  },
  {
    name: 'events_timeline',
    description: 'Returns the event history for one company, newest first. Useful for building lifecycle timelines from incorporation through capital changes, director appointments, and dissolution. One of company_number or company_name is required.',
    schema: z.object({
      company_number: z.string().optional().describe('Registry number — exact match (recommended).'),
      company_name: z.string().optional().describe('Company name — fuzzy match.'),
      country: Country.optional(),
      limit: z.number().int().min(1).max(200).default(50).describe('Maximum events to return (1–200, default 50).'),
    }),
    handler: (args) => safeCall(() => getClient().get('/company-events/timeline', args)),
  },
  {
    name: 'event_detail',
    description: 'Fetch a single corporate-event record by Prometiam internal ID, with its full before/after values and the source registry notice. Get an ID from events_search or events_timeline first.',
    schema: z.object({
      id: z.union([z.number().int(), z.string()]).describe('Prometiam internal company-event ID.'),
    }),
    handler: (args) => safeCall(() => getClient().get(`/company-events/records/${args.id}`)),
  },

  // ── People ───────────────────────────────────────────────────────────────
  {
    name: 'people_search',
    description: 'Search officers / directors / shareholders by name across EU + UK registries. Returns matching people with their appointment counts, ranked by a fuzzy-match match_score (0–100), best first. Use person_detail for a full appointment history. Scope with country — officer-level data is held for Spain, France, the UK and Norway; Ireland and Poland are company-level only.',
    schema: z.object({
      name: z.string().min(2).describe('Person name — normalized pattern match (min 2 characters).'),
      country: Country.optional(),
      limit: Limit,
      cursor: Cursor,
    }),
    handler: (args) => safeCall(() => getClient().get('/people/search', args)),
  },
  {
    name: 'person_detail',
    description: 'Fetch a single person (officer / director) by Prometiam internal ID. Returns the person\'s full appointment history across all companies. Useful for director-network analysis and counterparty due diligence. Get the ID from a company_detail or people_search response.',
    schema: z.object({
      id: z.union([z.number().int(), z.string()]).describe('Prometiam internal person ID (integer).'),
    }),
    handler: (args) => safeCall(() => getClient().get(`/people/${args.id}`)),
  },
  {
    name: 'directors_network',
    description: 'List directors/officers who sit on many companies (cross-directorship rollup), optionally filtered by name. Useful for spotting nominee directors and network hubs in due diligence. Currently Spain (ES) only; other countries return an empty set with a notice.',
    schema: z.object({
      name: z.string().min(3).optional().describe('Director name filter — trigram match (min 3 characters).'),
      min_companies: z.number().int().min(2).max(100).default(5).describe('Only return people appointed to at least this many companies (2–100, default 5).'),
      legal_entities: z.boolean().default(false).describe('If true, include corporate directors (legal entities) instead of only natural persons.'),
      country: Country.optional(),
      limit: z.number().int().min(1).max(200).default(50).describe('Maximum results (1–200, default 50).'),
      offset: z.number().int().min(0).default(0).describe('Result offset for pagination.'),
    }),
    handler: (args) => safeCall(() => getClient().get('/directors/network', args)),
  },

  // ── Sanctions ────────────────────────────────────────────────────────────
  {
    name: 'sanctions_screen',
    description: 'Screen a person or entity name against 44,000+ active sanctions and export-control designations with trigram fuzzy match. Covers five sanctions lists — EU consolidated, UN, OFAC, UK OFSI, and the French Registre des gels — plus 11 US export-control lists (BIS Entity List, Denied Persons, Unverified, Military End User; State ITAR-Debarred and Nonproliferation; OFAC SSI, CMIC, MBS, PLC, CAPTA). Refreshed daily. Returns matches with confidence score (0–100), source list, and aliases. Use threshold to control match strictness.',
    schema: z.object({
      name: z.string().min(2).describe('Name to screen.'),
      threshold: z.number().int().min(50).max(100).default(80).describe('Minimum match-confidence percentage (50–100, default 80).'),
      // Values must match sanctions_entity.entity_type literally. 'any' and 'entity' were
      // in this enum and matched NOTHING -- and 'any' was the default, so every screen that
      // did not override it returned zero hits with HTTP 200, i.e. a silent false negative
      // on a compliance control. Omit for no filter.
      entity_type: z.enum(['person', 'company', 'vessel', 'aircraft', 'unknown']).optional()
        .describe('Restrict to one entity type. Omit to screen all types.'),
      include_pep: z.boolean().optional().describe('Also screen against politically exposed persons (BETA, Spain only, from Wikidata) and return a separate pep block. Membership is by OCCUPATION, not office: 44% of the set has no recorded office and local officials (6,108) outnumber national ones (3,191). Every hit carries positions[], pep_tier and has_current_office — read them rather than treating a match as a determination. Holds no relatives or close associates, so on its own it does not satisfy a FATF PEP obligation.'),
      pep_min_tier: z.enum(['national', 'regional', 'local']).optional().describe('Only return PEP hits at or above this tier. Omit to receive every hit, including those with no recorded office.'),
      limit: z.number().int().min(1).max(100).default(20),
    }),
    handler: (args) => safeCall(() => getClient().get('/sanctions/screen', args)),
  },
  {
    name: 'sanctions_entity',
    description: 'Fetch full detail for a single sanctions entity by Prometiam internal ID: all aliases, the issuing programme/list, listing date, and identifying data. Get an ID from a sanctions_screen match.',
    schema: z.object({
      id: z.union([z.number().int(), z.string()]).describe('Prometiam internal sanctions-entity ID.'),
    }),
    handler: (args) => safeCall(() => getClient().get(`/sanctions/entity/${args.id}`)),
  },

  // ── Insolvency / risk notices ────────────────────────────────────────────
  {
    name: 'insolvency_search',
    description: 'Search insolvency and risk notices (bankruptcies, liquidations, court judgments) by company name or identifier. Complements company registry data with distress signals. Scope with country and date range.',
    schema: z.object({
      name: z.string().optional().describe('Company name — fuzzy match.'),
      vat: z.string().optional().describe('Spanish NIF/CIF — exact match.'),
      siren: z.string().optional().describe('French SIREN (9 digits).'),
      siret: z.string().optional().describe('French SIRET (14 digits).'),
      company_number: z.string().optional().describe('UK Companies House number.'),
      event_type: z.string().optional().describe('Filter by notice/event type (e.g. insolvency, liquidation, judgment).'),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('On or after this date (YYYY-MM-DD).'),
      date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('On or before this date (YYYY-MM-DD).'),
      country: Country.optional(),
      limit: Limit,
      cursor: Cursor,
    }),
    handler: (args) => safeCall(() => getClient().get('/search', args)),
  },
  {
    name: 'insolvency_notices_search',
    description: 'Search CORPORATE insolvency notices published in official gazettes and registers across France, Germany, the UK, Austria, Switzerland, Norway, Finland, the US and the Netherlands. Use this for distress coverage in markets where no company registry is held (DE, AT, CH, FI, US) — there the notices stand alone and are not linked to a company record. Norway has full registry coverage, so NO notices can be cross-referenced against companies_search with country=NO. Personal/consumer insolvency is deliberately excluded and is never returned. Distinct from insolvency_search, which covers the linked ES/FR/GB risk-notice corpus.',
    schema: z.object({
      name: z.string().min(2).optional().describe('Company name — matched anywhere in the normalized name (min 2 characters).'),
      country: z.enum(['FR', 'DE', 'GB', 'AT', 'CH', 'NO', 'FI', 'US', 'NL']).optional().describe('Insolvency-coverage country. This is NOT the same set as the company-registry countries.'),
      event_type: z.string().optional().describe('Notice type, e.g. insolvency, dissolution, liquidation, forced_sale.'),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Filing date on or after this date (YYYY-MM-DD).'),
      date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Filing date on or before this date (YYYY-MM-DD).'),
      limit: Limit,
      cursor: Cursor,
    }),
    handler: (args) => safeCall(() => getClient().get('/insolvency/search', args)),
  },
  {
    name: 'procurement_awards',
    description: 'List public-contract awards by supplier, buyer, supplier tax id, CPV code and date, newest first. Spain (PLACSP, including minor contracts), France (DECP), the United Kingdom (Contracts Finder, Find a Tender) and Ireland, Poland and Norway (TED, above the EU thresholds only); pass country to restrict, omit it for all six. One row per award to one supplier: amount_eur is that supplier\'s share as published, before VAT where the source distinguishes; amount_contract_eur is the whole contract; amount_is_ceiling marks a framework or dynamic-purchasing ceiling that is not spend; amount_suspect marks a form default rather than a price. bids_received is the competition signal where the source publishes it. company_id is set when the supplier resolves to a company record in that country (use company_detail on it). Natural-person suppliers are never returned. Requires at least one of company_id, nif, supplier, buyer, cpv or date_from.',
    schema: z.object({
      country: z.enum(['ES', 'FR', 'GB', 'IE', 'PL', 'NO']).optional().describe('Restrict to one country; omit for all six.'),
      company_id: z.union([z.number().int(), z.string()]).optional().describe('Prometiam company id of the supplier (from companies_search).'),
      nif: z.string().optional().describe('Supplier identifier as published, exact match: NIF/CIF (Spain), SIRET (France), Companies House number (United Kingdom), CRO number (Ireland), NIP or KRS (Poland), organisasjonsnummer (Norway); supplier_id_scheme says which.'),
      supplier: z.string().min(3).optional().describe('Supplier name, matched anywhere (min 3 characters).'),
      buyer: z.string().min(3).optional().describe('Contracting body name, matched anywhere (min 3 characters), e.g. "Ayuntamiento de Madrid".'),
      cpv: z.string().regex(/^\d{2,8}$/).optional().describe('CPV code or prefix, 2-8 digits (45 = construction works).'),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Award date on or after (YYYY-MM-DD).'),
      date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Award date on or before (YYYY-MM-DD).'),
      min_amount: z.number().min(0).optional().describe('Minimum awarded amount in EUR.'),
      limit: Limit,
      cursor: Cursor,
    }),
    handler: (args) => safeCall(() => getClient().get('/procurement/awards', args)),
  },
  {
    name: 'procurement_buyer',
    description: 'Risk profile of a PUBLIC BUYER (a contracting body) in Spain or France — BETA. Two calibrated scores about the buyer, never about a supplier or a tender: competition = probability that its next award receives a single bid; counterparty = probability that a supplier it awards to enters insolvency within 24 months (weak signal). Each carries score 1-10 (log-odds ladder, 1 = 1st percentile of the country\'s buyers, 10 = 99th), probability, base_rate, relative_risk, percentile of the residual, observed/expected rates, awards_scored, confidence; plus behaviour ratios, up to three evidence awards and the five largest supplier relationships. Find the id with procurement_buyers. A score is a prompt to look, not a finding of wrongdoing.',
    schema: z.object({
      id: z.string().describe('National identifier of the contracting body: DIR3 code or NIF (Spain), SIRET (France).'),
      country: z.enum(['ES', 'FR']).optional().describe('Defaults to ES.'),
    }),
    handler: (args) => safeCall(() => {
      const { id, ...rest } = args
      return getClient().get(`/procurement/buyer/${encodeURIComponent(String(id))}`, rest)
    }),
  },
  {
    name: 'procurement_buyers',
    description: 'List scored public buyers (contracting bodies) in Spain or France ordered by one buyer score, highest first — BETA. Use it to screen a portfolio (min_score), to see a region, or to find a buyer\'s identifier by name before calling procurement_buyer. Rows carry the buyer, its coverage and both risk blocks (score 1-10, probability, base_rate, relative_risk).',
    schema: z.object({
      country: z.enum(['ES', 'FR']).optional().describe('Defaults to ES.'),
      model: z.enum(['competition', 'counterparty']).optional().describe('Which score orders the list (default competition).'),
      min_score: z.number().int().min(1).max(10).optional().describe('Keep buyers at or above this score.'),
      name: z.string().min(3).optional().describe('Buyer name, matched anywhere (min 3 characters).'),
      region: z.string().optional().describe('Region name, matched anywhere.'),
      limit: Limit,
      cursor: Cursor,
    }),
    handler: (args) => safeCall(() => getClient().get('/procurement/buyers', args)),
  },
  {
    name: 'procurement_relationship',
    description: 'How dependent a public buyer and one of its five largest suppliers are on each other (Spain or France, BETA): awards, awarded value, the supplier\'s share of the buyer\'s awarded value, first/last award, single-bid awards, average bids, and the supplier\'s insolvency date when it failed. Only the five largest relationships per buyer are held; a supplier outside them returns 404 — use procurement_awards for its full award list (Spain).',
    schema: z.object({
      buyer: z.string().describe('National identifier of the contracting body (DIR3/NIF for Spain, SIRET for France).'),
      supplier: z.string().describe('Supplier tax id (NIF for Spain, SIREN for France).'),
      country: z.enum(['ES', 'FR']).optional().describe('Defaults to ES.'),
    }),
    handler: (args) => safeCall(() => getClient().get('/procurement/relationship', args)),
  },
  {
    name: 'sanctions_watch',
    description: 'Add a name to your sanctions watchlist (sanctions_watch scope, Starter and above): the API re-screens it against every list update and reports new hits on sanctions_watchlist, or calls webhook_url when set.',
    schema: z.object({
      name: z.string().min(2).max(200).describe('Name to watch.'),
      entity_type: z.enum(['person', 'company', 'vessel']).optional(),
      webhook_url: z.string().url().optional().describe('https URL called when a new hit appears.'),
    }),
    handler: (args) => safeCall(() => getClient().post('/sanctions/watchlist', args)),
  },
  {
    name: 'sanctions_unwatch',
    description: 'Remove one of your sanctions watchlist entries by id (from sanctions_watchlist).',
    schema: z.object({
      id: z.string().describe('Watchlist entry id.'),
    }),
    handler: (args) => safeCall(() => getClient().del(`/sanctions/watchlist/${encodeURIComponent(String(args.id))}`)),
  },
  {
    name: 'companies_lookup',
    description: 'Resolve up to 100 companies in ONE call (POST /companies/lookup). Each item needs country plus an identifier (company_number; aliases nif, siren, vat) or a name (best fuzzy match with match_score). Results come back in request order with status found / not_found / error / timeout and the same company object companies_search returns. Every item counts as one request against the plan limits; a batch that does not fit is refused with 429 batch_exceeds_quota and max_items_now. Optional idempotency_key: replaying the same key with the same items within 24h returns the original response for free (409 if still running, 422 if the items differ).',
    schema: z.object({
      items: z.array(z.object({
        country: Country.optional(),
        company_number: z.string().optional().describe('Registry number: NIF (ES), SIREN (FR), Companies House number (GB), CRO (IE), KRS (PL), organisasjonsnummer (NO).'),
        nif: z.string().optional(),
        siren: z.string().optional(),
        vat: z.string().optional(),
        name: z.string().optional().describe('Company name for a fuzzy lookup (best match only).'),
      })).min(1).max(100).describe('Up to 100 companies to resolve.'),
      idempotency_key: z.string().min(1).max(255).optional().describe('Optional. Safe-replay key for this exact batch (1-255 printable ASCII); a repeat within 24h is free and returns the stored result.'),
    }),
    handler: ({ idempotency_key, ...body }) => safeCall(() => getClient().post('/companies/lookup', body, idempotencyHeader(idempotency_key))),
  },
  {
    name: 'sanctions_screen_batch',
    description: 'Screen up to 50 names against the sanctions lists in ONE call (POST /sanctions/screen). Requires the sanctions scope (batch calls do not use the free trial allowance); every item counts as one request. Per-item status: match / clear / error / timeout. "clear" means no hit at or above the threshold on the active lists, not a certification. Optional idempotency_key: replaying the same key with the same items within 24h returns the original response for free (409 if still running, 422 if the items differ).',
    schema: z.object({
      names: z.array(z.string().min(2)).min(1).max(50).describe('Names to screen (people, companies, vessels).'),
      threshold: z.number().int().min(30).max(100).optional().describe('Minimum similarity 30-100 (default 80).'),
      group: z.enum(['entity']).optional().describe('entity: one row per listed person/company with lists[] and sources[] instead of one row per source list.'),
      list: z.string().optional().describe('Comma-separated source lists to restrict to, e.g. OFAC,EU,UN.'),
      active_only: z.boolean().optional().describe('Only currently listed entries (default true).'),
      limit: z.number().int().min(1).max(100).optional().describe('Hits returned per name (default 10).'),
      idempotency_key: z.string().min(1).max(255).optional().describe('Optional. Safe-replay key for this exact batch (1-255 printable ASCII); a repeat within 24h is free and returns the stored result.'),
    }),
    handler: ({ idempotency_key, ...body }) => safeCall(() => getClient().post('/sanctions/screen', body, idempotencyHeader(idempotency_key))),
  },
  {
    name: 'insolvency_check',
    description: 'Check up to 100 counterparties for CORPORATE insolvency notices in ONE call (POST /insolvency/check) across FR, DE, GB, AT, CH, NO, FI, US and NL. Each item: country plus company_number (alias siren; exact, as printed on the notice) or name. Returns up to 5 notices per item, newest first, plus latest_filing_date; status found / none / error / timeout. "none" is not proof of solvency. Every item counts as one request. Optional idempotency_key: replaying the same key with the same items within 24h returns the original response for free (409 if still running, 422 if the items differ).',
    schema: z.object({
      items: z.array(z.object({
        country: z.enum(['FR', 'DE', 'GB', 'AT', 'CH', 'NO', 'FI', 'US', 'NL']).optional(),
        company_number: z.string().optional().describe('Registry number as printed on the notice (SIREN for FR, HRB for DE, Companies House number for GB, org number for NO...).'),
        siren: z.string().optional(),
        name: z.string().optional().describe('Company name (normalised pattern match).'),
      })).min(1).max(100).describe('Up to 100 counterparties to check.'),
      idempotency_key: z.string().min(1).max(255).optional().describe('Optional. Safe-replay key for this exact batch (1-255 printable ASCII); a repeat within 24h is free and returns the stored result.'),
    }),
    handler: ({ idempotency_key, ...body }) => safeCall(() => getClient().post('/insolvency/check', body, idempotencyHeader(idempotency_key))),
  },
  {
    name: 'insolvency_record',
    description: 'Fetch a single insolvency / risk notice by Prometiam internal ID, with related corporate events. Get an ID from insolvency_search.',
    schema: z.object({
      id: z.union([z.number().int(), z.string()]).describe('Prometiam internal insolvency-record ID.'),
    }),
    handler: (args) => safeCall(() => getClient().get(`/records/${args.id}`)),
  },

  // ── Notices ──────────────────────────────────────────────────────────────
  {
    name: 'notice_detail',
    description: 'Fetch a registry gazette notice (PDF edition) by Prometiam internal ID. Returns edition metadata, parse status, the PDF URL, SHA-256 hash, and raw extracted text. Each Spanish BORME edition is one notice.',
    schema: z.object({
      id: z.union([z.number().int(), z.string()]).describe('Prometiam internal notice ID.'),
    }),
    handler: (args) => safeCall(() => getClient().get(`/notices/${args.id}`)),
  },

  // ── Coverage / account ───────────────────────────────────────────────────
  {
    name: 'coverage',
    description: 'Returns dataset coverage statistics: per-country company count, event count, person count, latest filing date, and data sources. Use this when a user asks "what countries does Prometiam cover?" or "how fresh is the data?".',
    schema: z.object({}),
    handler: () => safeCall(() => getClient().get('/coverage')),
  },
  {
    name: 'account',
    description: 'Returns the calling API key\'s account info and current usage: plan tier, rate limits (per minute / day / month), remaining quota, and enabled scopes. Use this to check "how much quota do I have left?".',
    schema: z.object({}),
    handler: () => safeCall(() => getClient().get('/account')),
  },

  // ── Validation (VAT / LEI) ─────────────────────────────────────────────────
  {
    name: 'vat_validate',
    description: 'Validate an EU VAT number against VIES (the European Commission\'s VAT Information Exchange System) and return the registered trader name and address when valid. Covers the 27 EU member states plus XI (Northern Ireland); Greek numbers use the EL prefix and GB VAT is out of scope post-Brexit. Live official check — returns a retryable error when a member-state registry is temporarily down (not a false "invalid").',
    schema: z.object({
      vat: z.string().min(3).describe('Full VAT number including the 2-letter country prefix, e.g. IE6388047V or DE811569869. Spaces and punctuation are ignored.'),
    }),
    handler: (args) => safeCall(() => getClient().get(`/vat/${args.vat}`)),
  },
  {
    name: 'lei_lookup',
    description: 'Look up a Legal Entity Identifier (LEI) in the GLEIF global register by its 20-character ISO 17442 code. Returns legal name, jurisdiction, entity and registration status, legal/HQ address, managing LOU, and next renewal date. Use to validate or enrich a counterparty that publishes an LEI.',
    schema: z.object({
      lei: z.string().length(20).describe('20-character alphanumeric LEI, e.g. HWUPKR0MPOU8FGXBT394.'),
    }),
    handler: (args) => safeCall(() => getClient().get(`/lei/${args.lei}`)),
  },
  {
    name: 'lei_search',
    description: 'Search the GLEIF global LEI register by legal-entity name (full-text). Returns candidate LEIs with legal name, jurisdiction, status, and city/country — use to resolve a company name to its LEI before lei_lookup.',
    schema: z.object({
      name: z.string().min(2).describe('Legal entity name to search for.'),
      limit: z.number().int().min(1).max(25).default(10).describe('Maximum candidates to return (1–25, default 10).'),
    }),
    handler: (args) => safeCall(() => getClient().get('/lei/search', args)),
  },
  {
    name: 'lei_relationships',
    description: 'GLEIF Level 2 corporate ownership ("who owns whom") for a 20-character LEI: its direct parent, ultimate parent, and direct children — each with LEI, legal name, jurisdiction, status, and city/country. Reveals the accountable ownership chain behind an entity. Only relationships reported to GLEIF are returned (many entities report none).',
    schema: z.object({
      lei: z.string().length(20).describe('20-character alphanumeric LEI, e.g. 5493001KJTIIGC8Y1R12.'),
    }),
    handler: (args) => safeCall(() => getClient().get(`/lei/${args.lei}/relationships`)),
  },

  // ── Company monitoring ─────────────────────────────────────────────────────
  {
    name: 'monitor_list',
    description: 'List the companies currently subscribed to ongoing monitoring for this API key, with their labels and last-alert timestamps. Company monitoring emits new corporate events, status changes, and sanctions matches to a webhook.',
    schema: z.object({}),
    handler: () => safeCall(() => getClient().get('/monitor')),
  },
  {
    name: 'monitor_get',
    description: 'Get one monitored company by its monitor ID, including its alert history (events/status/sanctions matches detected since subscription).',
    schema: z.object({
      id: z.union([z.number().int(), z.string()]).describe('Monitor subscription ID (from monitor_subscribe or monitor_list).'),
    }),
    handler: (args) => safeCall(() => getClient().get(`/monitor/${args.id}`)),
  },
  {
    name: 'monitor_subscribe',
    description: 'Subscribe a company to ongoing monitoring. New corporate events, status changes, and sanctions matches are scanned daily and POSTed to your webhook_url (HMAC-SHA256 signed). Returns the monitor ID and a webhook_secret (shown once). Available for Spain (ES), Ireland (IE) and Poland (PL) only. This creates a persistent subscription — confirm intent before calling.',
    schema: z.object({
      company_id: z.union([z.number().int(), z.string()]).describe('Prometiam internal company ID to monitor (from companies_search / company_detail).'),
      webhook_url: z.string().url().describe('HTTPS URL that receives signed alert POSTs.'),
      country: MonitorCountry.optional(),
      label: z.string().optional().describe('Optional human-friendly label for this subscription.'),
      events: z.array(z.string()).optional().describe('Optional list of event types to filter alerts to (default: all).'),
    }),
    handler: (args) => safeCall(() => getClient().post('/monitor', args)),
  },
  {
    name: 'monitor_stop',
    description: 'Stop monitoring a company and delete its subscription by monitor ID. This is irreversible — the alert history is removed.',
    schema: z.object({
      id: z.union([z.number().int(), z.string()]).describe('Monitor subscription ID to delete.'),
    }),
    handler: (args) => safeCall(() => getClient().del(`/monitor/${args.id}`)),
  },

  // ── Sanctions change feed / watchlists ───────────────────────────────────
  // Added 2026-07-28: both endpoints were live but absent from openapi.json, so the parity
  // guard could not see they had no tool. Documenting the paths surfaced the gap immediately.
  {
    name: 'sanctions_changes',
    description: 'List additions, removals and amendments detected on the sanctions lists, newest first. Use this to answer "what changed recently" without re-screening a whole book of business — each change carries the entity it affects, so a hit can be joined back to sanctions_entity.',
    schema: z.object({
      since: z.string().optional().describe('ISO date (YYYY-MM-DD). Only changes detected after it.'),
      change_type: z.enum(['listed', 'delisted', 'updated']).optional().describe('Restrict to one kind of change.'),
      list: z.string().optional().describe('Comma-separated source lists, e.g. "EU,OFAC".'),
      limit: z.number().int().min(1).max(100).default(20).describe('Maximum changes to return (1–100, default 20).'),
    }),
    handler: (args) => safeCall(() => getClient().get('/sanctions/changes', args)),
  },
  {
    name: 'sanctions_watchlist',
    description: 'Return your sanctions watchlists and any recent hits against them. Requires the sanctions_watch scope; the number of entries allowed depends on your tier. Add entries with sanctions_watch and remove them with sanctions_unwatch.',
    schema: z.object({}),
    handler: () => safeCall(() => getClient().get('/sanctions/watchlist', {})),
  },
]
