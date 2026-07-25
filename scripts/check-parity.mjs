#!/usr/bin/env node
/**
 * MCP ↔ API parity guard.
 *
 * Fails (exit 1) if any endpoint documented in the API's OpenAPI spec
 * (public/openapi.json — the source of truth) is NOT wrapped by an MCP tool
 * in src/tools.ts. This is what stops the MCP server from silently drifting
 * behind the API the way it did before (8 tools for 17 endpoints).
 *
 * Runs automatically on `prepublishOnly`, so a stale server can't be published.
 * Run manually any time with:  npm run check:parity
 *
 * Note: this checks MCP-vs-OpenAPI. Keeping OpenAPI itself in sync with the
 * edge function is a separate step — regenerate it with the `api-docs` skill
 * whenever you add/rename a risk-api endpoint.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const openapiPath = path.resolve(dir, '../../../public/openapi.json')
const toolsPath = path.resolve(dir, '../src/tools.ts')

/** Normalize a path so `/companies/{id}` and `/companies/${args.id}` compare equal. */
function norm(p) {
  return p
    .replace(/\$\{[^}]+\}/g, '{id}') // template-literal interpolation -> {id}
    .replace(/\{[^}]+\}/g, '{id}') //   any {param} -> {id}
    .replace(/\/+$/, '') //             drop trailing slash
}

if (!fs.existsSync(openapiPath)) {
  console.error(`check-parity: cannot find OpenAPI spec at ${openapiPath}`)
  process.exit(2)
}

const openapi = JSON.parse(fs.readFileSync(openapiPath, 'utf8'))
const apiPaths = new Set(Object.keys(openapi.paths).map(norm))

const toolsSrc = fs.readFileSync(toolsPath, 'utf8')
const toolPaths = new Set()
// Match getClient().get('...') / .post(`...`) / .del('...')
const re = /\.(?:get|post|del)\(\s*[`'"]([^`'"]+)[`'"]/g
let m
while ((m = re.exec(toolsSrc)) !== null) toolPaths.add(norm(m[1]))

const missing = [...apiPaths].filter((p) => !toolPaths.has(p))
const undocumented = [...toolPaths].filter((p) => !apiPaths.has(p))

if (missing.length) {
  console.error('✗ MCP PARITY FAILED — documented API endpoints with no MCP tool:')
  for (const p of missing) console.error('    ' + p)
  console.error('\nAdd a tool in src/tools.ts for each, or exclude the path if intentional.')
  process.exit(1)
}

console.log(`✓ MCP parity OK — all ${apiPaths.size} documented API endpoints are wrapped by tools.`)
if (undocumented.length) {
  console.warn('  note: tool endpoints not in openapi.json (fine if intentional): ' + undocumented.join(', '))
}
