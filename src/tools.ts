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

const Country = z.enum(['ES', 'FR', 'GB', 'IE', 'PL', 'NO', 'FI', 'SE', 'HR', 'BE', 'DK', 'EE', 'SK', 'CH', 'US']).describe('Country code: ES (Spain, BORME), FR (France, BODACC), GB (UK, Companies House), IE (Ireland, CRO), PL (Poland, KRS), NO (Norway, Brønnøysundregistrene / Enhetsregisteret), FI (Finland, Kaupparekisteri, the Finnish Trade Register), SE (Sweden, Bolagsverket, the Swedish Companies Registration Office), HR (Croatia, Sudski registar, the Croatian court register), BE (Belgium, KBO/BCE, the Crossroads Bank for Enterprises), DK (Denmark, CVR, the Danish Central Business Register), EE (Estonia, the e-Business Register, RIK), SK (Slovakia, RPO, the Register of Legal Entities), or CH (Switzerland, Zefix, the Swiss central business name index), or US (United States: state business registers, SEC EDGAR and GLEIF). Ireland, Poland, Finland, Sweden, Croatia, Belgium, Denmark, Estonia, Slovakia, Switzerland and the United States are company-level (companies only). Norway has companies and officers but no corporate-event stream, so the event tools return nothing for NO (nor for IE and PL). Finland, Sweden, Belgium, Croatia, Denmark, Estonia, Slovakia, Switzerland and the United States have register-change events (name, status, legal form and registered address; share capital for HR), dated when the change first appears in the register data (for the United States, the weekly read of the registers that first sees it) and none before 2026-09-30, and monitoring. Company records from the Finnish Trade Register: legal name, legal form, status, registered address, activity code and dates; no officers and no registry-compliance signal. Corporate insolvency notices are linked by business ID. Sweden: Company records from the Swedish Companies Registration Office (Bolagsverket): legal name, legal form, status, registered address, activity code and dates; no officers and no registry-compliance signal, and sole traders (enskild näringsverksamhet) are never served. Corporate insolvency notices (konkurs, företagsrekonstruktion, ackordsförhandling; weekly, no court or case number) are linked by organisationsnummer. Croatia: Company records from the Croatian court register (Sudski registar): legal name, legal form, status, registered address, activity code and dates; no officers and no registry-compliance signal, and sole traders (trgovac pojedinac) are never served. Corporate insolvency notices (court decisions, with court and case number where the register states them) are linked by MBS. Belgium: Company records from the Crossroads Bank for Enterprises (KBO/BCE): legal name, legal form, status, registered address, activity code and dates; no officers, no registry-compliance signal and no insolvency notices (Belgium is not an insolvency market: a bankruptcy shows in the company status and in its register-change events), and enterprises of natural persons (eenmanszaak / entreprise individuelle) are never served. Denmark: Company records from the Danish Central Business Register (CVR): legal name, legal form, status (including the register\'s bankruptcy state), registered address, activity code and dates; no officers, no registry-compliance signal and no share capital, and sole proprietorships (enkeltmandsvirksomhed) and estates are never served. Corporate insolvency notices (konkurs and tvangsakkord from CVR credit information: one notice per proceeding, dated by the decision that opened it, with the latest stage of the proceeding; no court or case number) are linked by CVR number. Estonia: Company records from the Estonian e-Business Register (RIK): legal name, legal form, status (including liquidation and bankruptcy), registered address, activity code (EMTAK 2008 or 2025, per company) and dates; with register-change events and monitoring, but no officers, no registry-compliance signal and no insolvency notices. Sole traders (FIE) are never served, and the VAT number (KMKR) is searchable with `vat=`. Slovakia: Company records from the Slovak Register of Legal Entities (RPO): legal name, legal form, status (including bankruptcy (konkurz) and restructuring), registered address, activity code (SK NACE Rev. 2.1) and dates; with register-change events and monitoring, but no officers, no registry-compliance signal and no insolvency notices. Commercial legal persons only (no associations, foundations or other non-commercial entities); no VAT number (a `vat` search is refused); sole traders and other natural persons are never served. Switzerland: Company records from Zefix, the Swiss central business name index: legal name, legal form, status (including liquidation), registered address with the canton and business purpose; with register-change events and monitoring, but no officers, no registry-compliance signal and no activity code (the register publishes no NOGA code). Legal entities and branches only; sole proprietorships (Einzelunternehmen) and other natural persons are never served. Corporate insolvency notices (SHAB) are linked by UID where the notice names the debtor\'s UID. The UID with its MWST, TVA or IVA suffix is searchable with `vat=`. United States: there is no national register, so the API serves company records from the business registers of New York, Colorado, Connecticut and Pennsylvania (state open data) plus SEC filers (EDGAR) and LEI holders (GLEIF) from every state, Delaware included, as one record per state registration (domestic or foreign); numbers look like NY-4424185, CO-20091096973, DE-10684990, CIK-0000320193 or LEI-… and identifiers also carry the SEC CIK, the EIN of SEC filers and the LEI; New York and Pennsylvania publish active entities only and the SEC gives no legal status; updated weekly; company-level (no officers and no registry-compliance signal, with register-change events (dated by the weekly read) and monitoring), no VAT number (a `vat` search is refused), sole proprietorships never served, and not every US company. US insolvency notices are on insolvency_search and are not linked to the company records. US sources: New York Department of State, Colorado Secretary of State, Connecticut Secretary of the State, Pennsylvania Department of State (open data), SEC EDGAR, GLEIF (CC0). Defaults to first country in the API key allowlist.')

/**
 * Monitoring covers a NARROWER set than the registry corpus — see the
 * `/monitor` request body in public/openapi.json, which pins country to
 * ES/IE/PL/FI/SE/BE/HR/DK/EE/SK/CH/US. Norway, France and the UK have no monitoring implementation, so
 * they must not be offered here: an accepted value the API cannot honour is a
 * false capability, not a convenience.
 */
const MonitorCountry = z.enum(['ES', 'IE', 'PL', 'FI', 'SE', 'BE', 'HR', 'DK', 'EE', 'SK', 'CH', 'US']).describe('Country of the company to monitor: ES (default), IE, PL, FI, SE, BE, HR, DK, EE, SK, CH or US. Monitoring is not available for FR, GB or NO.')

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
    description: 'Search EU + UK companies in official registries by name or identifier. Every company is one standard object with the same keys in all fifteen countries (null where the register publishes no value): identifiers [{type, value}], vat_number and vat_number_source (register or rule; also in identifiers as type vat; `register`: published by the register (EE) or the register confirms VAT registration and the number is the legal format of its identifier (NO, FI, BE). `rule`: built from the company identifier (ES `ES`+NIF, FR `FR`+key+SIREN, PL `PL`+NIP, NO `NO`+number+`MVA`, FI, SE `SE`+number+`01`, BE, HR `HR`+OIB, DK): the format is right, the registration is not confirmed (check it with `GET /vat/{number}`). Null where the register says the company is not VAT-registered (NO, FI) and where no rule exists (GB, IE, SK, US, and EE without a published KMKR).), the standard legal_form abbreviation and legal_form_family beside the register\'s local_legal_form and local_legal_form_name, a standard status and stage beside the register\'s own local_status, one main activity_code with its scheme, label and NACE class, address with region, capital_amount and capital_eur, and registry_details for what only one register has (null when the dictionary does not recognise a stored value — never a guess). Use country to scope the search to Spain (BORME), France (BODACC), the UK (Companies House), Ireland (CRO), Poland (KRS), Norway (Brønnøysundregistrene), Finland (Kaupparekisteri), Sweden (Bolagsverket), Croatia (Sudski registar), Belgium (KBO/BCE), Denmark (CVR), or the United States (state registers, SEC EDGAR and GLEIF). Fuzzy name results carry a match_score (0–100) and are ranked by relevance, best first. NOTE: "dissolved" means different things by country — ES/FR still exists pending liquidation, GB/IE/PL/NO/FI no longer exists — read status (the standard value), not local_status, to compare across countries. Norway and France include sole proprietorships (ENK, EI) as the register publishes them; a French company that opted out of publication (INSEE non-diffusible) has company_name null, status withheld and registry_details.non_diffusible true, is left out of name searches, the founding-date feed and event searches by name, and is found by SIREN or SIRET. A Spanish company closed by a merger is served as closed (local_status absorbed). A malformed identifier (a Spanish NIF must pass its control character), or a limit outside the documented range, is a 400 validation_error.',
    schema: z.object({
      name: z.string().optional().describe('Company name — fuzzy normalized match.'),
      // 'nif' was removed here because handleCompaniesSearch did not read it. It does now
      // (risk-api dc4b37b5, 2026-08-30): nif and vat are aliases for company_number. Keeping
      // it absent was not neutral -- the only working field was labelled "UK Companies House
      // number", so a model holding a Spanish NIF was steered away from the one parameter
      // that would have answered it.
      nif: z.string().optional().describe('Spanish NIF/CIF — exact match, e.g. A78053147. Alias of company_number.'),
      vat: z.string().optional().describe('VAT number — exact match, with its country prefix or without (ES ESA28015865, FR FR+key+SIREN, PL PL+NIP, NO NO+number+MVA; a malformed or wrong-country value is a 400). Otherwise an alias of company_number. For country FI, the Finnish VAT number FI plus the eight digits of the Y-tunnus, e.g. FI01120389; for country SE, the Swedish VAT number SE plus the ten digits of the organisationsnummer and 01, e.g. SE556012579001; for country HR, the Croatian VAT number HR plus the eleven digits of the OIB, e.g. HR27759560625; for country BE, the Belgian VAT number BE plus the ten digits of the enterprise number, e.g. BE0417497106; for country DK, the Danish VAT number DK plus the eight digits of the CVR number, e.g. DK24256790; for country EE, the Estonian VAT number (KMKR) EE plus nine digits, e.g. EE100354546, where the register publishes it (it is not the registry code; a VAT group number can be shared by the members of the group, so a search can return more than one company); for country CH, the Swiss VAT number, the UID followed by MWST, TVA or IVA, e.g. CHE-103.867.266 MWST; Slovakia and the United States have no VAT number, so vat is refused for country SK and US.'),
      siren: z.string().optional().describe('French SIREN (9 digits), e.g. 552032534.'),
      siret: z.string().optional().describe('French SIRET (14 digits).'),
      nip: z.string().optional().describe('Polish NIP (10 digits), exact match — use with country PL. The KRS number goes on company_number.'),
      regon: z.string().optional().describe('Polish REGON (9 or 14 digits), exact match — use with country PL.'),
      oib: z.string().optional().describe('Croatian OIB (11 digits), exact match — use with country HR. The ISO 7064 check digit is verified and a wrong one is a 400. The MBS goes on company_number.'),
      // Resolves per country: NIF for ES, SIREN for FR, registration number for GB/IE/PL/NO, Y-tunnus for FI, organisationsnummer for SE, MBS for HR, enterprise number for BE, CVR number for DK.
      // Describing it as UK-only was wrong and cost real lookups.
      company_number: z.string().optional().describe('Registry identifier — exact match. Resolves per country: Spanish NIF/CIF (A78053147), French SIREN, UK Companies House number (00445790, SC123456), the IE/PL/NO registration number, for country FI a Y-tunnus such as 0112038-9 (the hyphen is optional; a wrong check digit is a 400), for country SE an organisationsnummer such as 556012-5790 (the hyphen is optional; a wrong check digit, or a third digit below 2, is a 400), for country HR an MBS such as 080000604 (a dropped leading zero is restored; the check digit is advisory, so only a wrong length is a 400), for country BE an enterprise number such as 0417.497.106 (the dots and spaces are optional; a wrong check digit is a 400), or for country DK a CVR number such as 24256790 (eight digits; the mod-11 check is advisory, so only a number that is not eight digits is a 400), or for country US a state code and register number such as NY-4424185, CIK- and the SEC number such as CIK-0000320193, or LEI- and the 20-character LEI (no check digit; the dash is optional).'),
      has_risk_flag: z.boolean().optional().describe('Spain only. Return only companies carrying a published risk flag (currently the AEAT >€600,000 tax-debtor list).'),
      risk_flag_type: z.enum(['tax_debt', 'debarment', 'regulator_sanction', 'subsidy', 'registry_compliance']).optional().describe('Restrict to one flag type. registry_compliance also works for GB, IE and NO.'),
      status: z.enum([
        'active', 'active_strike_off_pending', 'suspended', 'not_yet_active',
        'in_restructuring', 'in_administration', 'in_receivership', 'insolvent',
        'in_liquidation_insolvent', 'in_liquidation', 'in_compulsory_liquidation',
        'in_dissolution', 'deregistered', 'merged', 'withheld',
      ]).optional().describe('Filter by the standard status, the same list in every country. Outside ES it must be combined with a name/company_number/siren/siret/nip/regon/oib.'),
      local_status: z.string().optional().describe('Filter by the register\'s own status value (for example dissolved for GB, radiated for FR). Not together with status; outside ES it needs a name or company_number, like status.'),
      country: Country.optional(),
      limit: Limit,
      cursor: Cursor,
    }),
    handler: (args) => safeCall(() => getClient().get('/companies/search', args)),
  },
  {
    name: 'company_detail',
    description: 'Fetch a single company by Prometiam internal ID. Returns full profile including officers, registry coordinates, founding date, capital, current standard status (with stage and the register\'s local_status), standard legal form (with local_legal_form), identifiers and registry_details. include=lei (Spain) adds lei_record, the GLEIF record; lei is the code string. recent_events (ES/FR/GB) carries the same served event_type + raw act_type as events_search. Get an ID from companies_search first. Pass include to attach extra blocks — notably risk_flags (published tax-debt / debarment signals) and insolvency.',
    schema: z.object({
      id: z.union([z.number().int(), z.string()]).describe('Prometiam internal company ID (integer).'),
      country: Country.optional(),
      include: z.string().optional().describe('Comma-separated extra blocks: procurement, insolvency, financials, lei, prospect, risk_flags — or all. financials adds latest_financials (GB, FR, DK, SE, NO, FI, US SEC filers, and listed companies in ES, PL, HR, BE; Scale plan and above; see company_financials for the limits). risk_flags is Spain only and each row states whether its identifier was read directly from the source or reconstructed with name corroboration.'),
    }),
    handler: (args) => safeCall(() => {
      const { id, ...rest } = args
      return getClient().get(`/companies/${id}`, rest)
    }),
  },
  {
    name: 'company_financials',
    description: 'Annual financial statements of a company as filed with the official registers, mapped to one standard chart (revenue, gross profit, operating profit, net profit, assets, cash, equity, liabilities, employees), in the filing currency and in euro, up to ten fiscal years. A null figure was not stated in the filing, never zero. Annual accounts as filed, for GB, FR, DK, SE and NO, plus FI (statements filed digitally with PRH, the Finnish Patent and Registration Office: XBRL, the company own accounts, about one filer in twenty, registered since July 2023, no employee count, profit before tax before appropriations; plus listed groups), US SEC filers (annual reports 10-K, 20-F and 40-F from EDGAR XBRL, consolidated, US GAAP or IFRS, fiscal years from 2023, in the filing currency (mostly USD) plus euro; no statements for other US companies) and listed companies only in ES, PL, HR and BE (their ESEF annual financial reports, IFRS, mostly consolidated; the report of every listed company is not held, and Polish reports arrive more than a year late; reports of Spanish listed companies are available free of charge on the CNMV website). FR: accounts keyed by INPI from the filed documents; none for companies that declare their accounts confidential (about 45% of French filers), and no profit and loss account where only it is declared confidential. Elsewhere only digitally filed accounts: GB electronic (iXBRL) filings, about three in four, where small and micro companies often file no profit and loss account; DK XBRL annual reports, where most small companies report gross profit instead of revenue (Contains CVR data (Erhvervsstyrelsen), CC BY 4.0.); SE digitally filed (iXBRL) reports only; NO the last three approved accounts, with no employee count in the accounts. The last three fiscal years at launch. Figures in the filing currency plus euro at the ECB annual average of the fiscal year (for comparison, not an accounting translation). Finnish companies also return data.tax_records (newest tax year first, from tax year 2020; Finnish Tax Administration public corporate income tax data, CC BY 4.0; 0 means none, not unknown; null when the read failed) and meta.tax_note. Contains data from the Finnish Patent and Registration Office (PRH), CC BY 4.0. Other companies in ES, PL, HR and BE (meta.availability listed_companies_only), Finnish companies without a digital filing (no_statement_held) and IE (PDF images) answer with empty statements and meta.availability. Needs the Scale plan or above (Starter, Professional and free trial keys get 10 calls a month, then upgrade_required). Every null figure is explained in statements[].quality.missing ({field: reason}: confidential, not_filed, reported_as_gross_profit, not_published_by_register, not_stated); for Norway the latest statement of the company itself carries the head count of the register record when the accounts have none (quality.notes employees_from_register, today\'s figure); company.employee_band is France only (INSEE size band today).',
    schema: z.object({
      id: z.union([z.number().int(), z.string()]).describe('Prometiam company ID from companies_search; the country is inferred from it.'),
      country: Country.optional(),
      years: z.number().int().min(1).max(10).optional().describe('Fiscal years to return, 1-10 (default 3).'),
      statement_type: z.enum(['individual', 'consolidated', 'all']).optional().describe('Default all.'),
      currency: z.enum(['native', 'eur', 'both']).optional().describe('Default both.'),
      include: z.enum(['lines']).optional().describe('lines adds balance_sheet and income_statement with every mapped line.'),
      include_superseded: z.boolean().optional().describe('Also return statements replaced by a later or amended filing, flagged superseded.'),
    }),
    handler: (args) => safeCall(() => {
      const { id, ...rest } = args
      return getClient().get(`/companies/${id}/financials`, rest)
    }),
  },

  // ── Corporate events ─────────────────────────────────────────────────────
  {
    name: 'events_search',
    description: 'Search normalized corporate-event records (capital changes, director changes, dissolutions, mergers, insolvency, name changes, etc.) by company or date range, for Spain, France and the UK (from their gazettes) and, as register-change events, for Finland, Sweden, Belgium, Croatia, Denmark, Estonia, Slovakia, Switzerland and the United States (none for the United States). Returns events with a served event_type matching this enum for each of those countries (each row also carries act_type, the raw BORME/BODACC/Companies House code it was derived from, or null when not yet covered), event date, before/after values, and source notice URL. The register-change events of the five (name, status, legal form and registered address; share capital for HR) are dated when the change first appears in the register data (for the United States, the weekly read of the registers that first sees it), are not gazette notices and start on 2026-09-30. Norway publishes no corporate-event gazette; Ireland and Poland are company-level (no event stream) — NO, IE and PL return an empty list.',
    schema: z.object({
      company_name: z.string().optional().describe('Company name — fuzzy match.'),
      company_number: z.string().optional().describe('Registry registration number — exact match.'),
      event_type: z.string().optional().describe('One of new_incorporation, director_change, capital_change, address_change, name_change, merger, demerger, dissolution, liquidation, insolvency, status_change, filing, correction, object_change, bylaws_change, legal_form_change, ownership_change, power_of_attorney, sale_of_business, debt_default, registry_closure, registry_reopening, reactivation, litigation, securities_issue, branch, charge, resolution, website, other (9 Oct 2026: 19 finer types; status_change now only status changes no finer type describes; ES/FR/GB gazettes plus FI/SE/BE/HR/DK/EE/SK/US register changes; none for IE/PL/NO) — or a raw register code kept as an alias (e.g. GB\'s OFFICER_CHANGE).'),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Filter events on or after this date (YYYY-MM-DD).'),
      date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Filter events on or before this date (YYYY-MM-DD).'),
      country: Country.optional(),
      limit: Limit,
      include: z.enum(['notice']).optional().describe('notice attaches to each event the publication behind it: notice {id, source (BORME, BODACC or Companies House), published_date, reference, type, court, region, url}, or null for other countries (they have no notice).'),
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
      include: z.enum(['notice']).optional().describe('notice attaches to each event the publication behind it (BORME, BODACC or Companies House), or null for other countries.'),
    }),
    handler: (args) => safeCall(() => getClient().get('/company-events/timeline', args)),
  },
  {
    name: 'event_detail',
    description: 'Fetch a single corporate-event record by Prometiam internal ID, with its full before/after values and, with include=notice, the source publication (BORME, BODACC or Companies House; null for other countries). Get an ID from events_search or events_timeline first.',
    schema: z.object({
      id: z.union([z.number().int(), z.string()]).describe('Prometiam internal company-event ID.'),
      include: z.enum(['notice']).optional().describe('notice attaches the publication behind the event, or null for other countries.'),
    }),
    handler: (args) => safeCall(() => getClient().get(`/company-events/records/${args.id}`)),
  },

  // ── People ───────────────────────────────────────────────────────────────
  {
    name: 'people_search',
    description: 'Search officers / directors / shareholders by name across EU + UK registries. Returns matching people with their appointment counts, ranked by a fuzzy-match match_score (0–100), best first. Use person_detail for a full appointment history. Scope with country — officer-level data is held for Spain, France, the UK and Norway; Ireland, Poland, Finland, Sweden, Croatia, Belgium, Denmark, Estonia, Slovakia and Switzerland are company-level only.',
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
    description: 'Screen a person or entity name against 44,000+ active sanctions and export-control designations with trigram fuzzy match. Covers five sanctions lists — EU consolidated, UN, OFAC, the UK Sanctions List (FCDO), and the French Registre des gels — plus 11 US export-control lists (BIS Entity List, Denied Persons, Unverified, Military End User; State ITAR-Debarred and Nonproliferation; OFAC SSI, CMIC, MBS, PLC, CAPTA). Refreshed daily. Returns matches with confidence score (0–100), source list, and aliases. Names in non-Latin scripts (Cyrillic, Greek, Arabic and others) are transliterated to Latin letters, in the query and in the listed names, before matching, so a name in its own script and in Latin spelling match the same entity. Use threshold to control match strictness. BETA.',
    schema: z.object({
      name: z.string().min(2).describe('Name to screen.'),
      threshold: z.number().int().min(50).max(100).default(80).describe('Minimum match-confidence percentage (50–100, default 80).'),
      // Values must match sanctions_entity.entity_type literally. 'any' and 'entity' were
      // in this enum and matched NOTHING -- and 'any' was the default, so every screen that
      // did not override it returned zero hits with HTTP 200, i.e. a silent false negative
      // on a compliance control. Omit for no filter.
      entity_type: z.enum(['person', 'company', 'vessel', 'aircraft', 'unknown']).optional()
        .describe('Restrict to one entity type. Omit to screen all types.'),
      include_pep: z.boolean().optional().describe('Also screen against politically exposed persons (BETA, Spain only, from Wikidata) and return a separate pep block. Membership is by OCCUPATION, not office: 44% of the set has no recorded office and local officials (6,108) outnumber national ones (3,191). Every hit carries positions[], pep_tier and has_current_office — read them rather than treating a match as a determination. Deceased people are never returned (a date of death on Wikidata, or born 100 or more years ago with no recorded death, counts as deceased). Holds no relatives or close associates, so on its own it does not satisfy a FATF PEP obligation.'),
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
    description: 'Search CORPORATE insolvency notices published in official gazettes and registers across France, Germany, the UK, Austria, Switzerland, Norway, Finland, the US, the Netherlands, Denmark, Croatia and Sweden. Use this for distress coverage in markets where no company registry is held (DE, AT, US, NL) — there the notices stand alone and are not linked to a company record. Norway, Finland, Denmark, Croatia, Sweden and Switzerland have registry coverage, so their notices can be cross-referenced against companies_search with the same country code (for FI, DK, HR, SE and CH the notices are linked by business ID, CVR number, MBS, organisationsnummer and UID: a company record with include=insolvency returns them; a Swiss notice is linked only where the SHAB notice names the debtor\'s UID, and one without a UID stays unlinked). DK notices come from CVR credit information (konkurs and tvangsakkord: one notice per proceeding, dated by the decision that opened it, with the latest stage of the proceeding; no court or case number); HR notices are court decisions from the Croatian court register (only companies still on the register); SE notices are Bolagsverket\'s procedure data (konkurs, företagsrekonstruktion, ackordsförhandling), updated weekly, with no court, case number or link, and proceedings that ended before collection are not included. Belgium, Estonia and Slovakia are not insolvency markets (their bankruptcy shows in the company status). US notices are not linked to the US company records. Personal/consumer insolvency is deliberately excluded and is never returned. Distinct from insolvency_search, which covers the linked ES/FR/GB risk-notice corpus.',
    schema: z.object({
      name: z.string().min(2).optional().describe('Company name — matched anywhere in the normalized name (min 2 characters).'),
      country: z.enum(['FR', 'DE', 'GB', 'AT', 'CH', 'NO', 'FI', 'US', 'NL', 'DK', 'HR', 'SE']).optional().describe('Insolvency-coverage country. This is NOT the same set as the company-registry countries.'),
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
    description: 'List public-contract awards by supplier, buyer, supplier tax id, CPV code and date, newest first. Spain (PLACSP, including minor contracts), France (DECP), the United Kingdom (Contracts Finder, Find a Tender) and Ireland, Poland and Norway (TED, above the EU thresholds only); pass country to restrict, omit it for all countries. One row per award to one supplier: amount_eur is that supplier\'s share as published, before VAT where the source distinguishes; amount_contract_eur is the whole contract; amount_is_ceiling marks a framework or dynamic-purchasing ceiling that is not spend; amount_suspect marks a form default rather than a price. bids_received is the competition signal where the source publishes it. company_id is set when the supplier resolves to a company record in that country (use company_detail on it). Natural-person suppliers are never returned. Requires at least one of company_id, nif, supplier, buyer, cpv or date_from.',
    schema: z.object({
      country: z.enum(['ES', 'FR', 'GB', 'IE', 'PL', 'NO']).optional().describe('Restrict to one country; omit for all countries.'),
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
      entity_type: z.enum(['person', 'company', 'vessel', 'aircraft']).optional(),
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
    description: 'Check up to 100 counterparties for CORPORATE insolvency notices in ONE call (POST /insolvency/check) across FR, DE, GB, AT, CH, NO, FI, US, NL, DK, HR and SE. Each item: country plus company_number (alias siren; exact, as printed on the notice) or name. Returns up to 5 notices per item, newest first, plus latest_filing_date; status found / none / error / timeout. "none" is not proof of solvency. Every item counts as one request. Optional idempotency_key: replaying the same key with the same items within 24h returns the original response for free (409 if still running, 422 if the items differ).',
    schema: z.object({
      items: z.array(z.object({
        country: z.enum(['FR', 'DE', 'GB', 'AT', 'CH', 'NO', 'FI', 'US', 'NL', 'DK', 'HR', 'SE']).optional(),
        company_number: z.string().optional().describe('Registry number as printed on the notice (SIREN for FR, HRB for DE with the register court, e.g. HRB 12653 Frankfurt am Main, since an HRB number repeats across courts, Companies House number for GB, org number for NO...).'),
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
    description: 'Validate an EU VAT number against VIES (the European Commission\'s VAT Information Exchange System) and return the registered trader name and address when valid. Covers the 27 EU member states plus XI (Northern Ireland); Greek numbers use the EL prefix and GB VAT is out of scope post-Brexit. Live official check — returns a retryable error when a member-state registry is temporarily down (not a false "invalid"). When VIES says a Spanish or German number is valid but withholds the name, registry_match {company_id, company_name, address, register} names the company our register holds under that number: register data, not VIES confirmation.',
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
    description: 'List the companies currently subscribed to ongoing monitoring for this API key, with their labels and last-alert timestamps. Company monitoring (ES, IE, PL, FI, SE, BE, HR, DK, EE, SK, CH, US) emits status changes, dissolutions, sanctions matches and, for ES and FI/SE/BE/HR/DK/EE/SK/CH/US, corporate events to a webhook.',
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
    description: 'Subscribe a company to ongoing monitoring. Status changes, dissolutions, sanctions matches and corporate events (ES and FI/SE/BE/HR/DK/EE/SK/CH/US) are scanned daily and POSTed to your webhook_url (HMAC-SHA256 signed). Returns the monitor ID and a webhook_secret (shown once). Available for Spain (ES), Ireland (IE), Poland (PL), Finland (FI), Sweden (SE), Belgium (BE), Croatia (HR), Denmark (DK), Estonia (e-Business Register), Slovakia (RPO) and Switzerland (Zefix) only. This creates a persistent subscription — confirm intent before calling.',
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
