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

const Country = z.enum(['ES', 'FR', 'GB', 'IE', 'PL', 'NO', 'FI', 'SE', 'HR', 'BE', 'DK', 'EE', 'SK', 'CH', 'LV', 'CY', 'RO', 'LT', 'CA', 'AU', 'JP', 'IL', 'BR', 'CO', 'SG', 'TW', 'CZ', 'DE', 'US']).describe('Country code: ES (Spain, BORME), FR (France, BODACC), GB (UK, Companies House), IE (Ireland, CRO), PL (Poland, KRS), NO (Norway, Brønnøysundregistrene / Enhetsregisteret), FI (Finland, Kaupparekisteri, the Finnish Trade Register), SE (Sweden, Bolagsverket, the Swedish Companies Registration Office), HR (Croatia, Sudski registar, the Croatian court register), BE (Belgium, KBO/BCE, the Crossroads Bank for Enterprises), DK (Denmark, CVR, the Danish Central Business Register), EE (Estonia, the e-Business Register, RIK), SK (Slovakia, RPO, the Register of Legal Entities), CH (Switzerland, Zefix, the Swiss central business name index), LV (Latvia, the Register of Enterprises, Uzņēmumu reģistrs), CY (Cyprus, DRCOR, the Department of the Registrar of Companies and Intellectual Property), RO (Romania, ONRC, the National Trade Register Office), LT (Lithuania, JAR, the Register of Legal Entities), CA (Canada, Corporations Canada, federal corporations only), AU (Australia, ASIC and the Australian Business Register), JP (Japan, the National Tax Agency corporate number publication site), IL (Israel, the Corporations Authority), BR (Brazil, CNPJ, Receita Federal), CO (Colombia, RUES, Confecámaras), SG (Singapore, ACRA), TW (Taiwan, GCIS and the Ministry of Finance), CZ (Czech Republic, the public register of the Ministry of Justice and the Czech Statistical Office RES), DE (Germany, LEI-registered entities and energy-market register companies, not the commercial register), or US (United States: state business registers, SEC EDGAR and GLEIF). Ireland, Finland, Sweden, Croatia, Belgium, Denmark, Estonia, Slovakia, Switzerland, Latvia, Cyprus, Romania, Lithuania, Canada, Australia, Japan, Israel, Singapore, Colombia, Taiwan, Czech Republic, Germany, Brazil and the United States are company-level (companies only). Norway has companies and officers; Poland has companies and officers on the company record (management board, supervisory board, proxies and the representation rule from the KRS full extract; natural persons are masked by the register itself, so no person records, and the list is filled progressively); Ireland, Poland and Norway have register-change events only, from 14 Oct 2026 (no gazette). Finland, Sweden, Belgium, Croatia, Denmark, Estonia, Slovakia, Switzerland, Latvia, Cyprus, Romania, Lithuania, Canada, Australia, Japan, Israel, Singapore, Colombia, Taiwan, Czech Republic, Germany, Brazil and the United States have register-change events (name, status, legal form and registered address; share capital for HR, EE, SK, CH, LV, LT, TW, BR and CZ), dated when the change first appears in the register data (for the United States, the weekly read of the registers that first sees it) and none before 2026-09-30, and monitoring. Company records from the Finnish Trade Register: legal name, legal form, status, registered address, activity code and dates; no officers and no registry-compliance signal. Corporate insolvency notices are linked by business ID. Sweden: Company records from the Swedish Companies Registration Office (Bolagsverket): legal name, legal form, status, registered address, activity code and dates; no officers and no registry-compliance signal, and sole traders (enskild näringsverksamhet) are never served. Corporate insolvency notices (konkurs, företagsrekonstruktion, ackordsförhandling; weekly, no court or case number) are linked by organisationsnummer. Croatia: Company records from the Croatian court register (Sudski registar): legal name, legal form, status, registered address, activity code and dates; no officers and no registry-compliance signal, and sole traders (trgovac pojedinac) are never served. Corporate insolvency notices (court decisions, with court and case number where the register states them) are linked by MBS. Belgium: Company records from the Crossroads Bank for Enterprises (KBO/BCE): legal name, legal form, status, registered address, activity code and dates; no officers, no registry-compliance signal and no insolvency notices (Belgium is not an insolvency market: a bankruptcy shows in the company status and in its register-change events), and enterprises of natural persons (eenmanszaak / entreprise individuelle) are never served. Denmark: Company records from the Danish Central Business Register (CVR): legal name, legal form, status (including the register\'s bankruptcy state), registered address, activity code and dates; no officers, no registry-compliance signal and no share capital, and sole proprietorships (enkeltmandsvirksomhed) and estates are never served. Corporate insolvency notices (konkurs and tvangsakkord from CVR credit information: one notice per proceeding, dated by the decision that opened it, with the latest stage of the proceeding; no court or case number) are linked by CVR number. Estonia: Company records from the Estonian e-Business Register (RIK): legal name, legal form, status (including liquidation and bankruptcy), registered address, activity code (EMTAK 2008 or 2025, per company) and dates; with register-change events and monitoring, but no officers and no registry-compliance signal. Its bankruptcy declarations are served as insolvency notices. Sole traders (FIE) are never served, and the VAT number (KMKR) is searchable with `vat=`. Slovakia: Company records from the Slovak Register of Legal Entities (RPO): legal name, legal form, status (including bankruptcy (konkurz) and restructuring), registered address, activity code (SK NACE Rev. 2.1) and dates; with register-change events and monitoring, but no officers, no registry-compliance signal and no insolvency notices. Commercial legal persons only (no associations, foundations or other non-commercial entities); no VAT number (a `vat` search is refused); sole traders and other natural persons are never served. Romania: Company records from the National Trade Register Office (ONRC): legal name, legal form, status (including dissolution, liquidation, insolvency, reorganisation, bankruptcy and deregistration), registered address with the county, CAEN activity codes, the J registration number and EUID, and dates; with register-change events and monitoring, but no officers, no registry-compliance signal, no share capital and no insolvency notices. Natural persons and sole traders are never served. The CUI (2 to 10 digits, check digit advisory) is the company_number; the Romanian VAT number (RO plus the CUI, built by rule) is searchable with `vat=`. Cyprus: Company records from the Department of the Registrar of Companies and Intellectual Property (DRCOR): legal name, legal form, status (including strike-off pending, voluntary and compulsory liquidation and administration), registered address with the district and dates; with register-change events and monitoring, but no officers, no registry-compliance signal, no activity code, no share capital, no VAT number (a vat search is refused) and no insolvency notices. Companies and overseas companies only; trade names and partnerships are never served. Latvia: Company records from the Register of Enterprises of the Republic of Latvia (Uzņēmumu reģistrs): legal name, legal form, status (including liquidation, insolvency and legal protection proceedings), registered address with the region, share capital, previous names and dates; with register-change events and monitoring, but no officers, no registry-compliance signal, no activity code. Its Insolvency Register proceedings are served as insolvency notices. Individual merchants and other natural persons are never served. The registration number (11 digits, an LV prefix optional, with a mod-11 check that is enforced) is the company_number, and the Latvian VAT number (LV plus the registration number) is searchable with `vat=`. Switzerland: Company records from Zefix, the Swiss central business name index: legal name, legal form, status (including liquidation), registered address with the canton and business purpose; with register-change events and monitoring, but no officers, no registry-compliance signal and no activity code (the register publishes no NOGA code). Legal entities and branches only; sole proprietorships (Einzelunternehmen) and other natural persons are never served. Corporate insolvency notices (SHAB) are linked by UID where the notice names the debtor\'s UID. Commercial-register publications of the Swiss Official Gazette of Commerce (SHAB) are served as gazette events for Swiss legal entities and branches, from publications of 1 January 2024 (new entry, change of name, seat, address, purpose, capital, legal form, auditor, board or signatories, merger, liquidation, bankruptcy, deletion), dated by the publication date, linked by UID, with the SHAB publication as notice_url; the notice text and the names of board members and signatories are never served (a board or signatory change says only that persons changed). The gazette events are a summary derived from the SOGC publications; the publication linked as notice_url is the authoritative text. The UID with its MWST, TVA or IVA suffix is searchable with `vat=`. United States: there is no national register, so the API serves company records from the business registers of New York, Colorado, Connecticut, Pennsylvania, Florida, Iowa, the District of Columbia and Texas (state open data and public records) plus SEC filers (EDGAR) and LEI holders (GLEIF) from every state, Delaware included, as one record per state registration (domestic or foreign); numbers look like NY-4424185, CO-20091096973, DE-10684990, CIK-0000320193 or LEI-… and identifiers also carry the SEC CIK, the EIN of SEC filers and the LEI; New York, Pennsylvania and Iowa publish active entities only (Florida serves active and inactive entities: profit corporations, limited liability companies, limited partnerships and non-profit corporations, domestic and foreign; the District of Columbia serves every status, a closed one with its reason, and Iowa the home-office address, neither with registered agents or beneficial owners; Texas serves franchise tax taxpayers that hold a Secretary of State file number, from the file of the Comptroller of Public Accounts and not the Secretary of State register, forfeited and closed ones with their status) and the SEC gives no legal status; updated weekly; company-level (no officers and no registry-compliance signal, with register-change events (dated by the weekly read) and monitoring), no VAT number (a `vat` search is refused), sole proprietorships never served, and not every US company. US insolvency notices are on insolvency_search and are not linked to the company records. US sources: New York Department of State, Colorado Secretary of State, Connecticut Secretary of the State, Pennsylvania Department of State (open data), Florida Department of State, Division of Corporations (public records), Iowa Secretary of State (CC BY 4.0), District of Columbia Department of Licensing and Consumer Protection (CC BY 4.0), Texas Comptroller of Public Accounts (franchise tax data), SEC EDGAR, GLEIF (CC0). Lithuania: Company records from the Register of Legal Entities (JAR): legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated each working day. Company status includes liquidation, bankruptcy and restructuring; there are no insolvency notices. Activity codes follow NACE Rev. 2.1 (EVRK 2.1, class level; the 6-digit code is in registry_details). Share capital is held for UAB and AB only. VAT numbers come from the State Tax Inspectorate (VMI) list. Sole proprietorships, partnerships (KUB, TUB), branches, state enterprises and non-commercial bodies are never served. Credit: Contains data from the Register of Legal Entities (JAR), Registrų centras, the State Data Agency (Statistics Lithuania) and the State Tax Inspectorate (VMI), CC BY 4.0. Adapted by Prometiam. Canada: Company records from Corporations Canada (Innovation, Science and Economic Development Canada): legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated each working day. Federal corporations only (Canada Business Corporations Act, Canada Cooperatives Act and the repealed Canada Corporations Act Part I and Cooperative Associations Act); provincial and territorial corporations, not-for-profit corporations and boards of trade are not in the register. There is no insolvency, liquidation or bankruptcy status (that is the Office of the Superintendent of Bankruptcy and the courts), no activity code, share capital or VAT number. The Business Number is searchable with business_number=, and a corporation\'s other names are in registry_details. Credit: Contains information licensed under the Open Government Licence – Canada (Corporations Canada, Innovation, Science and Economic Development Canada). Adapted by Prometiam. Australia: Company records from the Australian Securities and Investments Commission (ASIC) and the Australian Business Register (ABR): legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated weekly. Proprietary, public and foreign companies (ACN and ARBN) only; associations, cooperatives, other bodies, individuals and sole traders are never served. The register gives the state and the postcode, not a street address. ASIC does not separate liquidation from administration, so external administration shows as in_administration and there is no in_liquidation status; there are no insolvency notices. No activity code or share capital. The VAT number is the ABN when the ABN is active and registered for GST; an ABN is searchable with abn= and a GST-registered one with vat=. Data are licensed CC BY 3.0 AU (no sublicensing): the credit and licence link travel with every answer. Credit: Contains data from the Australian Securities and Investments Commission (ASIC) Company Dataset and the Australian Business Register (ABN Bulk Extract), licensed CC BY 3.0 AU (https://creativecommons.org/licenses/by/3.0/au/). Adapted by Prometiam (joined, normalised, status derived). Japan: Company records from the National Tax Agency corporate number publication site: legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated each working day, with a monthly full reconciliation. Companies (kabushiki, godo, gomei, goshi and tokurei yugen kaisha) and registered foreign companies only; national and local government bodies, associations and other corporations are never served. Status is active, deregistered or merged (with the successor\'s number): the register publishes no liquidation or insolvency state and there are no insolvency notices; no founding date, activity code, share capital or VAT number. The registration date is the date the corporate number was assigned and is null for companies that carry only the 5 October 2015 designation. Names are in Japanese; the English name, the kana reading and a romanised name are in registry_details. A search in Latin letters also meets the romanised name and, for about 3,600 companies (mostly large and listed), the English names GLEIF holds (CC0; search aliases only, name_en stays the National Tax Agency name). Credit: Source: National Tax Agency Corporate Number Publication Site (https://www.houjin-bangou.nta.go.jp/). Edited and processed by Prometiam; not a product of the National Tax Agency or the State. 出典：国税庁法人番号公表サイト（https://www.houjin-bangou.nta.go.jp/）。Prometiamが編集・加工して作成（国税庁が作成した情報ではありません）。 Israel: Company records from the Israeli Corporations Authority (Ministry of Justice): legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated each working day. Israeli and registered foreign companies only; partnerships, cooperative societies, non-profit associations and sole traders are other registers and are not served. Company status includes liquidation, receivership, restructuring and insolvency proceedings; there are no insolvency notices. Names are in Hebrew, with the English name in registry_details where the register holds one. A search in Latin letters also meets, for about 2,000 more companies, the English names GLEIF holds (CC0; search aliases only). No activity code, share capital or VAT number. Credit: Contains information from the Israeli Corporations Authority, Ministry of Justice, via data.gov.il (used under the data.gov.il terms of use). Adapted by Prometiam; not an official register extract. Brazil: Company records from the Cadastro Nacional da Pessoa Jurídica (CNPJ), Receita Federal do Brasil: legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated monthly (the Receita publishes one full file a month). Commercial legal persons only: limited companies (LTDA), corporations (S.A.), simple societies, single-member limited companies (EIRELI), public companies and mixed-capital companies, and cooperatives; sole traders (empresário individual, MEI included), non-profit entities, branches of foreign companies and every other natural-person form are never served. One record per CNPJ root, with the head office\'s 14-character CNPJ (shown 00.000.000/0001-91; the 8-digit root finds it too); branches are not served. Status is active, suspended, inapta (served as active_strike_off_pending), deregistered or merged; judicial recovery, bankruptcy, liquidation and intervention are read from the register\'s special situation, and there are no insolvency notices. The activity code is CNAE-Subclasses 2.3 (BR-CNAE-2.3), not a NACE code; a NACE Rev. 2 class (or only the NACE division) is derived from it through ISIC Rev. 4 where the official tables allow, and nace_derived marks it; the secondary codes are in registry_details. No VAT number (a vat search is refused), and no partners, officers or contacts. Credit: Contains data from the Cadastro Nacional da Pessoa Jurídica (CNPJ), Receita Federal do Brasil, published as open data (CC BY). Adapted by Prometiam. Colombia: Company records from Confecámaras (RUES, the Colombian chambers of commerce): legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated monthly: the source\'s own update date is data_as_of and is in the credit. Companies of the commercial register only (S.A.S., Ltda., S.A., S. en C., S.C.A., collective companies, single-person companies (E.U.) and branches of foreign companies); natural persons, non-profit entities, cooperatives and public bodies are never served. The register has no address, share capital, contact, activity description or VAT number (a vat search is refused), and no liquidation state: liquidation, judicial liquidation and reorganisation are read from the company name and served as the status, and a cancelled registration is deregistered or merged. The registration may not be current although it reads active: last_renewal_year in registry_details is the last year it was renewed. company_name is the name without those markers and name_as_registered is the name as published. The activity code is the CIIU Rev.4 A.C. 4-digit code (CO-CIIU-REV4-AC), not a NACE code; a NACE Rev. 2 class (or only the NACE division) is derived from it through ISIC Rev. 4 where the official tables allow, and nace_derived marks it. No insolvency notices. The records are offered under CC BY-SA 4.0 (share-alike). Credit: Contains data from Confecámaras (RUES, Registro Único Empresarial y Social), via the Portal de Datos Abiertos www.datos.gov.co, last updated on the date shown in data_as_of, licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Adapted by Prometiam; the adapted Colombian records are offered under CC BY-SA 4.0. Singapore: Company records from the Accounting and Corporate Regulatory Authority (ACRA): legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated monthly. Local companies, limited liability partnerships (LLP) and registered foreign company branches only; sole proprietorships, general partnerships and limited partnerships are never served. Status includes liquidation, judicial management and receivership, and a struck-off, dissolved or amalgamated company is deregistered or merged; there are no insolvency notices. The register publishes no cessation date, share capital, GST (VAT) number (a vat search is refused), region or officers. The activity code is SSIC 2020 (5 digits, SG-SSIC-2020; a legacy 4-digit code carries no scheme); a NACE Rev. 2 class (or only the NACE division) is derived from it through ISIC Rev. 4 where the official tables allow, and nace_derived marks it. The annual return and accounts-due dates are in registry_details as published. API use of the data is licensed, not a right to the data itself. Credit: Contains information from ACRA Information on Corporate Entities and Entities Registered with ACRA accessed on the date shown in data_as_of from the Accounting and Corporate Regulatory Authority (ACRA) via data.gov.sg, which is made available under the terms of the Singapore Open Data Licence version 1.0 (https://data.gov.sg/open-data-licence). Adapted by Prometiam; not an official ACRA extract. Taiwan: Company records from the Ministry of Economic Affairs (GCIS) and the Ministry of Finance (Fiscal Information Agency): legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated each working day. Limited companies, companies limited by shares, unlimited companies, limited partnership companies and Taiwan branches of foreign companies only; sole proprietorships, partnerships, domestic branches, cooperatives, associations and representative offices are never served. Names and addresses are in Chinese (the register publishes no English name; the English name of a company registered as an importer or exporter with the Bureau of Foreign Trade, about one in five since 21 Oct 2026, is in registry_details.name_en and is searchable in Latin letters). The responsible person is not served. Status includes dissolution, reorganisation, receivership and bankruptcy. The VAT number is the unified business number where the company is in the Ministry of Finance tax file (searchable with vat=), else null. The activity code is the Ministry of Finance tax industry code (6 digits, TW-TAX-SIC), which is not a NACE code, and the other codes of the file are in secondary_activity_codes. The check digit of the number is advisory. No officers; no insolvency notices. Credit: Contains data from the Ministry of Economic Affairs (Department of Commerce, GCIS; International Trade Administration, English names) and the Ministry of Finance (Fiscal Information Agency), Republic of China (Taiwan), released under the Open Government Data License, version 1.0 (https://data.gov.tw/license). Adapted by Prometiam, not a certified register extract. Czech Republic: Company records from the Czech public register (Veřejný rejstřík), kept by the regional courts and published by the Ministry of Justice as open data, with the region (kraj) and the activity code from the Czech Statistical Office Register of Economic Entities (RES): legal name, legal form, status, registered address, share capital, identifiers and dates; no officers, partners or shareholders and no registry-compliance signal; register-change events (name, status, legal form, registered address and share capital, dated when the change first appears in the register data, none before the first load, October 2026) and monitoring are available. Updated each working day. Commercial legal persons only (s.r.o., a.s., v.o.s., k.s., cooperatives, SE, SCE and EEIG); sole traders (OSVČ) and every other natural person, associations, foundations, trust funds, owners associations (SVJ) and branches are never served. Status includes liquidation, insolvency, bankruptcy and restructuring; there are no insolvency notices (the Czech Republic is not one of the fifteen insolvency markets) and no financial statements. No VAT number: a vat search is refused. The activity code is CZ-NACE 2025. The IČO has eight digits and its check digit is advisory, so companies whose IČO fails it are served. The registering court and file number (for example B 1581, Městský soud v Praze) are in registry_details. Credit: Contains data from the public registers of the Czech Republic (Ministry of Justice, ISVR open data) and the Czech Statistical Office (RES, CC BY 4.0). Adapted by Prometiam. Germany (DE): LEI-registered entities (Global Legal Entity Identifier Foundation, GLEIF golden copy), plus companies listed in the energy market register (Marktstammdatenregister, Bundesnetzagentur) with their commercial-register entry that no LEI record holds; not the German commercial register (Handelsregister). The second source is a partial layer declared by the market actors and not checked against the commercial register: status null (local_status unknown), no founding date, no register-change events; registry_details.source is gleif or mastr. Company records only: the company number is the 20-character LEI (ISO 17442 check) or, for the energy market register, the commercial-register entry with the court (HRB12653/FRANKFURT-AM-MAIN), searchable with company_number, lei, or register_number (HRB12653, optional register_court); no officers, share capital, activity code or VAT number (a vat search is refused), no registry-compliance signal and no financial statements; register-change events for the LEI-registered entities (name, status, legal form, registered address, none before the first load, October 2026) and monitoring are available. Updated daily. GmbH, UG (haftungsbeschränkt), AG, KGaA, SE, OHG, KG (including GmbH & Co. KG), eG and PartG only; sole traders (e.K.) and other natural persons, GbR, associations (e.V.), foundations, public-law bodies, funds and branches are never served. Status is active, deregistered or merged; the LEI\'s own renewal status is registry_details.lei_status; the register court, register type and number (for example Amtsgericht München, HRB) are in registry_details. German corporate insolvency notices are served separately (Germany is one of the fifteen insolvency markets) and are not linked to these records. Credit: Contains LEI data from the Global Legal Entity Identifier Foundation (GLEIF), available under CC0 1.0. Not an extract of the German commercial register (Handelsregister). Energy market register records also carry: Contains data from the Marktstammdatenregister of the Bundesnetzagentur (https://www.marktstammdatenregister.de/MaStR/Datendownload), licensed under the Datenlizenz Deutschland – Namensnennung – Version 2.0 (dl-de/by-2-0, https://www.govdata.de/dl-de/by-2-0). Data changed: selected, joined and normalised by Prometiam. Defaults to first country in the API key allowlist.')

/**
 * Monitoring covers a NARROWER set than the registry corpus — see the
 * `/monitor` request body in public/openapi.json, which pins country to
 * ES/GB/IE/PL/NO/FI/SE/BE/HR/DK/EE/SK/CH/LV/CY/RO/LT/CA/AU/JP/IL/SG/CO/TW/BR/CZ/DE/US. France has no monitoring implementation, so
 * they must not be offered here: an accepted value the API cannot honour is a
 * false capability, not a convenience.
 */
const MonitorCountry = z.enum(['ES', 'GB', 'IE', 'PL', 'NO', 'FI', 'SE', 'BE', 'HR', 'DK', 'EE', 'SK', 'CH', 'LV', 'CY', 'RO', 'LT', 'CA', 'AU', 'JP', 'IL', 'SG', 'CO', 'TW', 'BR', 'CZ', 'DE', 'US']).describe('Country of the company to monitor: ES (default), GB, IE, PL, NO, FI, SE, BE, HR, DK, EE, SK, CH, LV, CY, RO, LT, CA, AU, JP, IL, SG, CO, TW, BR, CZ, DE or US. Monitoring is not available for FR.')

const Limit = z.number().int().min(1).max(100).default(20).describe('Maximum number of results to return (1–100, default 20).')
const Cursor = z.string().optional().describe('Pagination cursor — pass the previous response\'s pagination.next_cursor, unchanged, to fetch the next page (a company name search issues o:<n>, the rows already served).')

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
    description: 'Search EU + UK companies in official registries by name or identifier. Every company is one standard object with the same keys in all 29 countries (null where the register publishes no value): identifiers [{type, value}], vat_number and vat_number_source (register or rule; also in identifiers as type vat; `register`: published by the register (EE; LV from the State Revenue Service’s list of VAT payers; LT from the State Tax Inspectorate’s list; AU the ABN while GST-registered; TW the unified business number where the company is in the tax file) or the register confirms VAT registration and the number is the legal format of its identifier (NO, FI, BE). `rule`: built from the company identifier (ES `ES`+NIF, FR `FR`+key+SIREN, PL `PL`+NIP, NO `NO`+number+`MVA`, FI, SE `SE`+number+`01`, BE, HR `HR`+OIB, DK, RO `RO`+CUI): the format is right, the registration is not confirmed (check it with `GET /vat/{number}`). Null where the register says the company is not VAT-registered (NO, FI), where a Latvian company is not on the State Revenue Service’s list of VAT payers, and where no rule exists (GB, IE, SK, CY, US, CA, JP, IL, BR, CO, SG, CZ, DE, and EE without a published KMKR).), the standard legal_form abbreviation and legal_form_family beside the register\'s local_legal_form and local_legal_form_name, a standard status and stage beside the register\'s own local_status, one main activity_code with its scheme, label and NACE class, address with region, capital_amount and capital_eur, and registry_details for what only one register has (null when the dictionary does not recognise a stored value — never a guess). Use country to scope the search to Spain (BORME), France (BODACC), the UK (Companies House), Ireland (CRO), Poland (KRS), Norway (Brønnøysundregistrene), Finland (Kaupparekisteri), Sweden (Bolagsverket), Croatia (Sudski registar), Belgium (KBO/BCE), Denmark (CVR), Estonia (e-Business Register), Slovakia (RPO), Switzerland (Zefix), Latvia (Register of Enterprises), Cyprus (DRCOR), Romania (ONRC), Lithuania (JAR), Canada (Corporations Canada), Australia (ASIC and the ABR), Japan (National Tax Agency), Israel (Corporations Authority), Brazil (CNPJ), Colombia (RUES), Singapore (ACRA), Taiwan (GCIS), the Czech Republic (public register, Ministry of Justice, and RES), Germany (LEI-registered entities and energy-market register companies), or the United States (state registers, SEC EDGAR and GLEIF). Fuzzy name results carry a match_score (0–100) and are ranked by relevance, best first. NOTE: "dissolved" means different things by country — ES/FR still exists pending liquidation, GB/IE/PL/NO/FI no longer exists — read status (the standard value), not local_status, to compare across countries. Norway and France include sole proprietorships (ENK, EI) as the register publishes them; a French company that opted out of publication (INSEE non-diffusible) has company_name null, status withheld and registry_details.non_diffusible true, is left out of name searches, the founding-date feed and event searches by name, and is found by SIREN or SIRET. A Spanish company closed by a merger is served as closed (local_status absorbed). A malformed identifier (a Spanish NIF must pass its control character), or a limit outside the documented range, is a 400 validation_error. A name search ranks a pool of up to about 700 candidates and pages through it: when has_more is true, pass next_cursor (o:<n>) back as cursor (offset=<n> is the same), 1 credit a page; a page past the pool is empty. match_score (0-100) means the same in every country: 100 the name is the query, 80-99 it starts with the words of the query, 50-79 it holds every word, below 50 parts of words. To fetch one company by its register number (NIF, SIREN, CRN, KRS, CVR) use company_detail with country and company_number.',
    schema: z.object({
      name: z.string().optional().describe('Company name — fuzzy normalized match.'),
      // 'nif' was removed here because handleCompaniesSearch did not read it. It does now
      // (risk-api dc4b37b5, 2026-08-30): nif and vat are aliases for company_number. Keeping
      // it absent was not neutral -- the only working field was labelled "UK Companies House
      // number", so a model holding a Spanish NIF was steered away from the one parameter
      // that would have answered it.
      nif: z.string().optional().describe('Spanish NIF/CIF — exact match, e.g. A78053147. Alias of company_number.'),
      vat: z.string().optional().describe('VAT number — exact match, with its country prefix or without (ES ESA28015865, FR FR+key+SIREN, PL PL+NIP, NO NO+number+MVA; a malformed or wrong-country value is a 400). Otherwise an alias of company_number. For country FI, the Finnish VAT number FI plus the eight digits of the Y-tunnus, e.g. FI01120389; for country SE, the Swedish VAT number SE plus the ten digits of the organisationsnummer and 01, e.g. SE556012579001; for country HR, the Croatian VAT number HR plus the eleven digits of the OIB, e.g. HR27759560625; for country BE, the Belgian VAT number BE plus the ten digits of the enterprise number, e.g. BE0417497106; for country DK, the Danish VAT number DK plus the eight digits of the CVR number, e.g. DK24256790; for country EE, the Estonian VAT number (KMKR) EE plus nine digits, e.g. EE100354546, where the register publishes it (it is not the registry code; a VAT group number can be shared by the members of the group, so a search can return more than one company); for country CH, the Swiss VAT number, the UID followed by MWST, TVA or IVA, e.g. CHE-103.867.266 MWST; for country LV, the Latvian VAT number, LV plus the eleven digits of the registration number, e.g. LV40003032949; for country RO, the Romanian VAT number, RO plus the CUI, e.g. RO5022670 (built by rule, the registration is not confirmed); for country LT, the Lithuanian VAT number, LT plus 9 or 12 digits, e.g. LT100538411, where the State Tax Inspectorate (VMI) lists the company; for country AU, the GST number, the eleven-digit ABN, e.g. 49004028077, found only while the ABN is active and registered for GST; for country TW, the unified business number, e.g. 22099131, where the company is in the Ministry of Finance tax file; Slovakia, Cyprus, the United States, Canada, Japan, Israel, Brazil, Colombia, Singapore and the Czech Republic have no VAT number, so vat is refused for country SK, CY, US, CA, JP, IL, BR, CO, SG and CZ.'),
      abn: z.string().optional().describe('Australian Business Number (11 digits, e.g. 49004028077; an ABN prefix and spaces are optional) — exact match, with country AU. A wrong check digit is a 400 validation_error, and with any other country it is a 400. A company\'s ACN or ARBN goes in company_number.'),
      business_number: z.string().optional().describe('Canadian Business Number (CRA, 9 digits, e.g. 847871746; a 15-character program account such as 847871746RC0001 names the same number) — exact match, with country CA. Several federal corporations can carry the same Business Number, so the answer is a list. With any other country it is a 400.'),
      siren: z.string().optional().describe('French SIREN (9 digits), e.g. 552032534.'),
      siret: z.string().optional().describe('French SIRET (14 digits).'),
      nip: z.string().optional().describe('Polish NIP (10 digits), exact match — use with country PL. The KRS number goes on company_number.'),
      regon: z.string().optional().describe('Polish REGON (9 or 14 digits), exact match — use with country PL.'),
      oib: z.string().optional().describe('Croatian OIB (11 digits), exact match — use with country HR. The ISO 7064 check digit is verified and a wrong one is a 400. The MBS goes on company_number.'),
      // Resolves per country: NIF for ES, SIREN for FR, registration number for GB/IE/PL/NO, Y-tunnus for FI, organisationsnummer for SE, MBS for HR, enterprise number for BE, CVR number for DK.
      // Describing it as UK-only was wrong and cost real lookups.
      company_number: z.string().optional().describe('Registry identifier — exact match. Resolves per country: Spanish NIF/CIF (A78053147), French SIREN, UK Companies House number (00445790, SC123456), the IE/PL/NO registration number, for country FI a Y-tunnus such as 0112038-9 (the hyphen is optional; a wrong check digit is a 400), for country SE an organisationsnummer such as 556012-5790 (the hyphen is optional; a wrong check digit, or a third digit below 2, is a 400), for country HR an MBS such as 080000604 (a dropped leading zero is restored; the check digit is advisory, so only a wrong length is a 400), for country BE an enterprise number such as 0417.497.106 (the dots and spaces are optional; a wrong check digit is a 400), or for country DK a CVR number such as 24256790 (eight digits; the mod-11 check is advisory, so only a number that is not eight digits is a 400), for country LT a juridinio asmens kodas such as 110053842 (nine digits, the ninth a check digit; an LT prefix is a VAT number and is refused), for country CA a corporation number such as 426160-7 (the last digit is a check digit), for country AU an ACN or ARBN such as 004 028 077, for country JP a 13-digit corporate number such as 1180301018771 (the first digit is a check digit), for country IL a company number such as 520013954 (nine digits starting 51, 52 or 56), for country BR a CNPJ such as 33.000.167/0001-01 (the 8-digit root finds the head office), for country CO a NIT such as 900843898-9, for country SG a UEN such as 196800306E, for country TW a unified business number such as 22099131, for country CZ an IČO such as 45274649 (eight digits), for country DE the 20-character LEI such as W38RGI023J3WT1HWRP32 (ISO 17442 check), or for country US a state code and register number such as NY-4424185, CIK- and the SEC number such as CIK-0000320193, or LEI- and the 20-character LEI (no check digit; the dash is optional).'),
      lei: z.string().optional().describe('Legal Entity Identifier (20 characters, ISO 17442 check) — exact match, in every live country (resolved through our GLEIF links to the company whose registration carries it; with country DE an alias of company_number for the LEI-registered entities). Not the Handelsregister.'),
      register_number: z.string().optional().describe('German commercial-register entry, with country DE only: the register type (HRA, HRB, GnR, PR, VR, GsR) and the number, for example HRB12653 or HRB 12653. A number repeats across courts, so the answer is every court company with that number, from both German sources; narrow it with register_court. Any other country is a 400.'),
      register_court: z.string().optional().describe('Register court, with register_number and country DE: the city or the Amtsgericht (Frankfurt am Main, Amtsgericht München). Spellings of one court are read as the same court.'),
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
      offset: z.number().int().min(0).optional().describe('Name search only: rows of the ranked pool to skip, the same as cursor o:<offset>. No effect on the other modes.'),
    }),
    handler: (args) => safeCall(() => getClient().get('/companies/search', args)),
  },
  {
    name: 'company_detail',
    description: 'Fetch a single company by Prometiam internal ID, or by the register\'s own number: give country and company_number (NIF, SIREN or SIRET, CRN, KRS, CVR, ...; GET /companies/{country}/{company_number}, 1 credit, same answer and same include). No company with that number is a 404; a number several companies carry (US registers, a German commercial-register entry) is a 409 ambiguous_company_number whose error.candidates list the ids. Returns full profile including officers, registry coordinates, founding date, capital, current standard status (with stage and the register\'s local_status), standard legal form (with local_legal_form), identifiers and registry_details. include=lei (Spain) adds lei_record, the GLEIF record; lei is the code string. recent_events (ES/FR/GB) carries the same served event_type + raw act_type as events_search. Get an ID from companies_search first. Pass include to attach extra blocks — notably risk_flags (published tax-debt / debarment signals) and insolvency. UK disqualified directors: on a GB company, `disqualified_officers` lists the company\'s CURRENT officers who are on the Companies House register of disqualified directors with a disqualification in force (each with the same `disqualifications` entry as /people/{id}); an empty list means none found, null means the register could not be read (retry). Matched as on /people/{id} (full name plus birth month), so only persons with significant control are covered, not directors.',
    schema: z.object({
      id: z.union([z.number().int(), z.string()]).optional().describe('Prometiam internal company ID (integer). Omit it and give country and company_number to look the company up by its register number.'),
      company_number: z.string().optional().describe('The register\'s number for the country (NIF/CIF, SIREN or SIRET, Companies House number, KRS, CVR, ...), instead of id; needs country.'),
      country: Country.optional(),
      include: z.string().optional().describe('Comma-separated extra blocks: procurement, insolvency, financials, lei, risk_flags, structure, charges — or all (all adds lei and risk_flags; name procurement, insolvency, financials and structure explicitly). structure adds corporate_structure: the direct and ultimate parent as reported to GLEIF (Level 2, CC0) for a company of any live country that carries an LEI (null with a meta.notice when none is linked: not reported, not no parent). For a Spanish company the block is returned even without an LEI and carries register_ownership: the sole shareholder named by the BORME sole-shareholder notices since 2009 (companies only; a natural person is never stored or served; null sole_shareholder means no notice names a company, not that there is no owner), the ultimate owner, the foreign parent of a branch (NIF W) and the companies it solely owns, all figures floors; credit: Based on data from the Agencia Estatal Boletín Oficial del Estado (BORME). financials adds latest_financials (GB, FR, DK, SE, NO, FI, US SEC filers, EE, LT and RO headline figures, LV, CO Superintendencia de Sociedades filers, BR listed companies, and listed companies in ES, PL, HR, BE; Scale plan and above; see company_financials for the limits). charges (GB) asks Companies House live for the secured-debt summary when the nightly crawl has not reached it (the summary is registry_details.charges: outstanding, satisfied and part-satisfied counts, latest charge date, lenders of the outstanding charges; null = not fetched yet, unknown, never none). risk_flags is Spain only and each row states whether its identifier was read directly from the source or reconstructed with name corroboration.'),
    }),
    handler: (args) => safeCall(() => {
      const { id, company_number, country, ...rest } = args
      if (id === undefined || id === '') {
        if (!company_number || !country) throw new Error('give id, or country and company_number')
        return getClient().get(`/companies/${encodeURIComponent(String(country))}/${encodeURIComponent(String(company_number))}`, rest)
      }
      return getClient().get(`/companies/${id}`, country ? { ...rest, country } : rest)
    }),
  },
  {
    name: 'company_financials',
    description: 'Annual financial statements of a company as filed with the official registers, mapped to one standard chart (revenue, gross profit, operating profit, net profit, assets, cash, equity, liabilities, employees), in the filing currency and in euro, up to ten fiscal years. A null figure was not stated in the filing, never zero. Annual accounts as filed, for GB, FR, DK, SE and NO, plus FI (statements filed digitally with PRH, the Finnish Patent and Registration Office: XBRL, the company own accounts, about one filer in twenty, registered since July 2023, no employee count, profit before tax before appropriations; plus listed groups), US SEC filers (annual reports 10-K, 20-F and 40-F from EDGAR XBRL, consolidated, US GAAP or IFRS, fiscal years from 2023, in the filing currency (mostly USD) plus euro; no statements for other US companies) and consolidated annual reports of listed groups in GB, DK, SE, LV and LT (ESEF, IFRS, beside the individual accounts, fiscal years from 2022; the latest is fiscal 2024 for SE and 2023 for LV), and listed companies only in ES, PL, HR and BE (their ESEF annual financial reports, IFRS, mostly consolidated; the report of every listed company is not held, and Polish reports arrive more than a year late; reports of Spanish listed companies are available free of charge on the CNMV website). FR: accounts keyed by INPI from the filed documents; none for companies that declare their accounts confidential (about 45% of French filers), and no profit and loss account where only it is declared confidential. Elsewhere only digitally filed accounts: GB electronic (iXBRL) filings, about three in four, where small and micro companies often file no profit and loss account; DK XBRL annual reports, where most small companies report gross profit instead of revenue (Contains CVR data (Erhvervsstyrelsen), CC BY 4.0.); SE digitally filed (iXBRL) reports only; NO the last three approved accounts, with no employee count in the accounts. GB, DK, SE, LV and LT also hold the consolidated annual financial report of listed groups and other issuers (ESEF, IFRS; UKSEF for GB), statement_type consolidated, annual reports only, fiscal years from 2022, as filings.xbrl.org (XBRL International) collects them (an issuer registered elsewhere, a building society or a mutual is not matched; SE: no report added after May 2025, LV after July 2024); credit: Contains annual financial reports published by the issuers (ESEF, IFRS), collected by XBRL International (filings.xbrl.org). Adapted by Prometiam. The last three fiscal years at launch. Figures in the filing currency plus euro at the ECB annual average of the fiscal year (for comparison, not an accounting translation). EE: headline figures only (about sixteen summary items from the annual report: assets, equity, revenue, profits, employee expense, head count; total liabilities is assets minus equity), never a full statement, fiscal years 2019 on (a fiscal year whose report carries no figures in the open data is absent), updated monthly; some figures are read from PDF reports and non-profit income statements follow their own layout. Contains data from the Estonian e-Business Register (RIK), CC BY 4.0. LV: full balance sheet and profit and loss account with employees as filed, consolidated statements separate, fiscal years 2015 on in euro, no cash flow, no filing date, updated daily. Contains data from the Register of Enterprises of the Republic of Latvia (CC0). RO: headline indicators only (assets, equity, debts, net turnover, profit or loss, average employees) of companies filing with the Ministry of Finance, never a full statement, fiscal years 2019 on, in lei with euro copies, no banks, insurers or non-profits. Contains data from the Ministry of Finance of Romania (situații financiare, data.gov.ro), licensed under CC BY 4.0. LT: headline figures only (the balance sheet section totals: fixed assets, current assets, equity, liabilities; the profit and loss account revenue, profit before tax and net profit), never a full statement, individual and consolidated, fiscal years 2023 on in euro, no employees, updated daily from the open data of the register, which held filings up to March 2026 at launch. Contains data from the Register of Legal Entities (JAR), Registrų centras, via data.gov.lt, CC BY 4.0. Adapted by Prometiam. CO: companies that file NIIF statements with the Superintendencia de Sociedades only (groups 1 and 2; about 33,000 companies; banks and Superfinanciera issuers excluded; other Colombian companies answer availability `supersociedades_filers_only`), individual and consolidated, fiscal years 2023 on, in pesos with no euro copy (the ECB publishes no peso rate), no employees, personnel costs or depreciation, no filing date. Contains data from the Superintendencia de Sociedades (estados financieros NIIF), via www.datos.gov.co, licensed CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Modified by Prometiam; the Colombian records are offered under CC BY-SA 4.0 (share-alike). BR: listed companies only (about 750, the CVM DFP annual statements, individual and consolidated, in reais with euro copies, fiscal years 2023 on, updated weekly); other Brazilian companies publish none (`listed_companies_only`). Contains data from the Comissão de Valores Mobiliários (CVM), Portal Dados Abertos, licensed under the Open Database License (ODbL, share-alike). Adapted by Prometiam. AU: tax_records only, no financial statements (availability `tax_records_only`): the Australian Taxation Office Corporate Tax Transparency report per income year from 2013-14 (total income, taxable income, tax payable, in Australian dollars) for large corporate tax entities, total income AUD 100 million and over (AUD 200 million for Australian-owned private companies up to 2021-22); a null taxable income or tax payable means withheld (zero or a loss), not 0. Contains data from the Australian Taxation Office (ATO), Corporate Tax Transparency report, licensed CC BY 3.0 AU (https://creativecommons.org/licenses/by/3.0/au/). Adapted by Prometiam; the credit and licence link travel with every answer. Finnish companies also return data.tax_records (newest tax year first, from tax year 2020; Finnish Tax Administration public corporate income tax data, CC BY 4.0; 0 means none, not unknown; null when the read failed) and meta.tax_note. Contains data from the Finnish Patent and Registration Office (PRH), CC BY 4.0. Other companies in ES, PL, HR, BE and BR (meta.availability listed_companies_only), other US (sec_filers_only) and Colombian (supersociedades_filers_only) companies, Australian companies (tax_records_only: no statements), Finnish companies without a digital filing (no_statement_held) and IE (PDF images) answer with empty statements and meta.availability. Needs the Scale plan or above (Starter, Professional and free trial keys get 10 calls a month, then upgrade_required). A call that returns statements costs 25 credits; an answer with no statement held costs 0 and uses none of the 10 calls. Every null figure is explained in statements[].quality.missing ({field: reason}: confidential, not_filed, reported_as_gross_profit, not_published_by_register, not_stated, not_collected_for_source); also in figures and figures_eur: operating_cash_flow, capital_expenditure, free_cash_flow (operating cash flow less capital expenditure, where both are filed), dividends_paid (cash paid out as positive amounts; DK and SE: the dividends distributed in the year), cost_of_sales, tax_expense, retained_earnings, financial_debt_long_term, financial_debt_short_term, trade_payables and provisions, each read only where the country\'s source gives it (cash flow: US SEC filers, listed companies in ES, PL, HR, BE and FI, and BR; none for GB, DK, SE, NO), and what the filing declares: accounts_type (GB, DK, NO, US), audit.status (GB, DK, NO), audit.opinion (BR: unqualified, qualified, adverse, disclaimer) and audit.auditor_name (DK), each null where nothing is stated; for Norway the latest statement of the company itself carries the head count of the register record when the accounts have none (quality.notes employees_from_register, today\'s figure); company.employee_band is France only (INSEE size band today). A statement that carries ratios also carries ratio_benchmarks: per ratio {percentile (5 to 95; higher means a higher ratio, not a better one), cell {country, nace_division, size_band, year, companies}} among peers of the same country, NACE division, size band (total assets in euro) and statement type, in cells of at least 30 companies (a year with fewer is pooled with the year before, cell.pooled), or null where no cell exists. The peers are the companies with filed statements in this dataset, not every company of the sector; cells exist for GB, FR, DK, SE, NO, FI, EE, LT and RO only, and not for a company without a NACE-based activity code. A percentile is descriptive, not a rating.',
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
    description: 'Search normalized corporate-event records (capital changes, director changes, dissolutions, mergers, insolvency, name changes, etc.) by company, or, with neither company_name nor company_number, as the country event feed (every event of that country, country then required, newest first, from date_from: default 7 days ago, at most 31 days back), for Spain, France and the UK (from their gazettes) and, as register-change events, for Ireland, Poland, Norway, Finland, Sweden, Belgium, Croatia, Denmark, Estonia, Slovakia, Switzerland, Latvia, Cyprus, Romania, Lithuania, Canada, Australia, Japan, Israel, Singapore, Colombia, Taiwan, Czech Republic, Germany, Brazil and the United States. Returns events with a served event_type matching this enum for each of those countries (each row also carries act_type, the raw BORME/BODACC/Companies House code it was derived from, or null when not yet covered), event date, before/after values, and source notice URL. The register-change events of the five (name, status, legal form and registered address; share capital for HR, EE, SK, CH, LV, LT, TW, BR and CZ) are dated when the change first appears in the register data (for the United States, the weekly read of the registers that first sees it), are not gazette notices and start on 2026-09-30. Ireland, Poland and Norway publish no gazette either; their register-change events are dated the same way and none are before 14 Oct 2026.',
    schema: z.object({
      company_name: z.string().optional().describe('Company name — fuzzy match.'),
      company_number: z.string().optional().describe('Registry registration number — exact match.'),
      event_type: z.string().optional().describe('One of new_incorporation, director_change, capital_change, address_change, name_change, merger, demerger, dissolution, liquidation, insolvency, status_change, filing, correction, object_change, bylaws_change, legal_form_change, ownership_change, power_of_attorney, sale_of_business, debt_default, registry_closure, registry_reopening, reactivation, litigation, securities_issue, branch, charge, resolution, website, other (a court-ordered liquidation or a bankruptcy, e.g. French liquidation judiciaire or a UK winding-up order, is insolvency; liquidation is voluntary or creditors\' liquidation; 9 Oct 2026: 19 finer types; status_change now only status changes no finer type describes; ES/FR/GB gazettes plus IE/PL/NO (from 14 Oct 2026) and FI/SE/BE/HR/DK/EE/SK/US register changes) — or a raw register code kept as an alias (e.g. GB\'s OFFICER_CHANGE).'),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Filter events on or after this date (YYYY-MM-DD). In the country feed: default 7 days ago, at most 31 days back.'),
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
    description: 'Search officers / directors / shareholders by name across EU + UK registries. Returns matching people with their appointment counts, ranked by a fuzzy-match match_score (0–100), best first. Use person_detail for a full appointment history. Scope with country — officer-level data is held for Spain, France, the UK and Norway (Polish officers are on the company record only: the KRS masks natural persons, so there are no person records); Ireland, Finland, Sweden, Croatia, Belgium, Denmark, Estonia, Slovakia, Switzerland, Latvia, Cyprus and Romania are company-level only.',
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
    description: 'Fetch a single person (officer / director) by Prometiam internal ID. Returns the person\'s full appointment history across all companies. Useful for director-network analysis and counterparty due diligence. Get the ID from a company_detail or people_search response. UK disqualified directors: on a GB person, `disqualifications` is the person\'s entry on the Companies House register of disqualified directors (orders and undertakings under the Company Directors Disqualification Act 1986, and sanctions-regime disqualifications) with each period, the section of the Act, whether it is an order, an undertaking or a sanction, and the companies named; null when the person is not on the register. Matched on the words of the full name and the month and year of birth together (the register publishes no id shared with the officer records), so only persons with significant control, whose birth month is held, can match, never a director listed without a birth month; two register entries with the same name and birth month match nobody; `match_basis` says whether a company named in the disqualification is also one the person is linked to. An identity match on those signals, not a determination. Month and year of birth only, no address. Contains public sector information licensed under the Open Government Licence v3.0.',
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
    description: 'Screen a person or entity name against 44,000+ active sanctions and export-control designations with trigram fuzzy match. Covers six sanctions lists — EU consolidated, UN, OFAC, the UK Sanctions List (FCDO), the French Registre des gels, and the Australian DFAT Consolidated List (Department of Foreign Affairs and Trade website – www.dfat.gov.au, CC BY 4.0) — plus 11 US export-control lists (BIS Entity List, Denied Persons, Unverified, Military End User; State ITAR-Debarred and Nonproliferation; OFAC SSI, CMIC, MBS, PLC, CAPTA). Refreshed daily. Returns matches with a match score (0–100, by match type as on company search: 100 the name is the query, 80–99 it starts with it, 50–79 it holds the words, under 50 only parts of words), source list, aliases and the country as an ISO code (country_as_listed keeps the spelling as listed); the same entity on several lists is one row per list unless group is entity. Names in non-Latin scripts (Cyrillic, Greek, Arabic and others) are transliterated to Latin letters, in the query and in the listed names, before matching, so a name in its own script and in Latin spelling match the same entity. Use threshold to control match strictness. BETA.',
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
    description: 'Search CORPORATE insolvency notices published in official gazettes and registers across France, Germany, the UK, Austria, Switzerland, Norway, Finland, the US, the Netherlands, Denmark, Croatia, Sweden, Spain, Latvia and Estonia. Use this for distress coverage in all fifteen markets. DE, AT, US and NL notices stand alone: they are not linked to company records (German and US company records come from other sources and do not carry them). FR, GB, NO and ES notices are linked by company number or NIF, and the notices of the other registry countries can be cross-referenced against companies_search with the same country code (for FI, DK, HR, SE and CH the notices are linked by business ID, CVR number, MBS, organisationsnummer and UID: a company record with include=insolvency returns them; a Swiss notice is linked only where the SHAB notice names the debtor\'s UID, and one without a UID stays unlinked). DK notices come from CVR credit information (konkurs and tvangsakkord: one notice per proceeding, dated by the decision that opened it, with the latest stage of the proceeding; no court or case number); HR notices are court decisions from the Croatian court register (only companies still on the register); SE notices are Bolagsverket\'s procedure data (konkurs, företagsrekonstruktion, ackordsförhandling), updated weekly, with no court, case number or link, and proceedings that ended before collection are not included. Belgium and Slovakia are not insolvency markets (their bankruptcy shows in the company status). Spanish notices are the concurso entries (declaration, opening of the liquidation phase, conclusion) published in BORME since 2009, one per court resolution, linked by NIF and dated by the court\'s resolution date with the BORME publication date alongside (a median of about ten weeks later, sometimes more than a year); legal entities with a NIF only, judge and administrator never served, and an entry that cannot be tied to the company, or whose NIF is an administrator\'s, is withheld. Latvian notices are the Insolvency Register\'s insolvency and legal protection proceedings, an opening notice and a closing notice each, since 2008, with court and case number where stated, linked by registration number, legal persons of the commercial register only, updated daily. Estonian notices are bankruptcy declarations from the e-Business Register, one per register entry, dated by the entry (a few days after the court\'s order), linked by registry code, with no court, case number, trustee or closing notice, for companies still on the register, in liquidation or in bankruptcy only (a floor), sole traders (FIE) never served. Spanish notices: based on data from the Agencia Estatal Boletín Oficial del Estado (BORME). Contains data from the Insolvency Register of the Republic of Latvia (Register of Enterprises), CC0. Contains data from the Estonian e-Business Register (RIK), CC BY 4.0.. US notices are not linked to the US company records. Personal/consumer insolvency is deliberately excluded and is never returned. Distinct from insolvency_search, which covers the linked ES/FR/GB risk-notice corpus. Contains CVR data (Erhvervsstyrelsen), CC BY 4.0.',
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
    name: 'company_by_identifier',
    description: 'Find ONE company from an identifier, the country worked out for you (GET /companies/by-identifier, 1 credit, answered like company_detail with the same include). type=vat: the prefix names the country (ES, FR, ... EL is Greece, XI Northern Ireland, CHE Switzerland), then that country VAT search runs; a number without a prefix needs country; countries whose registers publish no VAT number answer 400. type=lei: our GLEIF links first, else GLEIF own record (legal-address country plus registered-as number). type=company_number: needs country. meta.resolved_by says which rule found it (vat_prefix, vat_with_country, lei_link, gleif_registration, company_number). No match is a 404; several records (a US number repeated across states) a 409 with candidates.',
    schema: z.object({
      type: z.enum(['vat', 'lei', 'company_number']).describe('The kind of identifier in value.'),
      value: z.string().min(1).describe('The VAT number, the 20-character LEI or the register company number.'),
      country: Country.optional().describe('Required with type=company_number and with a VAT number that has no prefix; optional otherwise.'),
      include: z.string().optional().describe('Extra blocks to attach, as on company_detail.'),
    }),
    handler: (args) => safeCall(() => getClient().get('/companies/by-identifier', args)),
  },
  {
    name: 'companies_lookup',
    description: 'Resolve up to 100 companies in ONE call (POST /companies/lookup). Each item needs country plus an identifier (company_number; aliases nif, siren, vat) or a name (best fuzzy match with match_score). Results come back in request order with status found / not_found / error / timeout and the same company object companies_search returns. Every item costs 1 credit; a batch that does not fit is refused with 429 batch_exceeds_quota and max_items_now. Optional idempotency_key: replaying the same key with the same items within 24h returns the original response for free (409 if still running, 422 if the items differ).',
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
    description: 'Screen up to 50 names against the sanctions lists in ONE call (POST /sanctions/screen). Requires the sanctions scope (batch calls do not use the free trial allowance); every item costs 3 credits. Per-item status: match / clear / error / timeout. "clear" means no hit at or above the threshold on the active lists, not a certification. Optional idempotency_key: replaying the same key with the same items within 24h returns the original response for free (409 if still running, 422 if the items differ).',
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
    description: 'Check up to 100 counterparties for CORPORATE insolvency notices in ONE call (POST /insolvency/check) across FR, DE, GB, AT, CH, NO, FI, US, NL, DK, HR, SE, ES, LV and EE. Each item: country plus company_number (alias siren; exact, as printed on the notice) or name. Returns up to 5 notices per item, newest first, plus latest_filing_date; status found / none / error / timeout. "none" is not proof of solvency. Every item costs 2 credits. Optional idempotency_key: replaying the same key with the same items within 24h returns the original response for free (409 if still running, 422 if the items differ).',
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
    description: 'Returns the calling API key\'s account info and current usage: plan tier, rate limits (per minute in requests, per day / month in credits), credits used and left, and enabled scopes. Use this to check "how many credits do I have left?".',
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
    description: 'Search the GLEIF global LEI register by legal-entity name (full-text). Returns candidate LEIs with legal name, jurisdiction, status, and city/country — use to resolve a company name to its LEI before lei_lookup. Ranked by match_score (exact name, then names starting with yours, then names holding the words), so name=telefonica lists TELEFONICA SA first.',
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
    description: 'List the companies currently subscribed to ongoing monitoring for this API key, with their labels and last-alert timestamps. Company monitoring (ES, GB, IE, PL, NO, FI, SE, BE, HR, DK, EE, SK, CH, LV, CY, RO, LT, CA, AU, JP, IL, SG, CO, TW, BR, CZ, DE, US) emits status changes, dissolutions, sanctions matches and, for ES, GB, IE/PL/NO (the last three from 14 Oct 2026) and FI/SE/BE/HR/DK/EE/SK/CH/LV/CY/RO/LT/CA/AU/JP/IL/SG/CO/TW/BR/CZ/DE/US, corporate events to a webhook.',
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
    description: 'Subscribe a company to ongoing monitoring. Status changes, dissolutions, sanctions matches and corporate events (ES, GB, IE/PL/NO (the last three from 14 Oct 2026) and FI/SE/BE/HR/DK/EE/SK/CH/LV/CY/RO/LT/CA/AU/JP/IL/SG/CO/TW/BR/CZ/DE/US) are checked every 30 minutes from 05:00 to 22:30 UTC and POSTed to your webhook_url (HMAC-SHA256 signed). Returns the monitor ID and a webhook_secret (shown once). Available for Spain (ES), the United Kingdom (GB), Ireland (IE), Poland (PL), Norway (NO), Finland (FI), Sweden (SE), Belgium (BE), Croatia (HR), Denmark (DK), Estonia (e-Business Register), Slovakia (RPO), Switzerland (Zefix), Latvia (Register of Enterprises), Cyprus (DRCOR), Romania (ONRC), Lithuania (JAR), Canada (federal corporations), Australia (ASIC and ABR), Japan (NTA), Israel (Corporations Authority), Singapore (ACRA), Colombia (RUES), Taiwan (GCIS), Brazil (CNPJ), the Czech Republic and Germany (LEI-registered entities and energy-market register companies, sanctions matches only for the latter), that is every live country except France. A dissolution alert fires on the dissolution date the register gives or, where the register gives none (Canada, Israel, Singapore, Taiwan, Romania, many US registrations), when the status first shows closed (detail.date_basis first_seen_closed, else register). This creates a persistent subscription — confirm intent before calling.',
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
