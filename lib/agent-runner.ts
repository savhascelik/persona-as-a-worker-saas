import type { Company, Persona, ActivityEvent, AgentGoal, AgentGoalStep } from "./types"
import {
  createActivityEvent,
  deductCredits,
  updatePersona,
  getGoalById,
  createGoalStep,
  updateGoal,
  getGoalSteps,
  getCompanyById,
  getPersonaById,
  getAllSkillTemplates
} from "./db"
import { CREDIT_COST } from "./billing"
import { getSkill } from "./skills"
import { isWithinWorkingHours } from "./simulation"
import { decrypt } from "./crypto"

function getAuthHeaders(company: Company, targetUrl: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  }
  
  if (!company.mcpAuth) return headers
  
  // Find matching config key (either exact match or matched base URL)
  const cleanTarget = targetUrl.trim().toLowerCase()
  const matchingKey = Object.keys(company.mcpAuth).find(key => 
    key.trim().toLowerCase() === cleanTarget || 
    cleanTarget.startsWith(key.trim().toLowerCase()) ||
    key.trim().toLowerCase().startsWith(cleanTarget)
  )
  
  if (matchingKey) {
    const config = company.mcpAuth[matchingKey]
    if (config && config.credentials) {
      const decrypted = decrypt(config.credentials)
      if (config.authType === "bearer") {
        headers["Authorization"] = `Bearer ${decrypted}`
      } else if (config.authType === "apiKey") {
        headers["X-API-Key"] = decrypted
      }
    }
  }
  
  return headers
}

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
  now: Date = new Date(),
  force: boolean = false
): Promise<{ ok: boolean; actionTaken?: string; error?: string }> {
  // 1. Credit Check & Multi-tenant scoping validation (Security)
  if (persona.companyId !== company.id) {
    return { ok: false, error: "Multi-tenant scope violation: Persona does not belong to this company." }
  }

  // 1.5. Schedule / Working Hours check
  if (!force && !isWithinWorkingHours(persona, now)) {
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
  const skill = getSkill(activeSkillId) || (await getAllSkillTemplates()).find((s) => s.id === activeSkillId)
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
    } else if (toolName === "publish_draft" || toolName.endsWith("__publish_draft")) {
      description = `Publishes an existing draft blog post.`
      inputSchema = {
        type: "object",
        properties: {
          post_id: { type: "integer", description: "The unique ID of the draft blog post" }
        },
        required: ["post_id"]
      }
    } else if (toolName === "upload_media" || toolName.endsWith("__upload_media")) {
      description = `Uploads or records a text/markdown media asset in Flownie.`
      inputSchema = {
        type: "object",
        properties: {
          filename: { type: "string", description: "Descriptive name for the file (e.g. data_summary.md)" },
          content: { type: "string", description: "Markdown or text content of the media file to store" }
        },
        required: ["filename", "content"]
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`
      
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
          headers: getAuthHeaders(company, targetBaseUrl),
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
        postsPublished: persona.postsPublished + 1,
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

/**
 * Run a multi-step Agentic ReAct loop for a specific AgentGoal.
 * Continues until the goal is accomplished (success), failed, or max iterations are reached.
 */
export async function executeGoalLoop(
  goalId: string,
  now: Date = new Date(),
  singleStep: boolean = false,
  force: boolean = false
): Promise<{ ok: boolean; currentIteration: number; error?: string }> {
  const goal = await getGoalById(goalId)
  if (!goal) {
    return { ok: false, currentIteration: 0, error: `Goal ${goalId} not found.` }
  }

  // Set goal to running if it's pending
  if (goal.status === "pending") {
    await updateGoal(goal.id, { status: "running" })
    goal.status = "running"
  }

  if (goal.status !== "running") {
    return { ok: true, currentIteration: goal.currentIteration, error: `Goal is already completed or not in running state: status=${goal.status}` }
  }

  const [persona, company] = await Promise.all([
    getPersonaById(goal.personaId),
    getCompanyById(goal.companyId)
  ])

  if (!persona || !company) {
    await updateGoal(goal.id, { status: "failed", result: "Persona or Company not found." })
    return { ok: false, currentIteration: goal.currentIteration, error: "Persona or Company not found." }
  }

  // Schedule / Working Hours check
  if (!force && !isWithinWorkingHours(persona, now)) {
    await updatePersona(persona.id, { status: "offline", currentSkillId: undefined })
    return { ok: true, currentIteration: goal.currentIteration, error: "Persona is outside working hours (offline)." }
  }

  const credits = company.totalCredits ?? 0
  if (credits <= 0) {
    await updatePersona(persona.id, { status: "hibernating", currentSkillId: undefined })
    await updateGoal(goal.id, { status: "failed", result: "Out of seeding credits." })
    return { ok: false, currentIteration: goal.currentIteration, error: "Company has exhausted its Seeding Credits." }
  }

  const toolsList = company.discoveredTools || ["read_data"]
  const mcpTools: McpToolSchema[] = toolsList.map((toolName) => {
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
    } else if (toolName === "publish_draft" || toolName.endsWith("__publish_draft")) {
      description = `Publishes an existing draft blog post.`
      inputSchema = {
        type: "object",
        properties: {
          post_id: { type: "integer", description: "The unique ID of the draft blog post" }
        },
        required: ["post_id"]
      }
    } else if (toolName === "upload_media" || toolName.endsWith("__upload_media")) {
      description = `Uploads or records a text/markdown media asset in Flownie.`
      inputSchema = {
        type: "object",
        properties: {
          filename: { type: "string", description: "Descriptive name for the file (e.g. data_summary.md)" },
          content: { type: "string", description: "Markdown or text content of the media file to store" }
        },
        required: ["filename", "content"]
      }
    }

    return { name: toolName, description, inputSchema }
  })

  const geminiKey = process.env.GEMINI_API_KEY
  const openAIKey = process.env.OPENAI_API_KEY

  if (!geminiKey && !openAIKey) {
    const errorMsg = "Missing AI API keys (GEMINI_API_KEY or OPENAI_API_KEY) in server environment."
    await createGoalStep({
      goalId: goal.id,
      iteration: goal.currentIteration + 1,
      thought: "Cannot start agent execution loop.",
      action: "failed",
      observation: errorMsg
    })
    await updateGoal(goal.id, { status: "failed", result: errorMsg })
    return { ok: false, currentIteration: goal.currentIteration, error: errorMsg }
  }

  // Load existing steps to compile message history for the LLM
  const existingSteps = await getGoalSteps(goal.id)
  let currentIteration = goal.currentIteration

  // Base system instructions
  const systemPrompt = `You are an autonomous AI worker (persona) seeding and driving engagement on a SaaS platform.
Your Identity:
- Name: ${persona.name}
- Professional Role: ${persona.role}
- Platform you seed: ${persona.platform}

Your HIGH-LEVEL GOAL:
"${goal.title}"

Your behavioral guidelines:
1. Act strictly according to your professional role. Adopt a premium, helpful, and natural human tone. Avoid generic AI patterns.
2. Use the available platform tools to inspect the current state before posting to ensure relevance.
3. Track your progress. You have up to ${goal.maxIterations} steps to fully achieve this goal. Currently on step/iteration ${currentIteration + 1}.
4. If you have completed the goal, explain the results clearly without calling any more tools.
`

  // Compile history
  let messages: any[] = [
    { role: "system", content: systemPrompt }
  ]

  for (const step of existingSteps) {
    if (step.action.startsWith("call_tool:")) {
      const toolName = step.action.replace("call_tool:", "").trim()
      messages.push({
        role: "user",
        content: `Iteration ${step.iteration} Thought: ${step.thought}\nExecuting tool: ${toolName} with args: ${step.actionArgs}`
      })
      messages.push({
        role: "user",
        content: `Iteration ${step.iteration} Observation/Result: ${step.observation}`
      })
    } else {
      messages.push({
        role: "user",
        content: `Iteration ${step.iteration} Final Response: ${step.observation}`
      })
    }
  }

  // Start executing ticks until completion or iteration cap is hit
  let loopRunning = true

  while (loopRunning && currentIteration < goal.maxIterations) {
    // Check if the goal was stopped, deleted, or modified externally
    const latestGoal = await getGoalById(goalId)
    if (!latestGoal || latestGoal.status !== "running") {
      loopRunning = false
      break
    }

    let thoughtText = ""
    let selectedToolCall: { name: string; args: any } | null = null
    let responseText = ""

    try {
      if (geminiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`
        const geminiTools = mcpTools.map((t) => ({
          functionDeclarations: [{
            name: t.name,
            description: t.description,
            parameters: t.inputSchema
          }]
        }))

        const contents = messages.map(m => {
          if (m.role === "system") {
            return { role: "user", parts: [{ text: `System Prompt Instructions: ${m.content}` }] }
          }
          return { role: m.role, parts: [{ text: m.content }] }
        })

        contents.push({
          role: "user",
          parts: [{ text: `Currently on Iteration ${currentIteration + 1}. Evaluate your progress and execute the next action.` }]
        })

        const payload = {
          contents,
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
          signal: AbortSignal.timeout(12000)
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
          thoughtText = part.text || `Evaluating progress at iteration ${currentIteration + 1} and decided to call tool ${selectedToolCall.name}.`
        } else if (part?.text) {
          responseText = part.text
          thoughtText = "Goal completed successfully."
        }
      } else if (openAIKey) {
        const url = "https://api.openai.com/v1/chat/completions"
        const openAITools = mcpTools.map((t) => ({
          type: "function" as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.inputSchema
          }
        }))

        const chatMessages = messages.map(m => ({
          role: m.role === "system" ? "system" : "user",
          content: m.content
        }))

        chatMessages.push({
          role: "user",
          content: `Currently on Iteration ${currentIteration + 1}. Evaluate your progress and execute the next action.`
        })

        const payload = {
          model: "gpt-4o-mini",
          messages: chatMessages,
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
          signal: AbortSignal.timeout(12000)
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
          thoughtText = message.content || `Evaluating progress and calling tool ${selectedToolCall.name}.`
        } else if (message?.content) {
          responseText = message.content
          thoughtText = "Goal completed successfully."
        }
      }

      currentIteration++
      await updateGoal(goal.id, { currentIteration })

      if (selectedToolCall) {
        let targetBaseUrl = company.baseUrl
        let originalToolName = selectedToolCall.name

        const baseUrls = company.baseUrl.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean)
        
        if (selectedToolCall.name.includes("__")) {
          const parts = selectedToolCall.name.split("__")
          const prefix = parts[0]
          const toolNamePart = parts.slice(1).join("__")

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
          }
        }

        const authorized = toolsList.includes(selectedToolCall.name) || toolsList.includes(originalToolName)
        if (!authorized) {
          throw new Error(`Security violation: LLM attempted to execute unauthorized tool ${selectedToolCall.name}.`)
        }

        let toolResultText = ""
        try {
          const toolRes = await fetch(targetBaseUrl, {
            method: "POST",
            headers: getAuthHeaders(company, targetBaseUrl),
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
            const toolJson = await toolRes.json()
            const content = toolJson?.result?.content?.[0]
            toolResultText = content?.text || JSON.stringify(toolJson?.result || {})
          } else {
            toolResultText = `Failed with status ${toolRes.status}`
          }
        } catch (err: any) {
          toolResultText = `Error calling tool: ${err.message}`
        }

        await createGoalStep({
          goalId: goal.id,
          iteration: currentIteration,
          thought: thoughtText,
          action: `call_tool: ${selectedToolCall.name}`,
          actionArgs: JSON.stringify(selectedToolCall.args),
          observation: toolResultText
        })

        const isWriteAction = selectedToolCall.name.includes("post") || selectedToolCall.name.includes("reply") || selectedToolCall.name.includes("create")
        const cost = isWriteAction ? CREDIT_COST.post : CREDIT_COST.tick
        await createActivityEvent({
          personaId: persona.id,
          personaName: persona.name,
          skillId: goal.personaId,
          skillName: "Autonomous Goal Execution",
          message: `${persona.name} (Iteration ${currentIteration}): Called tool '${selectedToolCall.name}'`
        })

        await deductCredits(company.id, cost)
        await updatePersona(persona.id, {
          status: "active",
          postsPublished: persona.postsPublished + 1,
          engagementScore: persona.engagementScore + (isWriteAction ? 15 : 2),
          creditsSpent: (persona.creditsSpent ?? 0) + cost,
          lastActiveAt: now.getTime()
        })

        messages.push({
          role: "user",
          content: `Iteration ${currentIteration} Thought: ${thoughtText}\nExecuting tool: ${selectedToolCall.name} with args: ${JSON.stringify(selectedToolCall.args)}`
        })
        messages.push({
          role: "user",
          content: `Iteration ${currentIteration} Observation/Result: ${toolResultText}`
        })

      } else if (responseText) {
        await createGoalStep({
          goalId: goal.id,
          iteration: currentIteration,
          thought: "Goal successfully accomplished.",
          action: "final_response",
          observation: responseText
        })

        await createActivityEvent({
          personaId: persona.id,
          personaName: persona.name,
          skillId: goal.personaId,
          skillName: "Autonomous Goal Execution",
          message: `Goal Accomplished: "${goal.title}" — Result: ${responseText.slice(0, 100)}...`
        })

        await deductCredits(company.id, CREDIT_COST.tick)
        await updatePersona(persona.id, {
          status: "idle",
          creditsSpent: (persona.creditsSpent ?? 0) + CREDIT_COST.tick,
          lastActiveAt: now.getTime()
        })

        await updateGoal(goal.id, {
          status: "success",
          result: responseText,
          completedAt: Date.now()
        })

        loopRunning = false
      } else {
        throw new Error("Model returned empty response with no action.")
      }

    } catch (err: any) {
      const errorMsg = err.message || String(err)
      await createGoalStep({
        goalId: goal.id,
        iteration: currentIteration,
        thought: `Encountered execution error.`,
        action: "error",
        observation: errorMsg
      })

      await createActivityEvent({
        personaId: persona.id,
        personaName: persona.name,
        skillId: goal.personaId,
        skillName: "Autonomous Goal Execution",
        message: `Execution Failed on Iteration ${currentIteration}: ${errorMsg}`
      })

      await updateGoal(goal.id, {
        status: "failed",
        result: `Failed at iteration ${currentIteration}: ${errorMsg}`,
        completedAt: Date.now()
      })

      loopRunning = false
    }

    if (singleStep) {
      loopRunning = false
    }
  }

  if (currentIteration >= goal.maxIterations && loopRunning && !singleStep) {
    await updateGoal(goal.id, {
      status: "failed",
      result: `Max iterations (${goal.maxIterations}) reached before goal completion.`,
      completedAt: Date.now()
    })
  }

  return { ok: true, currentIteration }
}
