// Reads the tool definitions out of src/tools.ts as text (no TypeScript, no dependencies) for the drift checks that share it:
//   mcp/risk-mcp/scripts/check-parity.mjs      every tool states its annotations, and its handler does not contradict them
//   mcp/risk-mcp/scripts/check-surfaces.mjs    the hosted endpoint serves what the source says
//   supabase/functions/mcp/check.mjs           the hosted copy and the live tools/list match the package
// The annotations sit on one line under each tool's `name:` (ToolAnnotations in tools.ts), so a text read is exact.

export const lf = (s) => s.replace(/\r\n/g, '\n') // this machine checks out CRLF, the Linux builder LF

const KEYS = ['title', 'readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint']
/** The three batch endpoints are POSTs that only read; any other POST or DELETE in a handler changes the account. */
const READING_POSTS = new Set(['/companies/lookup', '/sanctions/screen', '/insolvency/check'])

/** Every tool of the source: { name, annotations (an object, or null when the one-line literal is missing), calls: [{ method, path }] }. */
export function readTools(src) {
  const text = lf(src)
  const starts = [...text.matchAll(/^ {4}name: '([a-z_]+)',?\s*$/gm)]
  return starts.map((m, i) => {
    const block = text.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : text.length)
    const lit = block.match(/^ {4}annotations: \{([^}\n]*)\},?\s*$/m)
    const annotations = lit
      ? Object.fromEntries([...lit[1].matchAll(/(\w+):\s*('[^']*'|true|false)/g)].map(([, k, v]) => [k, v === 'true' ? true : v === 'false' ? false : v.slice(1, -1)]))
      : null
    const calls = [...block.matchAll(/getClient\(\)\.(get|post|del)\(\s*[`'"]([^`'"]+)[`'"]/g)].map(([, method, path]) => ({ method, path: path.replace(/\/+$/, '') }))
    return { name: m[1], annotations, calls }
  })
}

/** What is wrong with one tool's annotations, in words (an empty list is fine). */
export function annotationProblems(tool) {
  const a = tool.annotations
  if (!a) return ['has no annotations: put `    annotations: { title: ..., readOnlyHint: ..., destructiveHint: ..., openWorldHint: ... },` on one line under its name']
  const out = []
  const unknown = Object.keys(a).filter((k) => !KEYS.includes(k))
  if (unknown.length) out.push(`unknown annotation ${unknown.join(', ')}`)
  if (typeof a.title !== 'string' || a.title.length < 1 || a.title.length > 40) out.push('title must be 1 to 40 characters')
  for (const k of ['readOnlyHint', 'destructiveHint', 'openWorldHint']) if (typeof a[k] !== 'boolean') out.push(`${k} must be true or false`)
  if (a.readOnlyHint === true && a.destructiveHint !== false) out.push('a read-only tool says destructiveHint: false')
  if (a.readOnlyHint === true && 'idempotentHint' in a) out.push('a read-only tool does not say idempotentHint (the spec makes it meaningless there)')
  if (a.readOnlyHint === false && typeof a.idempotentHint !== 'boolean') out.push('a tool that is not read-only says idempotentHint: true or false')
  // A tool must not call itself read-only while its handler changes the account.
  const changes = tool.calls.filter((c) => c.method === 'del' || (c.method === 'post' && !READING_POSTS.has(c.path)))
  if (changes.length && a.readOnlyHint !== false) out.push(`its handler calls ${changes.map((c) => `${c.method.toUpperCase()} ${c.path}`).join(', ')}, which changes the account, so readOnlyHint must be false`)
  if (tool.calls.some((c) => c.method === 'del') && a.destructiveHint !== true) out.push('its handler deletes, so destructiveHint must be true')
  return out
}

const canon = (a) => JSON.stringify(KEYS.filter((k) => a && k in a).map((k) => [k, a[k]]))

/**
 * How a tools/list answer differs from the source, per tool: the entries are { name, title, annotations } (the rest is ignored).
 * Names and order are for the caller to compare; a tool the answer lacks is reported here too.
 */
export function listProblems(listed, tools) {
  const out = []
  for (const t of tools) {
    const s = listed.find((x) => x.name === t.name)
    if (!s) { out.push(`${t.name}: not served`); continue }
    if (canon(s.annotations) !== canon(t.annotations)) out.push(`${t.name}: annotations ${JSON.stringify(s.annotations ?? null)}, the source has ${JSON.stringify(t.annotations)}`)
    if (s.title !== t.annotations?.title) out.push(`${t.name}: title ${JSON.stringify(s.title ?? null)}, the source has ${JSON.stringify(t.annotations?.title ?? null)}`)
  }
  return out
}
