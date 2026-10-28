# `prometiam-risk-mcp`

> Model Context Protocol server for the **Prometiam company data API** — official company-registry data for Spain, France, the UK, Ireland, Poland, Norway, Finland, Sweden, Croatia, Belgium, Denmark, Estonia, Slovakia, Switzerland, Latvia, Cyprus, Romania, Lithuania, Canada, Australia, Japan, Israel, Singapore, Colombia, Taiwan, Czech Republic, Germany, Brazil, Argentina, Ukraine and the United States (state registers, SEC EDGAR, GLEIF), plus directors, corporate events, insolvency, VAT/LEI lookup, sanctions screening, annual financial statements, public-procurement awards (Spain, France, the UK, Ireland, Poland, Norway) and public-buyer risk scores (Spain, France), as native MCP tools for Claude Desktop, Cursor, Continue, Cline, and any MCP-compatible client.

[![npm version](https://img.shields.io/npm/v/prometiam-risk-mcp.svg)](https://www.npmjs.com/package/prometiam-risk-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-green)](https://www.prometiam.com/openapi.json)

## What you get

36 MCP tools that wrap the [Prometiam Risk API](https://www.prometiam.com/risk-api/docs?utm_source=npm&utm_medium=readme):

| Tool | Description |
|---|---|
| `companies_search` | Search EU + UK companies by name, NIF (ES), SIREN/SIRET (FR), company_number (UK), organisation number (NO), Y-tunnus (FI), organisationsnummer (SE), MBS/OIB (HR), enterprise number (BE), CVR number (DK), juridinio asmens kodas (LT), corporation number or Business Number (CA), ACN, ARBN or ABN (AU), corporate number (JP), company number (IL), CNPJ (BR), NIT (CO), UEN (SG), unified business number (TW), IČO (CZ), or state registration number, CIK or LEI (US). |
| `company_by_identifier` | Find one company by VAT number (the prefix names the country), LEI or company number, the country worked out for you; answered like `company_detail`. |
| `company_detail` | Full company profile by Prometiam ID — officers, registry coordinates, capital, status. `include=risk_flags` attaches published tax-debt / debarment signals (ES). |
| `company_financials` | Annual financial statements as filed, mapped to one standard chart, in the filing currency and euro. GB, FR, DK, SE and NO, plus FI (statements filed digitally with PRH, the Finnish Patent and Registration Office: XBRL, the company's own accounts, about one filer in twenty, registered since July 2023, no employee count, profit before tax before appropriations; plus listed groups) US SEC filers (EDGAR XBRL annual reports, fiscal years from 2023) and consolidated annual reports of listed groups in GB, DK, SE, LV and LT (ESEF, IFRS, beside the individual accounts, fiscal years from 2022; the latest is fiscal 2024 for SE and 2023 for LV), and listed companies only in ES, PL, HR and BE (their ESEF annual financial reports, IFRS, mostly consolidated; not every listed company's report is held, and Polish reports arrive more than a year late; Spanish listed companies' reports are available free of charge on the CNMV website); FR accounts keyed by INPI from the filed documents, none for companies that declare them confidential (about 45% of French filers); elsewhere digitally filed accounts only (GB iXBRL about three in four; DK most small companies report gross profit instead of revenue; SE iXBRL; NO last three approved accounts, no employee count); the last three fiscal years at launch; Scale plan and above (Starter, Professional and free trial keys: 10 calls a month). EE: headline figures only (about sixteen summary items from the annual report: assets, equity, revenue, profits, employee expense, head count; total liabilities is assets minus equity), never a full statement, fiscal years 2019 on, updated monthly; some figures are read from PDF reports and non-profit income statements follow their own layout. Contains data from the Estonian e-Business Register (RIK), CC BY 4.0. LV: full balance sheet and profit and loss account with employees as filed, consolidated statements separate, fiscal years 2015 on in euro, no cash flow, no filing date, updated daily. Contains data from the Register of Enterprises of the Republic of Latvia (CC0). RO: headline indicators only (assets, equity, debts, net turnover, profit or loss, average employees) of companies filing with the Ministry of Finance, never a full statement, fiscal years 2019 on, in lei with euro copies, no banks, insurers or non-profits. Contains data from the Ministry of Finance of Romania (situații financiare, data.gov.ro), licensed under CC BY 4.0. LT: headline figures only (the balance sheet section totals: fixed assets, current assets, equity, liabilities; the profit and loss account revenue, profit before tax and net profit), never a full statement, individual and consolidated, fiscal years 2023 on in euro, no employees, updated daily from the open data of the register, which held filings up to March 2026 at launch. Contains data from the Register of Legal Entities (JAR), Registrų centras, via data.gov.lt, CC BY 4.0. Adapted by Prometiam. CO: companies that file NIIF statements with the Superintendencia de Sociedades only (groups 1 and 2; about 33,000 companies; banks and Superfinanciera issuers excluded; other Colombian companies answer availability `supersociedades_filers_only`), individual and consolidated, fiscal years 2023 on, in pesos with no euro copy (the ECB publishes no peso rate), no employees, personnel costs or depreciation, no filing date. Contains data from the Superintendencia de Sociedades (estados financieros NIIF), via www.datos.gov.co, licensed CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Modified by Prometiam; the Colombian records are offered under CC BY-SA 4.0 (share-alike). BR: listed companies only (about 750, the CVM DFP annual statements, individual and consolidated, in reais with euro copies, fiscal years 2023 on, updated weekly); other Brazilian companies publish none (`listed_companies_only`). Contains data from the Comissão de Valores Mobiliários (CVM), Portal Dados Abertos, licensed under the Open Database License (ODbL, share-alike). Adapted by Prometiam. AU: tax_records only, no financial statements (availability `tax_records_only`): the Australian Taxation Office's Corporate Tax Transparency report per income year from 2013-14 (total income, taxable income, tax payable, in Australian dollars) for large corporate tax entities, total income AUD 100 million and over (AUD 200 million for Australian-owned private companies up to 2021-22); a null taxable income or tax payable means withheld (zero or a loss), not 0. Contains data from the Australian Taxation Office (ATO), Corporate Tax Transparency report, licensed CC BY 3.0 AU (https://creativecommons.org/licenses/by/3.0/au/). Adapted by Prometiam; the credit and licence link travel with every answer. Finnish companies also return `tax_records`, the Finnish Tax Administration's public corporate income tax data (Verohallinto, CC BY 4.0) per tax year from 2020 (0 means none, not unknown). Not available for other companies there (availability listed_companies_only, sec_filers_only, supersociedades_filers_only or tax_records_only), nor for IE. Contains CVR data (Erhvervsstyrelsen), CC BY 4.0. Contains data from the Finnish Patent and Registration Office (PRH), CC BY 4.0. |
| `events_search` | Search normalized corporate events: capital changes, director changes, dissolutions, mergers, insolvency (ES, FR, GB from their gazettes; register-change events for IE, PL and NO (from 14 Oct 2026), and FI, SE, BE, HR, DK, EE, SK, CH, LV, CY, RO, LT, CA, AU, JP, IL, SG, CO, TW, BR, CZ, DE, UA, US; none for IE, PL, NO). |
| `events_timeline` | Event history for one company, newest first. |
| `event_detail` | A single corporate-event record by ID, with before/after values and source notice. |
| `people_search` | Search officers / directors / shareholders by name across registries. |
| `person_detail` | Officer / director profile with full appointment history across companies. |
| `directors_network` | Cross-directorship rollup — people appointed to many companies (nominee/hub detection, ES). |
| `sanctions_screen` | Trigram-fuzzy match against 44,000+ active designations — six sanctions lists (EU consolidated, UN, OFAC, the UK Sanctions List (FCDO), French Registre des gels, the Australian DFAT Consolidated List: Department of Foreign Affairs and Trade website – www.dfat.gov.au, CC BY 4.0) plus 11 US export-control lists (BIS Entity List, Denied Persons, Unverified, MEU; State ITAR-Debarred, ISN; OFAC SSI, CMIC, MBS, PLC, CAPTA). Refreshed daily. `include_pep=true` adds a PEP block (beta, ES, national politicians only — no relatives or close associates). |
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
| `insolvency_notices_search` | Corporate insolvency notices from official gazettes in FR, DE, GB, AT, CH, NO, FI, US, NL, DK, HR, SE, ES, LV, EE — distress coverage in markets with no registry held. Corporate only; personal insolvency is never returned. Spanish notices are the concurso entries (declaration, opening of the liquidation phase, conclusion) published in BORME since 2009, one per court resolution, linked by NIF and dated by the court's resolution date with the BORME publication date alongside (a median of about ten weeks later, sometimes more than a year); legal entities with a NIF only, judge and administrator never served, and an entry that cannot be tied to the company, or whose NIF is an administrator's, is withheld. Latvian notices are the Insolvency Register's insolvency and legal protection proceedings, an opening notice and a closing notice each, since 2008, with court and case number where stated, linked by registration number, legal persons of the commercial register only, updated daily. Estonian notices are bankruptcy declarations from the e-Business Register, one per register entry, dated by the entry (a few days after the court's order), linked by registry code, with no court, case number, trustee or closing notice, for companies still on the register, in liquidation or in bankruptcy only (a floor), sole traders (FIE) never served. Contains CVR data (Erhvervsstyrelsen), CC BY 4.0. Contains data from the Insolvency Register of the Republic of Latvia (Register of Enterprises), CC0. Contains data from the Estonian e-Business Register (RIK), CC BY 4.0. Spanish notices: based on data from the Agencia Estatal Boletín Oficial del Estado (BORME). |
| `companies_lookup` | Resolve up to 100 companies in one call by registry number, NIF, SIREN, VAT or name (best fuzzy match with match_score). Every item costs 1 credit; an over-quota batch is refused up front with `max_items_now`. |
| `sanctions_screen_batch` | Screen up to 50 names in one call (sanctions scope). Per-item status match / clear / error / timeout with the same hits as `sanctions_screen`. |
| `insolvency_check` | Check up to 100 counterparties for corporate insolvency notices in one call across FR, DE, GB, AT, CH, NO, FI, US, NL, DK, HR, SE, ES, LV, EE; up to 5 notices per item plus latest_filing_date. |
| `insolvency_record` | A single insolvency / risk notice by ID, with related events. |
| `coverage` | Dataset coverage stats per country (companies, events, freshness). |
| `account` | Calling key's plan, rate limits, credits used and left, and scopes. |
| `monitor_list` | List companies subscribed to ongoing monitoring for this key. |
| `monitor_get` | One monitored company by ID, with its alert history. |
| `monitor_subscribe` | Subscribe a company to monitoring, checked every 30 minutes from 05:00 to 22:30 UTC (status, dissolution, sanctions and, for ES, GB, IE/PL/NO (the last three from 14 Oct 2026) and FI/SE/BE/HR/DK/EE/SK/CH/LV/CY/RO/LT/CA/AU/JP/IL/SG/CO/TW/BR/CZ/DE/UA/US, corporate events → signed webhook). ES, GB, IE, PL, NO, FI, SE, BE, HR, DK, EE, SK, CH, LV, CY, RO, LT, CA, AU, JP, IL, SG, CO, TW, BR, CZ, DE, UA and US only. **Mutating.** |
| `monitor_stop` | Stop monitoring a company and delete the subscription. **Mutating.** |
| `procurement_awards` | Public-contract awards from Spain, France, the UK, Ireland, Poland and Norway by supplier, buyer, identifier, CPV code or date, one row per award to one supplier, linked to the supplier's registry record where the identifier resolves (ES, FR, GB). Ireland, Poland and Norway above the EU thresholds only. |
| `procurement_buyer` | Risk profile of a public buyer (the contracting body) in Spain or France — **beta**. Two calibrated scores: single-bid risk and supplier-insolvency exposure, each with a 1-10 score, a probability and the evidence awards. Never a supplier score. |
| `procurement_buyers` | List scored public buyers by either score — a portfolio screen, a region view, or a name lookup to find a buyer's id. Beta, ES + FR. |
| `procurement_relationship` | How dependent a public buyer and one of its five largest suppliers are on each other: awards, value, share, single-bid count, insolvency date. Beta, ES + FR. |

Source: Spain (BORME), France (BODACC), United Kingdom (Companies House), Ireland (CRO), Poland (KRS), Norway (Brønnøysundregistrene / Enhetsregisteret, NLOD), Finland (Kaupparekisteri), Sweden (Bolagsverket), Croatia (Sudski registar), Belgium (KBO/BCE), Denmark (CVR), Estonia (e-Business Register), Slovakia (RPO), Switzerland (Zefix), Latvia (Register of Enterprises), Cyprus (DRCOR), Romania (ONRC), Lithuania (JAR), Canada (Corporations Canada), Australia (ASIC and the ABR), Japan (National Tax Agency), Israel (Corporations Authority), Argentina (Registro Nacional de Sociedades), Brazil (CNPJ), Colombia (RUES), Singapore (ACRA), Taiwan (GCIS), the Czech Republic (public register of the Ministry of Justice, and RES), Germany (LEI-registered entities and energy-market register companies), Ukraine (EDR, Ministry of Justice), and in the United States the New York, Colorado, Connecticut, Pennsylvania, Florida, Iowa, the District of Columbia and Texas state registers, SEC EDGAR and GLEIF — 33M+ companies. Daily updates for Spain, France, Ireland, Poland and Norway, monthly bulk plus daily delta for the UK, every working day for Finland, Belgium, Denmark, Croatia, Estonia, Slovakia, Switzerland, Latvia, Lithuania, Canada, Japan, Israel, Taiwan and the Czech Republic, weekly for Sweden, Australia and the United States, and monthly for Cyprus, Romania, Singapore, Colombia, Brazil and Argentina. EU data residency.

Every company carries its age (`age_years`, `age_band`, `age_basis`: whole years on the day of the answer since the founding date, else the registration date; none for Switzerland and Japan, whose registers publish no founding date, and none for Germany, which serves no founding date; in an LEI layer the date is the entity creation date GLEIF holds, which can be later than the start of the company) and its industry in several vocabularies: the NACE class with its English title (`nace_title`), the same activity as a NACE Rev. 2 and a NACE Rev. 2.1 class or division, the ISIC Rev. 4 class and the US NAICS 2022 sector and subsector, through the official correspondence tables of Eurostat, the United Nations and the US Census Bureau: a class only where the table links exactly one, the division where the linked classes share one, otherwise null.

Officer/director data is held for Spain, France, the UK, Norway and Poland (Polish natural persons are masked by the register itself). Ireland is company-level for now. Ireland, Poland and Norway have register-change events only, from 14 Oct 2026 (no gazette). Finland, Sweden, Belgium, Croatia, Denmark, Estonia, Slovakia, Switzerland, Latvia, Cyprus, Romania, Lithuania, Canada, Australia, Japan, Israel, Singapore, Colombia, Taiwan, Czech Republic, Germany, Ukraine, Brazil and the United States are company records only, with register-change events (name, status, legal form and registered address; share capital for Croatia; for Ukraine name, status, legal form and share capital, no registered address; dated when the change first appears in the register data (for the United States, the weekly read of the registers that first sees it), not gazette notices, none before 2026-09-30) and monitoring, but no officers and no registry-compliance signal. Corporate insolvency notices are linked by business ID (Finland), organisationsnummer (Sweden), MBS (Croatia), CVR number (Denmark) and UID (Switzerland, where the SHAB notice names the debtor's UID): Swedish notices are Bolagsverket's procedure data (konkurs, företagsrekonstruktion, ackordsförhandling), updated weekly, with no court, case number or link; Croatian notices are court decisions with court and case number where the register states them, only for companies still on the register; Danish notices come from CVR credit information (konkurs and tvangsakkord): one notice per proceeding, dated by the decision that opened it, with the latest stage of the proceeding, with no court or case number. Spanish notices are the concurso entries (declaration, opening of the liquidation phase, conclusion) published in BORME since 2009, one per court resolution, linked by NIF and dated by the court's resolution date with the BORME publication date alongside (a median of about ten weeks later, sometimes more than a year); legal entities with a NIF only, judge and administrator never served, and an entry that cannot be tied to the company, or whose NIF is an administrator's, is withheld. Latvian notices are the Insolvency Register's insolvency and legal protection proceedings, an opening notice and a closing notice each, since 2008, with court and case number where stated, linked by registration number, legal persons of the commercial register only, updated daily. Estonian notices are bankruptcy declarations from the e-Business Register, one per register entry, dated by the entry (a few days after the court's order), linked by registry code, with no court, case number, trustee or closing notice, for companies still on the register, in liquidation or in bankruptcy only (a floor), sole traders (FIE) never served. Belgium and Slovakia have no insolvency notices (their bankruptcy shows in the company status and in their register-change events). Sole traders (enskild näringsverksamhet, trgovac pojedinac), enterprises of natural persons (eenmanszaak / entreprise individuelle), sole proprietorships (enkeltmandsvirksomhed) and estates are never served; Denmark has no share capital, and its status includes the register's bankruptcy state. Switzerland, Latvia and Cyprus have no activity code (Cyprus, Romania, Lithuania, Canada, Australia, Japan, Israel, Singapore, Colombia, Taiwan, Czech Republic and Brazil have no insolvency notices; Latvian individual merchants, Cypriot trade names and partnerships and Romanian natural persons and sole traders are never served; Cyprus has no VAT number; Romania has no share capital and its VAT number is built from the CUI by rule), and its sole proprietorships and other natural persons are never served. Every company object carries `vat_number` and `vat_number_source` (published by the register, or built from the identifier by rule where the registration is not confirmed; null for the UK, Ireland, Slovakia, Cyprus, the United States, Canada, Japan, Israel, Brazil, Colombia and Singapore). United States (country=US): company records from the business registers of New York, Colorado, Connecticut, Pennsylvania, Florida, Iowa, the District of Columbia and Texas (state open data and public records) plus SEC filers (EDGAR) and LEI holders (GLEIF) from every state, Delaware included, as one record per state registration (NY-4424185, CIK-0000320193, LEI-…); New York, Pennsylvania and Iowa active entities only; updated weekly; no officers and no registry-compliance signal, with register-change events (dated by the weekly read) and monitoring; no VAT number; US insolvency notices are not linked to the company records; sole proprietorships never served; not every US company. US sources: New York Department of State, Colorado Secretary of State, Connecticut Secretary of the State, Pennsylvania Department of State (open data), Florida Department of State, Division of Corporations (public records), Iowa Secretary of State (CC BY 4.0), District of Columbia Department of Licensing and Consumer Protection (CC BY 4.0), Texas Comptroller of Public Accounts (franchise tax data), SEC EDGAR, GLEIF (CC0). Contains CVR data (Erhvervsstyrelsen), CC BY 4.0. Source: Zefix, Federal Office of Justice, Federal Commercial Registry Office (open use, source required); restructured by Prometiam, not a certified register extract. Contains data from the Register of Enterprises of the Republic of Latvia and the State Revenue Service (CC0). Contains data from the Department of the Registrar of Companies and Intellectual Property (DRCOR), Republic of Cyprus, via data.gov.cy, CC BY 4.0. Contains data from the National Trade Register Office (ONRC), CC BY 4.0. Lithuania: Company records from the Register of Legal Entities (JAR): legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated each working day. Company status includes liquidation, bankruptcy and restructuring; there are no insolvency notices. Activity codes follow NACE Rev. 2.1 (EVRK 2.1, class level; the 6-digit code is in registry_details). Share capital is held for UAB and AB only. VAT numbers come from the State Tax Inspectorate (VMI) list. Sole proprietorships, partnerships (KUB, TUB), branches, state enterprises and non-commercial bodies are never served. Credit: Contains data from the Register of Legal Entities (JAR), Registrų centras, the State Data Agency (Statistics Lithuania) and the State Tax Inspectorate (VMI), CC BY 4.0. Adapted by Prometiam. Canada: Company records from Corporations Canada (Innovation, Science and Economic Development Canada): legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated each working day. Federal corporations only (Canada Business Corporations Act, Canada Cooperatives Act and the repealed Canada Corporations Act Part I and Cooperative Associations Act); provincial and territorial corporations, not-for-profit corporations and boards of trade are not in the register. There is no insolvency, liquidation or bankruptcy status (that is the Office of the Superintendent of Bankruptcy and the courts), no activity code, share capital or VAT number. The Business Number is searchable with business_number=, and a corporation's other names are in registry_details. Credit: Contains information licensed under the Open Government Licence – Canada (Corporations Canada, Innovation, Science and Economic Development Canada). Adapted by Prometiam. Australia: Company records from the Australian Securities and Investments Commission (ASIC) and the Australian Business Register (ABR): legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated weekly. Proprietary, public and foreign companies (ACN and ARBN) only; associations, cooperatives, other bodies, individuals and sole traders are never served. The register gives the state and the postcode, not a street address. ASIC does not separate liquidation from administration, so external administration shows as in_administration and there is no in_liquidation status; there are no insolvency notices. No activity code or share capital. The VAT number is the ABN when the ABN is active and registered for GST; an ABN is searchable with abn= and a GST-registered one with vat=. Data are licensed CC BY 3.0 AU (no sublicensing): the credit and licence link travel with every answer. Credit: Contains data from the Australian Securities and Investments Commission (ASIC) Company Dataset and the Australian Business Register (ABN Bulk Extract), licensed CC BY 3.0 AU (https://creativecommons.org/licenses/by/3.0/au/). Adapted by Prometiam (joined, normalised, status derived). Japan: Company records from the National Tax Agency corporate number publication site: legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated each working day, with a monthly full reconciliation. Companies (kabushiki, godo, gomei, goshi and tokurei yugen kaisha) and registered foreign companies only; national and local government bodies, associations and other corporations are never served. Status is active, deregistered or merged (with the successor's number): the register publishes no liquidation or insolvency state and there are no insolvency notices; no founding date, activity code, share capital or VAT number. The registration date is the date the corporate number was assigned and is null for companies that carry only the 5 October 2015 designation. Names are in Japanese; the English name, the kana reading and a romanised name are in registry_details. A search in Latin letters also meets the romanised name and, for about 3,600 companies (mostly large and listed), the English names GLEIF holds (CC0; search aliases only, name_en stays the National Tax Agency name). Credit: Source: National Tax Agency Corporate Number Publication Site (https://www.houjin-bangou.nta.go.jp/). Edited and processed by Prometiam; not a product of the National Tax Agency or the State. 出典：国税庁法人番号公表サイト（https://www.houjin-bangou.nta.go.jp/）。Prometiamが編集・加工して作成（国税庁が作成した情報ではありません）。 Israel: Company records from the Israeli Corporations Authority (Ministry of Justice): legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated each working day. Israeli and registered foreign companies only; partnerships, cooperative societies, non-profit associations and sole traders are other registers and are not served. Company status includes liquidation, receivership, restructuring and insolvency proceedings; there are no insolvency notices. Names are in Hebrew, with the English name in registry_details where the register holds one. A search in Latin letters also meets, for about 2,000 more companies, the English names GLEIF holds (CC0; search aliases only). No activity code, share capital or VAT number. Credit: Contains information from the Israeli Corporations Authority, Ministry of Justice, via data.gov.il (used under the data.gov.il terms of use). Adapted by Prometiam; not an official register extract. Brazil: Company records from the Cadastro Nacional da Pessoa Jurídica (CNPJ), Receita Federal do Brasil: legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated monthly (the Receita publishes one full file a month). Commercial legal persons only: limited companies (LTDA), corporations (S.A.), simple societies, single-member limited companies (EIRELI), public companies and mixed-capital companies, and cooperatives; sole traders (empresário individual, MEI included), non-profit entities, branches of foreign companies and every other natural-person form are never served. One record per CNPJ root, with the head office's 14-character CNPJ (shown 00.000.000/0001-91; the 8-digit root finds it too); branches are not served. Status is active, suspended, inapta (served as active_strike_off_pending), deregistered or merged; judicial recovery, bankruptcy, liquidation and intervention are read from the register's special situation, and there are no insolvency notices. The activity code is CNAE-Subclasses 2.3 (BR-CNAE-2.3), not a NACE code; a NACE Rev. 2 class (or only the NACE division) is derived from it through ISIC Rev. 4 where the official tables allow, and nace_derived marks it; the secondary codes are in registry_details. No VAT number (a vat search is refused), and no partners, officers or contacts. Credit: Contains data from the Cadastro Nacional da Pessoa Jurídica (CNPJ), Receita Federal do Brasil, published as open data (CC BY). Adapted by Prometiam. Colombia: Company records from Confecámaras (RUES, the Colombian chambers of commerce): legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated monthly: the source's own update date is data_as_of and is in the credit. Companies of the commercial register only (S.A.S., Ltda., S.A., S. en C., S.C.A., collective companies, single-person companies (E.U.) and branches of foreign companies); natural persons, non-profit entities, cooperatives and public bodies are never served. The register has no address, share capital, contact, activity description or VAT number (a vat search is refused), and no liquidation state: liquidation, judicial liquidation and reorganisation are read from the company name and served as the status, and a cancelled registration is deregistered or merged. The registration may not be current although it reads active: last_renewal_year in registry_details is the last year it was renewed. company_name is the name without those markers and name_as_registered is the name as published. The activity code is the CIIU Rev.4 A.C. 4-digit code (CO-CIIU-REV4-AC), not a NACE code; a NACE Rev. 2 class (or only the NACE division) is derived from it through ISIC Rev. 4 where the official tables allow, and nace_derived marks it. No insolvency notices. The records are offered under CC BY-SA 4.0 (share-alike). Credit: Contains data from Confecámaras (RUES, Registro Único Empresarial y Social), via the Portal de Datos Abiertos www.datos.gov.co, last updated on the date shown in data_as_of, licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Adapted by Prometiam; the adapted Colombian records are offered under CC BY-SA 4.0. Singapore: Company records from the Accounting and Corporate Regulatory Authority (ACRA): legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated monthly. Local companies, limited liability partnerships (LLP) and registered foreign company branches only; sole proprietorships, general partnerships and limited partnerships are never served. Status includes liquidation, judicial management and receivership, and a struck-off, dissolved or amalgamated company is deregistered or merged; there are no insolvency notices. The register publishes no cessation date, share capital, GST (VAT) number (a vat search is refused), region or officers. The activity code is SSIC 2020 (5 digits, SG-SSIC-2020; a legacy 4-digit code carries no scheme); a NACE Rev. 2 class (or only the NACE division) is derived from it through ISIC Rev. 4 where the official tables allow, and nace_derived marks it. The annual return and accounts-due dates are in registry_details as published. API use of the data is licensed, not a right to the data itself. Credit: Contains information from ACRA Information on Corporate Entities and Entities Registered with ACRA accessed on the date shown in data_as_of from the Accounting and Corporate Regulatory Authority (ACRA) via data.gov.sg, which is made available under the terms of the Singapore Open Data Licence version 1.0 (https://data.gov.sg/open-data-licence). Adapted by Prometiam; not an official ACRA extract. Taiwan: Company records from the Ministry of Economic Affairs (GCIS) and the Ministry of Finance (Fiscal Information Agency): legal name, legal form, status, registered address, identifiers and dates; no officers or registry-compliance signal; register-change events (name, status, legal form and registered address, dated when the change first appears in the register data, none before the first load) and monitoring are available. Updated each working day. Limited companies, companies limited by shares, unlimited companies, limited partnership companies and Taiwan branches of foreign companies only; sole proprietorships, partnerships, domestic branches, cooperatives, associations and representative offices are never served. Names and addresses are in Chinese (the register publishes no English name; the English name of a company registered as an importer or exporter with the Bureau of Foreign Trade, about one in five since 21 Oct 2026, is in registry_details.name_en and is searchable in Latin letters). The responsible person is not served. Status includes dissolution, reorganisation, receivership and bankruptcy. The VAT number is the unified business number where the company is in the Ministry of Finance tax file (searchable with vat=), else null. The activity code is the Ministry of Finance tax industry code (6 digits, TW-TAX-SIC), which is not a NACE code, and the other codes of the file are in secondary_activity_codes. The check digit of the number is advisory. No officers; no insolvency notices. Credit: Contains data from the Ministry of Economic Affairs (Department of Commerce, GCIS; International Trade Administration, English names) and the Ministry of Finance (Fiscal Information Agency), Republic of China (Taiwan), released under the Open Government Data License, version 1.0 (https://data.gov.tw/license). Adapted by Prometiam, not a certified register extract. Czech Republic: Company records from the Czech public register (Veřejný rejstřík), kept by the regional courts and published by the Ministry of Justice as open data, with the region (kraj) and the activity code from the Czech Statistical Office Register of Economic Entities (RES): legal name, legal form, status, registered address, share capital, identifiers and dates; no officers, partners or shareholders and no registry-compliance signal; register-change events (name, status, legal form, registered address and share capital, dated when the change first appears in the register data, none before the first load, October 2026) and monitoring are available. Updated each working day. Commercial legal persons only (s.r.o., a.s., v.o.s., k.s., cooperatives, SE, SCE and EEIG); sole traders (OSVČ) and every other natural person, associations, foundations, trust funds, owners associations (SVJ) and branches are never served. Status includes liquidation, insolvency, bankruptcy and restructuring; there are no insolvency notices (the Czech Republic is not one of the fifteen insolvency markets) and no financial statements. No VAT number: a vat search is refused. The activity code is CZ-NACE 2025. The IČO has eight digits and its check digit is advisory, so companies whose IČO fails it are served. The registering court and file number (for example B 1581, Městský soud v Praze) are in registry_details. Credit: Contains data from the public registers of the Czech Republic (Ministry of Justice, ISVR open data) and the Czech Statistical Office (RES, CC BY 4.0). Adapted by Prometiam. Germany (DE): LEI-registered entities (Global Legal Entity Identifier Foundation, GLEIF golden copy), plus companies listed in the energy market register (Marktstammdatenregister, Bundesnetzagentur) with their commercial-register entry that no LEI record holds; not the German commercial register (Handelsregister). The second source is a partial layer declared by the market actors and not checked against the commercial register: status null (local_status unknown), no founding date, no register-change events; registry_details.source is gleif or mastr. Company records only: the company number is the 20-character LEI (ISO 17442 check) or, for the energy market register, the commercial-register entry with the court (HRB12653/FRANKFURT-AM-MAIN), searchable with company_number, lei, or register_number (HRB12653, optional register_court); no officers, share capital, activity code or VAT number (a vat search is refused), no registry-compliance signal and no financial statements; register-change events for the LEI-registered entities (name, status, legal form, registered address, none before the first load, October 2026) and monitoring are available. Updated daily. GmbH, UG (haftungsbeschränkt), AG, KGaA, SE, OHG, KG (including GmbH & Co. KG), eG and PartG only; sole traders (e.K.) and other natural persons, GbR, associations (e.V.), foundations, public-law bodies, funds and branches are never served. Status is active, deregistered or merged; the LEI's own renewal status is registry_details.lei_status; the register court, register type and number (for example Amtsgericht München, HRB) are in registry_details. German corporate insolvency notices are served separately (Germany is one of the fifteen insolvency markets) and are not linked to these records. Credit: Contains LEI data from the Global Legal Entity Identifier Foundation (GLEIF), available under CC0 1.0. Not an extract of the German commercial register (Handelsregister). Energy market register records also carry: Contains data from the Marktstammdatenregister of the Bundesnetzagentur (https://www.marktstammdatenregister.de/MaStR/Datendownload), licensed under the Datenlizenz Deutschland – Namensnennung – Version 2.0 (dl-de/by-2-0, https://www.govdata.de/dl-de/by-2-0). Data changed: selected, joined and normalised by Prometiam. Ukraine (UA): company records from the Unified State Register of Legal Entities, Individual Entrepreneurs and Public Organisations (EDR) of the Ministry of Justice of Ukraine, updated weekly: legal name (in Ukrainian), legal form, status (including liquidation and bankruptcy proceedings), registration and termination dates, share capital (UAH) and the EDRPOU code, which is the company number (8 digits, leading zeros kept, for example 21673832; the check digit is advisory and a 10-digit number is refused). Register-change events (name, status, legal form and share capital, dated when first seen in the register data, none before the launch in October 2026) and monitoring are available. No officers, founders or beneficial owners, no registry-compliance signal, no address, activity code or contacts (withheld by the Ministry since martial law was introduced), no VAT number (a vat search is refused), no financial statements and no insolvency notices; commercial legal persons only, ended ones included, and individual entrepreneurs (FOP) and other natural persons, farms, associations, parties, unions, religious and charitable bodies, public bodies and branches are never served; some state and defence-related entities are not in the open data. Credit: Contains data from the Unified State Register of Legal Entities, Individual Entrepreneurs and Public Organisations (EDR), Ministry of Justice of Ukraine, published as open data on data.gov.ua under the Creative Commons Attribution licence (CC BY 4.0). Adapted by Prometiam.

## Install

```bash
npx -y prometiam-risk-mcp   # one-shot run, no install needed
# or
npm install -g prometiam-risk-mcp   # global install for the bin
```

## Configure

**It works without any key.** The server ships with a shared demo key — 30 requests a minute and 2,000 a day for everyone using it — so the first tool call answers right after `npx`. When the shared quota is used up the error tells you how to continue.

For your own credits — **14-day free trial: 500 credits; a card is required, nothing is charged for 14 days** — sign up at <https://www.prometiam.com/signup?utm_source=mcp> and set the key as an environment variable:

```bash
export PROMETIAM_API_KEY="rk_live_..."
```

## Hosted endpoint (no install)

The same 36 tools are served over Streamable HTTP at `https://api.prometiam.com/functions/v1/mcp`: no `npx` and no local process. Send your own key as `Authorization: Bearer rk_live_...` (`X-API-Key` works too). With no key it runs in demo mode on the shared demo key (30 requests a minute and 2,000 calls a day for everyone, the quota the npx demo shares); in demo mode some tools, such as `sanctions_screen` and `events_search`, answer `upgrade_required`. The endpoint holds no data and no secret: each tool call is one API request, priced in credits like the REST call (sanctions screening is beta). Your own key works only from a client that can send a request header.

Claude Code:

```bash
claude mcp add --transport http prometiam https://api.prometiam.com/functions/v1/mcp --header "Authorization: Bearer rk_live_..."
```

Cursor (`.cursor/mcp.json` in the project, or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "prometiam": {
      "url": "https://api.prometiam.com/functions/v1/mcp",
      "headers": { "Authorization": "Bearer ${env:PROMETIAM_API_KEY}" }
    }
  }
}
```

VS Code (`.vscode/mcp.json`; the key is `servers`, and the prompt keeps the key out of the file):

```json
{
  "servers": {
    "prometiam": {
      "type": "http",
      "url": "https://api.prometiam.com/functions/v1/mcp",
      "headers": { "Authorization": "Bearer ${input:prometiam-key}" }
    }
  },
  "inputs": [
    { "type": "promptString", "id": "prometiam-key", "description": "Prometiam API key", "password": true }
  ]
}
```

Windsurf (`mcp_config.json`):

```json
{
  "mcpServers": {
    "prometiam": {
      "serverUrl": "https://api.prometiam.com/functions/v1/mcp",
      "headers": { "Authorization": "Bearer ${env:PROMETIAM_API_KEY}" }
    }
  }
}
```

claude.ai and ChatGPT connectors: not yet. They need OAuth sign-in, which the hosted endpoint does not offer yet.

## Use with Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "prometiam-risk": {
      "command": "npx",
      "args": ["-y", "prometiam-risk-mcp"]
    }
  }
}
```

That config runs on the shared demo key, no signup. To use your own key, add `"env": { "PROMETIAM_API_KEY": "rk_live_..." }` next to `args` (an empty value or the placeholder `rk_live_your_key_here` is ignored and the demo key is used).

Restart Claude Desktop. The 36 tools appear in the tool list. Try:

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
      "args": ["-y", "prometiam-risk-mcp"]
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
          "args": ["-y", "prometiam-risk-mcp"]
        }
      }
    ]
  }
}
```

## Use with any other MCP client

Anything that speaks MCP over stdio works. Run the binary; set `PROMETIAM_API_KEY` in the environment only when you have your own key. JSON-RPC requests on stdin, responses on stdout, logs on stderr.

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

You should see a JSON-RPC response with all 36 tools and their schemas.

## Rate limits & pricing

Per Prometiam tier (returned in every response's `meta.rate_limit`). Every successful call costs credits (0 for account and coverage, 1 for a company search or record, 2 for corporate events, people, director network, insolvency and procurement, 3 for a sanctions screen per name, 25 for one company's financial statements); errors cost nothing, and each response states its cost in the `X-Credits-Cost` header:

| Tier | Price | Credits/month | Daily cap (credits) | RPM |
|---|---|---|---|---|
| Free trial | €0 | 500 in total | 200 | 10 |
| Starter | €9.99 | 1,000 | 1,000 | 60 |
| Professional | €29.99 | 10,000 | 10,000 | 120 |
| Scale | €99.99 | 50,000 | 50,000 | 300 |
| Enterprise | Custom | Custom | Custom | Custom |

## Privacy and data residency

- All requests hit the Prometiam Risk API in **EU** (AWS eu-central-1, Frankfurt).
- The MCP server adds **no telemetry of its own** — it just forwards requests to the API.
- Officer data is processed under GDPR Article 6(1)(c) (legal obligation of public registries) and 6(1)(f) (legitimate interest in fraud prevention).
- Mostly read-only. The mutating tools are `monitor_subscribe`, `monitor_stop`, `sanctions_watch` and `sanctions_unwatch` (create or delete a monitoring subscription or a sanctions watchlist entry tied to your key); every other tool is read-only.

## Source

This package is open source under the MIT license. The Risk API itself is a commercial service — see <https://www.prometiam.com/mcp> for the install page, or <https://www.prometiam.com?utm_source=npm&utm_medium=readme> for terms.

- API documentation: <https://www.prometiam.com/risk-api/docs?utm_source=npm&utm_medium=readme>
- OpenAPI 3.0 spec: <https://www.prometiam.com/openapi.json>
- Pricing: <https://www.prometiam.com/pricing?utm_source=npm&utm_medium=readme>
- Support: <https://www.prometiam.com/contact>

## License

MIT © Prometiam
