/**
 * MCP tool definitions for the Prometiam company data API.
 *
 * Each tool wraps one Risk API endpoint, with zod-validated input schemas
 * that get auto-converted to JSON Schema in the MCP tools/list response.
 *
 * Source of truth: public/openapi.json at https://www.prometiam.com/openapi.json
 */

import { z } from 'zod'
import { getClient, RiskApiError } from './client.js'

const Country = z.enum(['ES', 'FR', 'GB', 'IE', 'PL']).describe('Country code: ES (Spain, BORME), FR (France, BODACC), GB (UK, Companies House), IE (Ireland, CRO), or PL (Poland, KRS). Ireland and Poland are company-level. Defaults to first country in the API key allowlist.')
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

/** Convert any thrown RiskApiError into a clean text response for the MCP client. */
async function safeCall(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    return await fn()
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
    description: 'Search EU + UK companies in official registries by name or identifier. Returns companies with legal form, capital, status, registry coordinates. Use country to scope the search to Spain (BORME), France (BODACC), the UK (Companies House), Ireland (CRO), or Poland (KRS). Fuzzy name results carry a match_score (0–100) and are ranked by relevance, best first.',
    schema: z.object({
      name: z.string().optional().describe('Company name — fuzzy normalized match.'),
      nif: z.string().optional().describe('Spanish NIF/CIF (exact match), e.g. A28015865.'),
      siren: z.string().optional().describe('French SIREN (9 digits), e.g. 552032534.'),
      siret: z.string().optional().describe('French SIRET (14 digits).'),
      company_number: z.string().optional().describe('UK Companies House number, e.g. 00445790 or SC123456.'),
      country: Country.optional(),
      limit: Limit,
      cursor: Cursor,
    }),
    handler: (args) => safeCall(() => getClient().get('/companies/search', args)),
  },
  {
    name: 'company_detail',
    description: 'Fetch a single company by Prometiam internal ID. Returns full profile including officers, registry coordinates, founding date, capital, and current status. Get an ID from companies_search first.',
    schema: z.object({
      id: z.union([z.number().int(), z.string()]).describe('Prometiam internal company ID (integer).'),
    }),
    handler: (args) => safeCall(() => getClient().get(`/companies/${args.id}`)),
  },

  // ── Corporate events ─────────────────────────────────────────────────────
  {
    name: 'events_search',
    description: 'Search normalized corporate-event records (capital changes, director changes, dissolutions, mergers, insolvency, name changes, etc.) by company or date range. Returns events with type, date, before/after values, and source notice URL.',
    schema: z.object({
      company_name: z.string().optional().describe('Company name — fuzzy match.'),
      company_number: z.string().optional().describe('Registry registration number — exact match.'),
      event_type: z.enum(['dissolution', 'director_change', 'capital_change', 'new_incorporation', 'name_change', 'address_change', 'liquidation', 'merger', 'demerger', 'status_change', 'insolvency']).optional(),
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
    description: 'Returns the chronological event history for one company (oldest first). Useful for building lifecycle timelines from incorporation through capital changes, director appointments, and dissolution. One of company_number or company_name is required.',
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
    description: 'Search officers / directors / shareholders by name across EU + UK registries. Returns matching people with their appointment counts, ranked by a fuzzy-match match_score (0–100), best first. Use person_detail for a full appointment history. Scope with country.',
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
    description: 'Screen a person or entity name against five sanctions lists — EU consolidated, UN, OFAC, UK OFSI, and the French Registre des gels — with trigram fuzzy match. Returns matches with confidence score (0–100), source list, and aliases. Use threshold to control match strictness.',
    schema: z.object({
      name: z.string().min(2).describe('Name to screen.'),
      threshold: z.number().int().min(50).max(100).default(80).describe('Minimum match-confidence percentage (50–100, default 80).'),
      entity_type: z.enum(['person', 'entity', 'vessel', 'any']).default('any'),
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
    description: 'Subscribe a company to ongoing monitoring. New corporate events, status changes, and sanctions matches are scanned daily and POSTed to your webhook_url (HMAC-SHA256 signed). Returns the monitor ID and a webhook_secret (shown once). This creates a persistent subscription — confirm intent before calling.',
    schema: z.object({
      company_id: z.union([z.number().int(), z.string()]).describe('Prometiam internal company ID to monitor (from companies_search / company_detail).'),
      webhook_url: z.string().url().describe('HTTPS URL that receives signed alert POSTs.'),
      country: Country.optional(),
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

  // ── Prospecting (compliance-safe B2B contact intelligence) ─────────────────
  {
    name: 'prospect_companies_search',
    description: 'Search companies by firmographics for ICP/prospect-list building: sector group (technology, finance, manufacturing, retail_wholesale, ...), NACE code prefix, company age, and employee band (INSEE-sourced for FR, estimated elsewhere). Returns companies with derived firmographics. Get decision-makers for a result via prospect_company_people.',
    schema: z.object({
      country: Country.optional(),
      stats: z.enum(['sector_group', 'employee_band']).optional().describe('Audience-sizing mode: returns bucket counts for this dimension (instant, pre-aggregated) instead of a company list.'),
      sector_group: z.enum(['agriculture', 'mining_energy', 'manufacturing', 'utilities', 'construction', 'retail_wholesale', 'transport_logistics', 'hospitality', 'technology', 'finance', 'real_estate', 'professional_services', 'business_services', 'public_sector', 'education', 'healthcare', 'arts_entertainment', 'other_services', 'other']).optional().describe('Coarse sector group derived from the registry industry code.'),
      sector: z.string().optional().describe('NACE code prefix, e.g. "62" (computer programming), "47" (retail), "41" (construction).'),
      employee_band: z.enum(['1-9', '10-49', '50-249', '250-999', '1000+']).optional().describe('Employee-count band.'),
      company_age_min: z.number().int().min(0).optional().describe('Minimum years since founding.'),
      company_age_max: z.number().int().min(0).optional().describe('Maximum years since founding.'),
      limit: Limit,
      cursor: Cursor,
    }),
    handler: (args) => safeCall(() => getClient().get('/prospect/companies/search', args)),
  },
  {
    name: 'prospect_people_search',
    description: 'Find contactable decision-makers across EU registries: officers/directors (ES, FR) or beneficial owners (GB PSC), mapped from registry roles to functional titles + seniority. Filter by seniority, department, and whether a company/role contact route exists. Compliance-safe: registry-published roles + org-published routes only, never inferred personal emails. Scope with country (ES/FR/GB).',
    schema: z.object({
      country: Country.optional(),
      stats: z.enum(['seniority', 'department']).optional().describe('Audience-sizing mode: returns bucket counts for this dimension (instant) instead of a people list.'),
      seniority: z.enum(['owner', 'c_level', 'board', 'manager', 'other']).optional().describe('Seniority tier. c_level = CEO/MD/Gérant/President; board = directors; owner = shareholders/PSC.'),
      department: z.enum(['executive', 'governance', 'ownership', 'finance', 'legal', 'other']).optional().describe('Functional department derived from the registry role.'),
      company: z.union([z.number().int(), z.string()]).optional().describe("Surface company ID — scope to one company's decision-makers (replaces the old prospect_company_people tool)."),
      has_email: z.boolean().optional().describe('Only people whose company has a published email route.'),
      has_phone: z.boolean().optional().describe('Only people whose company has a published phone route.'),
      has_linkedin: z.boolean().optional().describe('Only people with a published LinkedIn profile.'),
      min_tenure_years: z.number().int().min(0).optional().describe('Minimum years since appointment.'),
      limit: Limit,
      cursor: Cursor,
    }),
    handler: (args) => safeCall(() => getClient().get('/prospect/people/search', args)),
  },
  {
    name: 'prospect_company_contacts',
    description: 'Get the compliance-safe contact routes for a company (role/company emails, phones, website, LinkedIn) published by the organisation in official registers or its own website. Suppression-filtered. Not verified personal mailboxes. Get the company ID from companies_search or prospect_companies_search.',
    schema: z.object({
      id: z.union([z.number().int(), z.string()]).describe('Prometiam surface company ID.'),
      country: Country.optional(),
      type: z.enum(['email', 'phone', 'website', 'linkedin']).optional().describe('Filter to one route type.'),
    }),
    handler: (args) => safeCall(() => getClient().get(`/prospect/company/${args.id}/contacts`, args)),
  },
  {
    name: 'prospect_suppress',
    description: 'Add a subject to the prospecting suppression / opt-out list (GDPR right to object). Any suppressed email, domain, LinkedIn, phone, person, or company is filtered from all prospect responses going forward. Suppression is permanent.',
    schema: z.object({
      kind: z.enum(['email', 'domain', 'linkedin', 'phone', 'person', 'company']).describe('What kind of identifier is being suppressed.'),
      value: z.string().describe('The email / domain / LinkedIn URL / phone / id to suppress.'),
      reason: z.string().optional().describe('Optional reason (opt_out, complaint, legal_request, bounce).'),
    }),
    handler: (args) => safeCall(() => getClient().post('/prospect/suppress', args)),
  },
]
