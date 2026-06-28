import type { Company, Persona, ActivityEvent } from "./types"
import { createActivityEvent, deductCredits, updatePersona } from "./db"
import { CREDIT_COST } from "./billing"
import { getSkill } from "./skills"
import { isWithinWorkingHours } from "./simulation"

interface McpToolSchema {
  name: string
  description: string
  inputSchema?: any
}

/**
 * Real-world execution engine for autonomous B2B SaaS seeding personas.
 * It reads the platform's tools, constructs a secure prompt, runs a real LLM
 * (Gemini or OpenAI), and handles real-time tool calls (MCP / HTTP APIs).
 */
export async function executePersonaAgent(
  persona: Persona,
  company: Company,
  now: Date = new Date()
): Promise<{ ok: boolean; actionTaken?: string; error?: string }> {
  // 1. Credit Check & Multi-tenant scoping validation (Security)
  if (persona.companyId !== company.id) {
    return { ok: false, error: "Multi-tenant scope violation: Persona does not belong to this company." }
  }

  // 1.5. Schedule / Working Hours check
  if (!isWithinWorkingHours(persona, now)) {
    await updatePersona(persona.id, { status: "offline", currentSkillId: undefined })
    return { ok: true, actionTaken: "Persona is outside working hours (offline)." }
  }

  const credits = company.totalCredits ?? 0
  if (credits <= 0) {
    await updatePersona(persona.id, { status: "hibernating", currentSkillId: undefined })
    return { ok: false, error: "Company has exhausted its Seeding Credits. Persona is hibernating." }
  }

  // 2. Resolve target tools and skills
  const skillIds = persona.skillIds || []
  if (skillIds.length === 0) {
    return { ok: false, error: "Persona has no skills assigned." }
  }

  // Pick an active skill for this tick
  const activeSkillId = skillIds[Math.floor(Math.random() * skillIds.length)]
  const skill = getSkill(activeSkillId)
  const skillName = skill ? skill.name : "General Seeding"

  // Load taranan (discovered) tools
  const toolsList = company.discoveredTools || ["read_data"]
  
  // Format tools into standard JSON schemas for the LLM
  const mcpTools: McpToolSchema[] = toolsList.map((toolName) => {
    // Generate helpful descriptions depending on standard tool names
    let description = `Execute action: ${toolName}`
    let inputSchema: any = { type: "object", properties: {}, required: [] }

    if (toolName.includes("read") || toolName.includes("get") || toolName.includes("query")) {
      description = `Fetch data/state from the platform. Tool name: ${toolName}`
      inputSchema = {
        type: "object",
        properties: {
          limit: { type: "integer", description: "Max items to retrieve" },
          query: { type: "string", description: "Search query or filter" }
        }
      }
    } else if (toolName.includes("post") || toolName.includes("reply") || toolName.includes("create")) {
      description = `Publish a new post or write content/reply to the platform. Tool name: ${toolName}`
      inputSchema = {
        type: "object",
        properties: {
          title: { type: "string", description: "Post title (if creating post)" },
          content: { type: "string", description: "Markdown text content of the post or reply" },
          threadId: { type: "string", description: "Target thread ID (if replying)" }
        },
        required: ["content"]
      }
    }

    return { name: toolName, description, inputSchema }
  })

  // 3. Security Check: Validate api keys
  const geminiKey = process.env.GEMINI_API_KEY
  const openAIKey = process.env.OPENAI_API_KEY

  if (!geminiKey && !openAIKey) {
    const errorMsg = "Missing AI API keys (GEMINI_API_KEY or OPENAI_API_KEY) in server environment."
    console.error(`[Agent Runner]: ${errorMsg}`)
    
    await createActivityEvent({
      personaId: persona.id,
      personaName: persona.name,
      skillId: activeSkillId,
      skillName,
      message: `Execution Failed: ${persona.name} could not exercise [${skillName}] because no LLM API keys are configured on the server.`
    })

    await updatePersona(persona.id, { status: "offline", currentSkillId: undefined })
    return { ok: false, error: errorMsg }
  }

  // 4. Construct System Prompt & Instructions
  const systemPrompt = `You are an autonomous AI worker (persona) seeding and driving engagement on a SaaS platform.
Your Identity:
- Name: ${persona.name}
- Professional Role: ${persona.role}
- Platform you seed: ${persona.platform}
- Active Skill: ${skillName} (${skill?.summary || "Direct Platform seeding"})

Your behavioral guidelines:
1. Act strictly according to your professional role. Adopt a premium, helpful, and natural human tone. Avoid generic AI patterns (no "Here is what I found", no robotic overviews).
2. Use the available platform tools to inspect the current state (e.g. read_data, read_thread) before posting to ensure context relevance.
3. If you see high-signal content or new members, engage with them appropriately. If you see low-quality content, use moderation/flagging tools if available.
4. Keep actions realistic and safe. Never hallucinate tools that are not provided.
`

  let responseText = ""
  let selectedToolCall: { name: string; args: any } | null = null

  try {
    if (geminiKey) {
      // Execute using Gemini Developer API
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`
      
      // Structure tools format for Gemini Tool Call schema
      const geminiTools = mcpTools.map((t) => ({
        functionDeclarations: [{
          name: t.name,
          description: t.description,
          parameters: t.inputSchema
        }]
      }))

      const payload = {
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\nInspect the platform state and execute an appropriate action.` }] }
        ],
        tools: geminiTools.length > 0 ? geminiTools : undefined,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      })

      if (!res.ok) {
        throw new Error(`Gemini API returned status ${res.status}: ${await res.text()}`)
      }

      const json = await res.json()
      const candidate = json?.candidates?.[0]
      const part = candidate?.content?.parts?.[0]

      if (part?.functionCall) {
        selectedToolCall = {
          name: part.functionCall.name,
          args: part.functionCall.args || {}
        }
      } else if (part?.text) {
        responseText = part.text
      }
    } else if (openAIKey) {
      // Execute using OpenAI Chat Completions API
      const url = "https://api.openai.com/v1/chat/completions"
      const openAITools = mcpTools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema
        }
      }))

      const payload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Inspect the platform state and execute an appropriate action." }
        ],
        tools: openAITools.length > 0 ? openAITools : undefined,
        temperature: 0.7,
        max_tokens: 512
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAIKey}`
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      })

      if (!res.ok) {
        throw new Error(`OpenAI API returned status ${res.status}: ${await res.text()}`)
      }

      const json = await res.json()
      const choice = json?.choices?.[0]
      const message = choice?.message

      if (message?.tool_calls?.[0]?.function) {
        selectedToolCall = {
          name: message.tool_calls[0].function.name,
          args: JSON.parse(message.tool_calls[0].function.arguments || "{}")
        }
      } else if (message?.content) {
        responseText = message.content
      }
    }

    // 5. Execute Tool Call on real MCP endpoint (Security: check if tool name is authorized)
    if (selectedToolCall) {
      let targetBaseUrl = company.baseUrl
      let originalToolName = selectedToolCall.name

      const baseUrls = company.baseUrl.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean)
      
      if (selectedToolCall.name.includes("__")) {
        const parts = selectedToolCall.name.split("__")
        const prefix = parts[0]
        const toolNamePart = parts.slice(1).join("__")

        // Find the index of the base URL that matches this prefix
        const matchIndex = baseUrls.findIndex((url, idx) => {
          try {
            const parsed = new URL(url)
            let host = parsed.hostname.replace("www.", "").split(".")[0]
            if (!host || host === "localhost" || host === "127") {
              const pathSegs = parsed.pathname.split("/").filter(Boolean)
              host = pathSegs[0] || `service${idx + 1}`
            }
            return host.toLowerCase().replace(/[^a-z0-9]/g, "_") === prefix
          } catch {
            return `service${idx + 1}` === prefix
          }
        })

        if (matchIndex !== -1) {
          targetBaseUrl = baseUrls[matchIndex]
          originalToolName = toolNamePart
          console.log(`[Consolidated Router] Prefix '${prefix}' matched to: ${targetBaseUrl}. Running original tool: ${originalToolName}`)
        }
      }

      const authorized = toolsList.includes(selectedToolCall.name) || toolsList.includes(originalToolName)
      if (!authorized) {
        return { ok: false, error: `Security violation: LLM attempted to execute unauthorized tool ${selectedToolCall.name}.` }
      }

      // Execute tool call via POST to targetBaseUrl
      console.log(`[Executing Tool Call]: ${originalToolName} via ${targetBaseUrl} with args`, selectedToolCall.args)
      
      let toolResultText = ""
      try {
        const toolRes = await fetch(targetBaseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
              name: originalToolName,
              arguments: selectedToolCall.args
            },
            id: 2
          }),
          signal: AbortSignal.timeout(5000)
        })

        if (toolRes.ok) {
          const toolJson = await toolRes.ok ? await toolRes.json() : null
          const content = toolJson?.result?.content?.[0]
          toolResultText = content?.text || JSON.stringify(toolJson?.result || {})
        } else {
          toolResultText = `Failed with status ${toolRes.status}`
        }
      } catch (err: any) {
        toolResultText = `Error calling tool: ${err.message}`
      }

      // Record Activity Event in DB
      const isWriteAction = selectedToolCall.name.includes("post") || selectedToolCall.name.includes("reply") || selectedToolCall.name.includes("create")
      const cost = isWriteAction ? CREDIT_COST.post : CREDIT_COST.tick
      const summaryMsg = `${persona.name} used [${skillName}] to call tool '${selectedToolCall.name}'. Result: ${toolResultText.slice(0, 100)}...`

      await createActivityEvent({
        personaId: persona.id,
        personaName: persona.name,
        skillId: activeSkillId,
        skillName,
        message: summaryMsg
      })

      // Deduct credit and update persona state
      await deductCredits(company.id, cost)
      await updatePersona(persona.id, {
        status: "active",
        currentSkillId: activeSkillId,
        postsPublished: isWriteAction ? persona.postsPublished + 1 : persona.postsPublished,
        engagementScore: persona.engagementScore + (isWriteAction ? 15 : 2),
        creditsSpent: (persona.creditsSpent ?? 0) + cost,
        lastActiveAt: now.getTime()
      })

      return { ok: true, actionTaken: `Executed tool call: ${selectedToolCall.name}` }
    }

    // 6. Final LLM Response (No tool call, standard message)
    if (responseText) {
      const summaryMsg = `${persona.name} exercising [${skillName}]: "${responseText.slice(0, 140)}..."`

      await createActivityEvent({
        personaId: persona.id,
        personaName: persona.name,
        skillId: activeSkillId,
        skillName,
        message: summaryMsg
      })

      await deductCredits(company.id, CREDIT_COST.tick)
      await updatePersona(persona.id, {
        status: "idle",
        currentSkillId: activeSkillId,
        creditsSpent: (persona.creditsSpent ?? 0) + CREDIT_COST.tick,
        lastActiveAt: now.getTime()
      })

      return { ok: true, actionTaken: `Generated standard post/comment: ${responseText.slice(0, 50)}...` }
    }

    return { ok: false, error: "Model returned empty response with no action." }

  } catch (error: any) {
    console.error(`[Agent Execution Loop Error for ${persona.name}]:`, error)
    const errorMsg = error.message || String(error)
    
    await createActivityEvent({
      personaId: persona.id,
      personaName: persona.name,
      skillId: activeSkillId,
      skillName,
      message: `Execution Failed: ${persona.name} encountered error during [${skillName}]: ${errorMsg}`
    })

    await updatePersona(persona.id, { status: "offline", currentSkillId: undefined })
    return { ok: false, error: errorMsg }
  }
}
