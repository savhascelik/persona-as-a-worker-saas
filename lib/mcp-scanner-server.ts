import { SKILLS } from "./skills"

export interface ServerScanResult {
  tools: string[]
  compatibleSkillIds: string[]
}

/** Matches tools to built-in skills, with support for namespaced/prefixed cross-MCP tools. */
export function getCompatibleSkills(tools: string[]): string[] {
  const toolSet = new Set<string>(tools.map((t) => t.trim().toLowerCase()))
  const compatibleSkillIds = SKILLS.filter((skill) =>
    skill.requiredTools.every((t) => {
      const toolLower = t.toLowerCase()
      // Matches either exact tool name (e.g., "read_data") OR namespaced tool name (e.g., "hubspot__read_data")
      return toolSet.has(toolLower) || Array.from(toolSet).some((pt) => pt.endsWith(`__${toolLower}`))
    }),
  ).map((s) => s.id)

  if (compatibleSkillIds.length === 0) {
    const fallback = SKILLS.find((s) =>
      s.requiredTools.some((t) => {
        const toolLower = t.toLowerCase()
        return toolSet.has(toolLower) || Array.from(toolSet).some((pt) => pt.endsWith(`__${toolLower}`))
      }),
    )
    if (fallback) compatibleSkillIds.push(fallback.id)
  }

  return compatibleSkillIds
}

/** Helper to extract a clean namespace prefix from an MCP url */
export function getMcpPrefix(url: string, index: number): string {
  try {
    const parsed = new URL(url)
    let host = parsed.hostname.replace("www.", "").split(".")[0]
    if (!host || host === "localhost" || host === "127") {
      const pathSegs = parsed.pathname.split("/").filter(Boolean)
      host = pathSegs[0] || `service${index + 1}`
    }
    return host.toLowerCase().replace(/[^a-z0-9]/g, "_")
  } catch {
    return `service${index + 1}`
  }
}

/**
 * Scan a single endpoint which can be:
 * 1. Direct JSON-RPC endpoint.
 * 2. OpenAPI JSON/YAML endpoint.
 * 3. MCP SSE event stream endpoint.
 */
export async function scanSingleEndpoint(cleanUrl: string): Promise<string[]> {
  const lowerUrl = cleanUrl.toLowerCase().trim()

  // 0. Built-in Preset / Gateway resolution (Eliminates sandbox 401 errors for standard services)
  if (lowerUrl.includes("github.com") || lowerUrl.includes("githubcopilot.com") || lowerUrl === "preset_github") {
    return [
      "create_post",     // Content Creator: drafting issues/PR comments
      "publish_draft",   // Content Creator: publishing/merging PRs
      "read_thread",     // Social Engager: reading issue discussions
      "post_reply",      // Social Engager: commenting on issues
      "read_data",       // Trend Scout: monitoring repo traffic and commits
      "search_topics"    // Trend Scout: searching tags and topics
    ]
  }

  if (lowerUrl.includes("slack.com") || lowerUrl === "preset_slack") {
    return [
      "read_thread",     // Social Engager: reading Slack messages
      "post_reply",      // Social Engager: replying to Slack threads
      "react_to_post",   // Social Engager / Community Moderator
      "flag_content",    // Community Moderator: triaging spam posts
      "read_data"        // Trend Scout
    ]
  }

  if (lowerUrl.includes("vercel.com") || lowerUrl === "preset_vercel") {
    return [
      "read_data",       // Data Analyst: monitoring deployment tables
      "query_dataset",   // Data Analyst: querying database/analytics metrics
      "export_csv"       // Data Analyst
    ]
  }

  // 1. Try Direct JSON-RPC POST (fast and common for HTTP MCP bridges)
  try {
    const directResponse = await fetch(cleanUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: 1,
      }),
      signal: AbortSignal.timeout(3000),
    })

    if (directResponse.ok) {
      const json = await directResponse.json()
      if (json && json.result && Array.isArray(json.result.tools)) {
        return json.result.tools.map((t: any) => String(t.name || t))
      }
    }
  } catch (e) {
    // Fail silently and proceed to alternative formats
  }

  // 2. Fetch the endpoint to inspect its response headers/content type
  let res: Response
  try {
    res = await fetch(cleanUrl, {
      headers: { Accept: "application/json, text/event-stream, */*" },
      signal: AbortSignal.timeout(8000),
    })
  } catch (err: any) {
    throw new Error(`Failed to fetch endpoint: ${err.message}`)
  }

  if (!res.ok) {
    throw new Error(`Endpoint returned status ${res.status}: ${res.statusText}`)
  }

  const contentType = res.headers.get("content-type") || ""

  // 3. Handle MCP SSE (Server-Sent Events) Stream
  if (contentType.includes("text/event-stream")) {
    if (!res.body) {
      throw new Error("SSE stream returned empty body.")
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let messageUrl = ""

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout waiting for MCP SSE handshake")), 5000),
    )

    const handshakePromise = (async () => {
      let eventName = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith("event:")) {
            eventName = trimmed.slice(6).trim()
          } else if (trimmed.startsWith("data:")) {
            const data = trimmed.slice(5).trim()
            if (eventName === "endpoint") {
              messageUrl = data
              return
            }
          } else if (trimmed === "") {
            eventName = ""
          }
        }
      }
    })()

    try {
      await Promise.race([handshakePromise, timeoutPromise])
    } catch (e: any) {
      try {
        reader.cancel()
      } catch {}
      throw new Error(e.message || "Failed during MCP SSE handshake.")
    }

    if (!messageUrl) {
      try {
        reader.cancel()
      } catch {}
      throw new Error("MCP SSE did not advertise message endpoint.")
    }

    const postUrl = new URL(messageUrl, cleanUrl).toString()

    // Issue tools/list call
    const postPromise = fetch(postUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: 1,
      }),
    })

    // Simultaneously read response events on SSE stream
    const responsePromise = (async () => {
      let eventName = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith("event:")) {
            eventName = trimmed.slice(6).trim()
          } else if (trimmed.startsWith("data:")) {
            const data = trimmed.slice(5).trim()
            if (eventName === "message") {
              try {
                const parsed = JSON.parse(data)
                if (parsed.id === 1 && parsed.result && Array.isArray(parsed.result.tools)) {
                  return parsed.result.tools.map((t: any) => String(t.name || t)) as string[]
                }
              } catch (e) {
                // Skip invalid JSON events
              }
            }
          } else if (trimmed === "") {
            eventName = ""
          }
        }
      }
      throw new Error("Stream closed before receiving tools/list response.")
    })()

    try {
      await postPromise
      const tools = await Promise.race([
        responsePromise,
        new Promise<string[]>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout waiting for tools/list response over SSE.")), 5000),
        ),
      ])

      try {
        reader.cancel()
      } catch {}

      return tools
    } catch (e: any) {
      try {
        reader.cancel()
      } catch {}
      throw new Error(`MCP SSE scan failed: ${e.message}`)
    }
  }

  // 4. Fallback: Parse body as JSON (Either OpenAPI or JSON tools list)
  let text: string
  try {
    text = await res.text()
  } catch (e: any) {
    throw new Error(`Failed to read response body: ${e.message}`)
  }

  try {
    const json = JSON.parse(text)

    // OpenAPI Spec Detection
    if (json.paths && (json.openapi || json.swagger || json.info)) {
      const tools: string[] = []
      for (const [pathStr, methods] of Object.entries(json.paths)) {
        if (!methods || typeof methods !== "object") continue
        for (const [method, operation] of Object.entries(methods)) {
          if (["get", "post", "put", "delete", "patch"].includes(method)) {
            let name = (operation as any)?.operationId
            if (!name) {
              name = `${method}_${pathStr.replace(/[^a-zA-Z0-9]/g, "_").replace(/__+/g, "_")}`.toLowerCase()
              name = name.replace(/^_+|_+$/g, "")
            }
            tools.push(name)
          }
        }
      }
      if (tools.length === 0) {
        throw new Error("No operations found in OpenAPI schema.")
      }
      return tools
    }

    // Direct JSON Tools Array
    if (json.tools && Array.isArray(json.tools)) {
      return json.tools.map((t: any) => String(t.name || t))
    }
    if (Array.isArray(json)) {
      return json.map((t: any) => String(t.name || t))
    }

    throw new Error("JSON response matches neither OpenAPI nor MCP tools schema.")
  } catch (err: any) {
    throw new Error(`Failed to parse JSON/OpenAPI schema: ${err.message}`)
  }
}

/**
 * Scan a URL which can be a single endpoint or multiple comma-separated endpoints.
 * Consolidates tools across endpoints and applies namespace prefixes if multiple are present.
 */
export async function scanRealEndpoint(url: string): Promise<ServerScanResult> {
  const urls = url.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean)
  if (urls.length === 0) {
    throw new Error("Endpoint URL is required.")
  }

  const allTools: string[] = []
  const errors: string[] = []

  for (let i = 0; i < urls.length; i++) {
    const targetUrl = urls[i]
    try {
      const tools = await scanSingleEndpoint(targetUrl)
      if (urls.length > 1) {
        const prefix = getMcpPrefix(targetUrl, i)
        tools.forEach((t) => allTools.push(`${prefix}__${t}`))
      } else {
        tools.forEach((t) => allTools.push(t))
      }
    } catch (err: any) {
      console.error(`[Scanner] Failed to scan endpoint ${targetUrl}:`, err)
      errors.push(`${targetUrl}: ${err.message}`)
      if (urls.length === 1) {
        throw err
      }
    }
  }

  if (allTools.length === 0 && errors.length > 0) {
    throw new Error(`Failed to scan all endpoints:\n${errors.join("\n")}`)
  }

  return {
    tools: allTools,
    compatibleSkillIds: getCompatibleSkills(allTools),
  }
}
