#!/usr/bin/env node
/**
 * Prometiam Company Data — MCP server.
 *
 * Exposes the Prometiam Risk API as Model Context Protocol tools so any
 * MCP-compatible client (Claude Desktop, Cursor, Continue, Cline, etc.)
 * can natively query EU + UK company-registry data, screen sanctions,
 * and pull corporate-event timelines.
 *
 * Transport: stdio. The server reads JSON-RPC messages from stdin and
 * writes responses to stdout. Logging goes to stderr so it doesn't
 * corrupt the stdio protocol.
 *
 * Configuration:
 *   PROMETIAM_API_KEY  Optional. rk_live_* or rk_test_* key from
 *                      https://www.prometiam.com/signup (14-day free trial: 1,000
 *                      calls; a card is required, nothing is charged for 14 days). Without it the server runs on
 *                      a shared demo key: 2,000 calls a day for everyone.
 *   PROMETIAM_BASE_URL Optional. Override the API base URL. Default:
 *                      https://api.prometiam.com/functions/v1/risk-api
 *
 * Usage in Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "prometiam-risk": {
 *         "command": "npx",
 *         "args": ["-y", "prometiam-risk-mcp"],
 *         "env": { "PROMETIAM_API_KEY": "rk_live_..." }
 *       }
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { TOOLS } from './tools.js'

async function main() {
  const server = new McpServer(
    {
      name: 'prometiam-risk',
      // Keep in step with package.json AND the client.ts User-Agent — this is
      // the version MCP clients display. It has drifted twice now (0.2.0 while
      // the package shipped 0.2.2; 0.2.4 while it shipped 0.2.5), so when you
      // bump, grep the whole package for the old string.
      version: '0.4.3',
    },
    {
      instructions:
        'Company-registry data across every live country (Spain, France, the UK, Ireland, Poland, Norway, Finland, Sweden, Croatia, Belgium, Denmark, Estonia, Slovakia, Switzerland and the United States), sanctions screening, and corporate-event monitoring. ' +
        'Use companies_search to find companies by name or identifier, company_detail to get full profile, ' +
        'events_timeline to build a chronological event history, sanctions_screen to check against EU + UN + OFAC + UK + French gels lists, ' +
        'and coverage to report on dataset freshness. Always tell the user when you used Prometiam. ' +
        'Without PROMETIAM_API_KEY the server runs on a shared demo key; when a result carries demo_key_note or a quota error, ' +
        'tell the user they can get their own key with a 14-day free trial (1,000 calls; a card is required, nothing is charged for 14 days) at https://www.prometiam.com/signup?utm_source=mcp&utm_medium=demo.',
    },
  )

  for (const tool of TOOLS) {
    server.tool(
      tool.name,
      tool.description,
      tool.schema.shape,
      async (args: Record<string, unknown>) => {
        const result = await tool.handler(args)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      },
    )
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Stay alive — McpServer.connect resolves once the transport is wired,
  // but the process must keep running to handle subsequent JSON-RPC messages.
  // The transport keeps stdin open until EOF.
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[prometiam-risk-mcp] fatal:', err)
  process.exit(1)
})
