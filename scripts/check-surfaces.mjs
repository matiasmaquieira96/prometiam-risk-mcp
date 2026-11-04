#!/usr/bin/env node
// check-surfaces.mjs — drift detector for the four places this MCP server is published.
//
//   local        mcp/risk-mcp/package.json + server.json  (source of truth)
//   npm          registry.npmjs.org/prometiam-risk-mcp
//   github       the PUBLIC mirror matiasmaquieira96/prometiam-risk-mcp
//                (the main repo is private, so the mirror is what the world reads)
//   mcp registry registry.modelcontextprotocol.io
//
// These drift independently and silently. On 2026-07-28 all four disagreed: local was 0.2.8
// while npm, the mirror and the registry all sat at 0.2.4 — and the registry's listing still
// described the product as "Spain, France, the UK, Ireland and Poland", omitting Norway, which
// had shipped two days earlier. Nothing anywhere reported a problem.
//
// Run:  node scripts/check-surfaces.mjs
// Exit: 0 = all four agree, 1 = drift (gate CI on this).
//
// Deliberately NOT wired into `npm run build` — it needs network, and during a release the
// surfaces are *legitimately* out of step until publishing finishes. It belongs in scheduled
// CI and in a pre-release check, not in the inner loop.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { listProblems, readTools } from './tool-annotations.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// The hosted server (docs/mcp-remote.md) is a fifth surface: its tools.ts is a generated copy deployed on its own, so it can sit behind the
// package with no version number to show it, and the registry entry lists it as a remote.
const HOSTED_URL = 'https://api.prometiam.com/functions/v1/mcp'
const PKG_NAME = 'prometiam-risk-mcp'
const MIRROR = 'matiasmaquieira96/prometiam-risk-mcp'
// D183 (4 Nov 2026): the DNS-verified name. The old io.github.matiasmaquieira96/risk-mcp entry stays in the registry untouched, at the version it has.
const MCP_NAME = 'com.prometiam/risk-mcp'
// The registry has no exact-name lookup; ?name= ignores the filter and ?search=prometiam
// returns nothing, because the server's NAME contains neither. Search the namespace owner.
const REGISTRY_SEARCH = 'com.prometiam'
// Smithery qualified name. Org-owned namespace, created 2026-08-30 -- an account starts
// with a personal namespace only, and publishing to one that does not exist fails with a
// bare 404 "Namespace not found".
const SMITHERY_NAME = 'prometiam/risk-mcp'

// Every country that must appear in any public description of this server. Norway shipped
// 2026-07-26 and was missing from the registry listing for two days; this catches the next one.
const COUNTRIES = ['Spain', 'France', 'Ireland', 'Poland', 'Norway', 'Finland', 'Sweden', 'Croatia', 'Belgium', 'Denmark']

const problems = []
const notes = []

async function getJSON(url, label) {
  const res = await fetch(url, { headers: { 'User-Agent': 'prometiam-surface-check' } })
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`)
  return res.json()
}

async function getText(url, label) {
  const res = await fetch(url, { headers: { 'User-Agent': 'prometiam-surface-check' } })
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`)
  return res.text()
}

const local = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const localServer = JSON.parse(readFileSync(join(ROOT, 'server.json'), 'utf8'))

const surfaces = { local: local.version }

// ── local internal consistency ────────────────────────────────────────────────
if (localServer.version !== local.version) {
  problems.push(`server.json version ${localServer.version} != package.json ${local.version}`)
}
if (localServer.packages?.[0]?.version !== local.version) {
  problems.push(`server.json packages[0].version ${localServer.packages?.[0]?.version} != package.json ${local.version}`)
}
// The registry proves npm ownership by matching this field against the published package.
if (local.mcpName !== MCP_NAME) {
  problems.push(`package.json mcpName is ${JSON.stringify(local.mcpName)}, expected ${MCP_NAME} — the registry rejects publishes without it`)
}
{
  const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'))
  // This one sat four releases behind (0.1.0 vs 0.2.8) before anyone noticed.
  if (lock.version !== local.version) {
    problems.push(`package-lock.json version ${lock.version} != package.json ${local.version} — run: npm install --package-lock-only`)
  }
}
for (const c of COUNTRIES) {
  if (!localServer.description.includes(c)) {
    problems.push(`server.json description omits ${c} — it is a live country and belongs in the public listing`)
  }
}
if (!localServer.remotes?.some((r) => r.type === 'streamable-http' && r.url === HOSTED_URL)) {
  problems.push(`server.json lists no streamable-http remote at ${HOSTED_URL} — the registry entry would offer the npm package only`)
}

// ── npm ───────────────────────────────────────────────────────────────────────
try {
  const npm = await getJSON(`https://registry.npmjs.org/${PKG_NAME}/latest`, 'npm')
  surfaces.npm = npm.version
  if (npm.version !== local.version) {
    problems.push(`npm is at ${npm.version}, local is ${local.version} — run: npm publish`)
  }
  if (npm.mcpName !== MCP_NAME) {
    problems.push(`published npm package is missing/wrong mcpName (${JSON.stringify(npm.mcpName)}) — MCP registry publishes will fail ownership verification`)
  }
  if ((npm.keywords || []).length < 20) {
    notes.push(`npm package has only ${(npm.keywords || []).length} keywords — these drive npm search discovery`)
  }
  // The npm description is the ORIGIN of most third-party listings: Glama and Smithery
  // scrape it. Only server.json and the MCP registry were country-checked, so a stale npm
  // description propagated outward unnoticed -- on 2026-08-30 both Glama and PulseMCP still
  // advertised five countries, Norway missing, five weeks after it shipped.
  for (const c of COUNTRIES) {
    if (!(npm.description || '').includes(c)) {
      problems.push(`npm description omits ${c} — third-party catalogs scrape this field: "${npm.description}"`)
    }
  }
} catch (e) {
  problems.push(`could not read npm: ${e.message}`)
}

// ── public GitHub mirror ──────────────────────────────────────────────────────
try {
  const raw = await getText(`https://raw.githubusercontent.com/${MIRROR}/main/package.json`, 'github mirror')
  const gh = JSON.parse(raw)
  surfaces.github = gh.version
  if (gh.version !== local.version) {
    problems.push(`GitHub mirror is at ${gh.version}, local is ${local.version} — the public repo is stale`)
  }
  const meta = await getJSON(`https://api.github.com/repos/${MIRROR}`, 'github api')
  if (!meta.description) problems.push('GitHub mirror has no description — it is a search/discovery surface')
  else {
    for (const c of COUNTRIES) {
      if (!meta.description.includes(c)) {
        notes.push(`GitHub mirror description omits ${c}: "${meta.description}"`)
      }
    }
  }
  if (!meta.homepage) problems.push('GitHub mirror has no homepage set')
  if ((meta.topics || []).length < 5) {
    problems.push(`GitHub mirror has only ${(meta.topics || []).length} topics — GitHub topic pages are a discovery channel`)
  }
} catch (e) {
  // Unauthenticated GitHub API is rate-limited to 60/h; do not fail the run on that.
  if (/HTTP 403|HTTP 429/.test(e.message)) notes.push(`GitHub check skipped (rate limited): ${e.message}`)
  else problems.push(`could not read GitHub mirror: ${e.message}`)
}

// ── MCP registry ──────────────────────────────────────────────────────────────
try {
  const reg = await getJSON(
    `https://registry.modelcontextprotocol.io/v0/servers?search=${encodeURIComponent(REGISTRY_SEARCH)}`,
    'mcp registry')
  const mine = (reg.servers || []).filter((s) => s.server?.name === MCP_NAME)
  const latest = mine.find((s) => s._meta?.['io.modelcontextprotocol.registry/official']?.isLatest)
  if (!latest) {
    problems.push(`${MCP_NAME} not found in the MCP registry (searched "${REGISTRY_SEARCH}")`)
  } else {
    const sv = latest.server
    surfaces['mcp-registry'] = sv.version
    if (sv.version !== local.version) {
      problems.push(`MCP registry is at ${sv.version}, local is ${local.version} — push server.json to the mirror (CI publishes it) or run: mcp-publisher publish`)
    }
    for (const c of COUNTRIES) {
      if (!sv.description.includes(c)) {
        problems.push(`MCP registry listing omits ${c}: "${sv.description}"`)
      }
    }
    if (!sv.remotes?.some((r) => r.url === HOSTED_URL)) {
      problems.push(`MCP registry listing has no remote at ${HOSTED_URL} — publish a new version (the registry refuses a version it already holds) with: mcp-publisher publish`)
    }
    // The listing used to point at the PRIVATE repo, so every click from the registry 404'd. The com.prometiam entry carries no repository
    // at all (D183: no personal handle in a public field), which is fine; a repository, if one is ever set, must be the public mirror.
    const repo = sv.repository?.url || ''
    if (repo && !repo.includes('prometiam-risk-mcp')) {
      problems.push(`MCP registry repository URL is ${repo} — must point at the PUBLIC mirror, not a private repo`)
    }
  }
} catch (e) {
  problems.push(`could not read the MCP registry: ${e.message}`)
}

// ── hosted endpoint ───────────────────────────────────────────────────────────
// Directory reviews (Claude, ChatGPT) connect to this URL and read tools/list: it must serve the tools and the annotations the source has.
try {
  const res = await fetch(HOSTED_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'User-Agent': 'prometiam-surface-check' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const served = (await res.json()).result?.tools ?? []
  const tools = readTools(readFileSync(join(ROOT, 'src/tools.ts'), 'utf8'))
  const redeploy = 'run: node supabase/functions/mcp/check.mjs --write, then node scripts/deploy-fn.mjs mcp'
  if (served.map((t) => t.name).join() !== tools.map((t) => t.name).join()) {
    problems.push(`hosted endpoint serves ${served.length} tools, the source has ${tools.length} (or in another order) — ${redeploy}`)
  }
  const differences = listProblems(served, tools)
  if (differences.length) {
    problems.push(`hosted endpoint tools/list differs from the source in ${differences.length} place(s), e.g. ${differences[0]} — ${redeploy}`)
  }
} catch (e) {
  problems.push(`could not read the hosted endpoint: ${e.message}`)
}

// ── third-party catalogs ──────────────────────────────────────────────────────
// These are DOWNSTREAM of npm + the MCP registry, and they were assumed to pick the
// server up automatically ("Glama + Smithery auto-scan npm and will list it with no
// action", registries/INDEX.md). That held for Glama and PulseMCP; it did NOT for
// Smithery, which on 2026-08-30 listed five competing company-registry servers and not
// this one. Nothing anywhere reported that, because nothing was looking.
//
// Deliberately notes, not problems: getting listed needs a human with an account, so
// failing CI on it would just train people to ignore the gate. Absence should be VISIBLE,
// not blocking.
// Look the server up BY QUALIFIED NAME, not via ?q=. Smithery's search is semantic: a
// query for "prometiam" returns drug-discovery servers and no substring match at all, so
// a presence check built on it reports "missing" even when the server is published. The
// first version of this check did exactly that.
try {
  const res = await fetch(`https://registry.smithery.ai/servers/${SMITHERY_NAME}`,
    { headers: { 'User-Agent': 'prometiam-surface-check' } })
  if (res.status === 404) {
    notes.push(`NOT listed on smithery.ai as ${SMITHERY_NAME} — publish with: smithery mcp publish ./prometiam-risk-mcp.mcpb -n ${SMITHERY_NAME}`)
  } else if (!res.ok) {
    notes.push(`smithery check inconclusive: HTTP ${res.status}`)
  } else {
    const sm = await res.json()
    // registry.smithery.ai is a CACHED read replica of api.smithery.ai and lags a
    // metadata write by some minutes -- an empty description here is not proof of one.
    const desc = sm.description || ''
    if (!desc) {
      notes.push(`smithery listing has an empty description (replica may be stale; authoritative copy is api.smithery.ai) — fix with PATCH /servers/${encodeURIComponent(SMITHERY_NAME)}`)
    } else {
      for (const c of COUNTRIES) {
        if (!desc.includes(c)) notes.push(`smithery listing omits ${c}`)
      }
    }
  }
} catch (e) {
  notes.push(`smithery check skipped: ${e.message}`)
}

// ── report ────────────────────────────────────────────────────────────────────
console.log('\nversion by surface:')
for (const [k, v] of Object.entries(surfaces)) console.log(`  ${k.padEnd(14)} ${v}`)

if (notes.length) {
  console.log('\nnotes:')
  for (const n of notes) console.log(`  - ${n}`)
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} surface problem(s):`)
  for (const p of problems) console.error(`  - ${p}`)
  console.error('')
  process.exit(1)
}

console.log('\n✓ all publish surfaces agree\n')
