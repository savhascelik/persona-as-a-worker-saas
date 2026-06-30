"use server"

import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { generateText, Output } from "ai"
import { z } from "zod"
import {
  addCredits,
  createCompany,
  updateCompany,
  deleteCompany,
  createSkillTemplate,
  deleteSkillTemplate,
  updateSkillTemplate,
  getAllCompanies,
  getAllSkillTemplates,
  getCompanyById,
  getAllPersonas,
  getActivitiesByCompany,
  setCompanyCredits,
  createCreditRequest,
  getAllCreditRequests,
  updateCreditRequestStatus,
} from "@/lib/db"
import { getPackage } from "@/lib/billing"
import { SKILL_ICON_NAMES } from "@/lib/skill-icons"
import type { Company, CompanyInput, SkillTemplate, ActivityEvent, CreditRequest } from "@/lib/types"
import { scanRealEndpoint } from "@/lib/mcp-scanner-server"

export type CompanyResult = { ok: true; company: Company } | { ok: false; error: string }

/* -------------------------------------------------------------------------- */
/*  Companies                                                                 */
/* -------------------------------------------------------------------------- */

export async function listCompaniesAction(): Promise<Company[]> {
  const { auth } = await import("@clerk/nextjs/server")
  const { userId } = await auth()
  if (!userId) throw new Error("UNAUTHENTICATED")
  return getAllCompanies(userId)
}

export async function createCompanyAction(formData: FormData): Promise<CompanyResult> {
  const { auth } = await import("@clerk/nextjs/server")
  const { userId } = await auth()
  if (!userId) {
    return { ok: false, error: "Unauthorized. You must be signed in to create a platform connection." }
  }

  const suggestedSkillIds = [
    ...new Set(formData.getAll("suggestedSkillIds").map((v) => String(v).trim()).filter(Boolean)),
  ]
  const discoveredTools = [
    ...new Set(formData.getAll("discoveredTools").map((v) => String(v).trim()).filter(Boolean)),
  ]

  // Parse and encrypt mcpAuth credentials safely
  let mcpAuth: Record<string, { authType: "none" | "bearer" | "apiKey"; credentials?: string }> | undefined = undefined
  const mcpAuthJson = String(formData.get("mcpAuthJson") || "").trim()
  if (mcpAuthJson) {
    try {
      const { encrypt } = await import("@/lib/crypto")
      const parsed = JSON.parse(mcpAuthJson)
      mcpAuth = {}
      for (const [url, auth] of Object.entries(parsed)) {
        const authTyped = auth as { authType: "none" | "bearer" | "apiKey"; credentials?: string }
        if (authTyped.authType !== "none" && authTyped.credentials) {
          mcpAuth[url] = {
            authType: authTyped.authType,
            credentials: encrypt(authTyped.credentials)
          }
        }
      }
      if (Object.keys(mcpAuth).length === 0) {
        mcpAuth = undefined
      }
    } catch (e) {
      console.error("[createCompanyAction]: Failed to parse mcpAuthJson:", e)
    }
  }

  const input: CompanyInput & { userId: string } = {
    userId,
    name: String(formData.get("name") || "").trim(),
    domain: String(formData.get("domain") || "").trim(),
    baseUrl: String(formData.get("baseUrl") || "").trim(),
    suggestedSkillIds: suggestedSkillIds.length ? suggestedSkillIds : undefined,
    discoveredTools: discoveredTools.length ? discoveredTools : undefined,
    mcpAuth,
  }

  if (!input.name || !input.domain || !input.baseUrl) {
    return { ok: false, error: "Platform name, domain, and base API/MCP URL are all required." }
  }

  const company = await createCompany(nanoid(12), input)
  revalidatePath("/dashboard")
  return { ok: true, company }
}

export async function updateCompanyAction(id: string, formData: FormData): Promise<CompanyResult> {
  const { auth } = await import("@clerk/nextjs/server")
  const { userId } = await auth()
  if (!userId) {
    return { ok: false, error: "Unauthorized." }
  }

  const existingCompany = await getCompanyById(id, userId)
  if (!existingCompany) {
    return { ok: false, error: "Company not found or unauthorized." }
  }

  const suggestedSkillIds = [
    ...new Set(formData.getAll("suggestedSkillIds").map((v) => String(v).trim()).filter(Boolean)),
  ]
  const discoveredTools = [
    ...new Set(formData.getAll("discoveredTools").map((v) => String(v).trim()).filter(Boolean)),
  ]

  // Parse and encrypt mcpAuth credentials safely
  let mcpAuth: Record<string, { authType: "none" | "bearer" | "apiKey"; credentials?: string }> | undefined = undefined
  const mcpAuthJson = String(formData.get("mcpAuthJson") || "").trim()
  if (mcpAuthJson) {
    try {
      const { encrypt } = await import("@/lib/crypto")
      const parsed = JSON.parse(mcpAuthJson)
      mcpAuth = {}
      for (const [url, auth] of Object.entries(parsed)) {
        const authTyped = auth as { authType: "none" | "bearer" | "apiKey"; credentials?: string }
        if (authTyped.authType !== "none") {
          if (authTyped.credentials && authTyped.credentials !== "__PRESERVE_EXISTING__") {
            mcpAuth[url] = {
              authType: authTyped.authType,
              credentials: encrypt(authTyped.credentials)
            }
          } else if (existingCompany.mcpAuth?.[url]?.credentials) {
            mcpAuth[url] = {
              authType: authTyped.authType,
              credentials: existingCompany.mcpAuth[url].credentials
            }
          }
        }
      }
      if (Object.keys(mcpAuth).length === 0) {
        mcpAuth = undefined
      }
    } catch (e) {
      console.error("[updateCompanyAction]: Failed to parse mcpAuthJson:", e)
    }
  }

  const updates: Partial<Omit<Company, "id" | "createdAt" | "entityType" | "totalCredits" | "creditsConsumed">> = {
    name: String(formData.get("name") || "").trim(),
    domain: String(formData.get("domain") || "").trim(),
    baseUrl: String(formData.get("baseUrl") || "").trim(),
    suggestedSkillIds: suggestedSkillIds.length ? suggestedSkillIds : undefined,
    discoveredTools: discoveredTools.length ? discoveredTools : undefined,
    mcpAuth,
  }

  if (!updates.name || !updates.domain || !updates.baseUrl) {
    return { ok: false, error: "Platform name, domain, and base API/MCP URL are all required." }
  }

  const company = await updateCompany(id, updates, userId)
  if (!company) {
    return { ok: false, error: "Company not found or unauthorized." }
  }

  revalidatePath("/dashboard")
  return { ok: true, company }
}

export async function deleteCompanyAction(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { auth } = await import("@clerk/nextjs/server")
    const { userId } = await auth()
    if (!userId) {
      return { ok: false, error: "Unauthorized." }
    }

    const success = await deleteCompany(id, userId)
    if (!success) {
      return { ok: false, error: "Company not found or unauthorized." }
    }

    revalidatePath("/dashboard")
    return { ok: true }
  } catch (err: any) {
    console.error("[Delete Company Action Error]:", err)
    return { ok: false, error: err.message || "Failed to delete company." }
  }
}

/* -------------------------------------------------------------------------- */
/*  Billing — Seeding Credits                                                 */
/* -------------------------------------------------------------------------- */

export async function purchasePackageAction(
  companyId: string,
  packageId: string,
): Promise<CompanyResult> {
  return {
    ok: false,
    error: "Direct self-allocation is disabled. Seeding Credits must be requested via the Credit Request Form below for admin approval.",
  }
}

export type CreditRequestResult = { ok: true; request: CreditRequest } | { ok: false; error: string }

export async function createCreditRequestAction(
  companyId: string,
  amount: number,
  reason: string
): Promise<CreditRequestResult> {
  const { currentUser } = await import("@clerk/nextjs/server")
  const user = await currentUser()
  if (!user) {
    return { ok: false, error: "Unauthorized. You must be signed in to request credits." }
  }

  const cleanReason = reason.trim()
  if (!companyId) {
    return { ok: false, error: "Select a platform connection first." }
  }
  if (amount < 500 || amount > 25000) {
    return { ok: false, error: "Requested amount must be between 500 and 25,000 credits to prevent abuse." }
  }
  if (cleanReason.length < 10) {
    return { ok: false, error: "Please provide a detailed reason (at least 10 characters)." }
  }
  if (cleanReason.length > 500) {
    return { ok: false, error: "Reason cannot exceed 500 characters." }
  }

  const company = await getCompanyById(companyId, user.id)
  if (!company) {
    return { ok: false, error: "Platform connection not found." }
  }

  // Anti-Abuse Rate Limiting: Check for existing pending requests for this company to prevent bot-floods
  const allRequests = await getAllCreditRequests()
  const hasPending = allRequests.some(
    (r) => r.companyId === companyId && r.status === "pending"
  )
  if (hasPending) {
    return {
      ok: false,
      error: "You already have a pending credit request for this platform connection. Please wait for an admin to approve or reject it."
    }
  }

  const email = user.emailAddresses?.[0]?.emailAddress || "anonymous@example.com"
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed User"

  const request = await createCreditRequest(`req_${nanoid(12)}`, {
    userId: user.id,
    userEmail: email,
    userName: name,
    companyId,
    companyName: company.name,
    amount,
    reason: cleanReason,
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/billing")
  revalidatePath("/dashboard/admin")
  return { ok: true, request }
}

export async function listCreditRequestsAction(): Promise<CreditRequest[]> {
  const { currentUser } = await import("@clerk/nextjs/server")
  const user = await currentUser()
  if (user?.publicMetadata?.role !== "admin") {
    throw new Error("Unauthorized. Admin access required.")
  }
  return getAllCreditRequests()
}

export async function processCreditRequestAction(
  requestId: string,
  status: "approved" | "rejected"
): Promise<{ ok: boolean; error?: string }> {
  const { currentUser } = await import("@clerk/nextjs/server")
  const user = await currentUser()
  if (user?.publicMetadata?.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin access required." }
  }

  const all = await getAllCreditRequests()
  const req = all.find((r) => r.id === requestId)
  if (!req) {
    return { ok: false, error: "Credit request not found." }
  }

  if (req.status !== "pending") {
    return { ok: false, error: "This request has already been processed." }
  }

  if (status === "approved") {
    const updatedCompany = await addCredits(req.companyId, req.amount)
    if (!updatedCompany) {
      return { ok: false, error: "Target platform connection not found. Cannot award credits." }
    }
  }

  await updateCreditRequestStatus(requestId, status, user.id)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/billing")
  revalidatePath("/dashboard/admin")
  return { ok: true }
}

export async function setCompanyCreditsAction(
  companyId: string,
  totalCredits: number
): Promise<CompanyResult> {
  const { currentUser } = await import("@clerk/nextjs/server")
  const user = await currentUser()
  if (user?.publicMetadata?.role !== "admin") {
    return { ok: false, error: "Unauthorized. Admin access required." }
  }

  if (totalCredits < 0) {
    return { ok: false, error: "Total credits cannot be negative." }
  }

  const company = await setCompanyCredits(companyId, totalCredits)
  if (!company) {
    return { ok: false, error: "Company not found." }
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/admin")
  return { ok: true, company }
}

/* -------------------------------------------------------------------------- */
/*  Skill Templates (Super Admin)                                             */
/* -------------------------------------------------------------------------- */

export type SkillResult = { ok: true; skill: SkillTemplate } | { ok: false; error: string }
export type GenerateResult =
  | { ok: true; draft: Omit<SkillTemplate, "id" | "entityType" | "createdAt"> }
  | { ok: false; error: string }

export async function listSkillTemplatesAction(): Promise<SkillTemplate[]> {
  return getAllSkillTemplates()
}

/**
 * Uses the AI Gateway to turn a freeform capability description into a
 * structured, deployable Skill Template (name, summary, MCP tools, activities).
 * Falls back to a deterministic draft if the model is unavailable so the
 * Super Admin tool always returns something usable.
 */
export async function generateSkillDraftAction(prompt: string): Promise<GenerateResult> {
  const clean = prompt.trim()
  if (clean.length < 8) {
    return { ok: false, error: "Describe the skill in a little more detail." }
  }

  try {
    const { output } = await generateText({
      model: "openai/gpt-5-mini",
      system:
        "You design 'Skills' for autonomous AI personas that seed B2B SaaS platforms via MCP tools. " +
        "Given a capability description, output a concise, professional skill definition. " +
        "Tool names must be lower_snake_case verbs a platform API would expose (e.g. read_data, post_reply). " +
        `iconName MUST be one of: ${SKILL_ICON_NAMES.join(", ")}.`,
      prompt: clean,
      output: Output.object({
        schema: z.object({
          name: z.string().describe("Short title, 2-4 words"),
          summary: z.string().describe("One-sentence capability summary"),
          requiredTools: z.array(z.string()).min(1).max(5),
          activityVerbs: z.array(z.string()).min(2).max(4).describe("Present-tense activity fragments"),
          iconName: z.string(),
        }),
      }),
    })

    const out = output
    const iconName = SKILL_ICON_NAMES.includes(out.iconName) ? out.iconName : "Sparkles"
    return {
      ok: true,
      draft: {
        name: out.name,
        summary: out.summary,
        requiredTools: out.requiredTools.map((tool: string) => tool.toLowerCase().replace(/[^a-z0-9_]/g, "_")),
        activityVerbs: out.activityVerbs,
        iconName,
        source: "ai",
      },
    }
  } catch {
    // Deterministic fallback keeps the feature functional without a gateway key.
    const slug = clean.toLowerCase()
    const tools = ["read_data"]
    if (slug.includes("post") || slug.includes("write") || slug.includes("content")) tools.push("create_post")
    if (slug.includes("repl") || slug.includes("comment") || slug.includes("engage")) tools.push("post_reply")
    if (slug.includes("monitor") || slug.includes("scan") || slug.includes("trend")) tools.push("search_topics")
    return {
      ok: true,
      draft: {
        name: clean.split(/\s+/).slice(0, 3).map((w) => w[0].toUpperCase() + w.slice(1)).join(" "),
        summary: clean.charAt(0).toUpperCase() + clean.slice(1),
        requiredTools: [...new Set(tools)],
        activityVerbs: ["analyzing platform signals", "drafting a tailored response", "seeding a focused discussion"],
        iconName: "Sparkles",
        source: "ai",
      },
    }
  }
}

export async function saveSkillTemplateAction(
  draft: Omit<SkillTemplate, "id" | "entityType" | "createdAt">,
): Promise<SkillResult> {
  if (!draft.name?.trim() || !draft.summary?.trim() || !draft.requiredTools?.length) {
    return { ok: false, error: "Name, summary, and at least one MCP tool are required." }
  }
  const skill = await createSkillTemplate(`skill_${nanoid(8)}`, {
    name: draft.name.trim(),
    summary: draft.summary.trim(),
    requiredTools: draft.requiredTools,
    activityVerbs: draft.activityVerbs?.length ? draft.activityVerbs : ["seeding the platform"],
    iconName: draft.iconName || "Sparkles",
    source: draft.source ?? "manual",
  })
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/skills")
  revalidatePath("/dashboard/admin")
  return { ok: true, skill }
}

export async function updateSkillTemplateAction(
  id: string,
  draft: Partial<Omit<SkillTemplate, "id" | "entityType" | "createdAt">>
): Promise<SkillResult> {
  if (draft.name && !draft.name.trim()) {
    return { ok: false, error: "Name cannot be empty." }
  }
  if (draft.summary && !draft.summary.trim()) {
    return { ok: false, error: "Summary cannot be empty." }
  }
  if (draft.requiredTools && !draft.requiredTools.length) {
    return { ok: false, error: "At least one MCP tool is required." }
  }

  const updated = await updateSkillTemplate(id, {
    ...(draft.name ? { name: draft.name.trim() } : {}),
    ...(draft.summary ? { summary: draft.summary.trim() } : {}),
    ...(draft.requiredTools ? { requiredTools: draft.requiredTools } : {}),
    ...(draft.activityVerbs ? { activityVerbs: draft.activityVerbs } : {}),
    ...(draft.iconName ? { iconName: draft.iconName } : {}),
    ...(draft.source ? { source: draft.source } : {}),
  })

  if (!updated) {
    return { ok: false, error: "Skill not found or no updates specified." }
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/skills")
  revalidatePath("/dashboard/admin")
  return { ok: true, skill: updated }
}

export async function deleteSkillTemplateAction(id: string): Promise<SkillResult | { ok: true }> {
  await deleteSkillTemplate(id)
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/skills")
  revalidatePath("/dashboard/admin")
  return { ok: true }
}

/* -------------------------------------------------------------------------- */
/*  Lookups                                                                   */
/* -------------------------------------------------------------------------- */

export async function getCompanyAction(id: string): Promise<Company | null> {
  const { auth } = await import("@clerk/nextjs/server")
  const { userId } = await auth()
  if (!userId) throw new Error("UNAUTHENTICATED")
  return getCompanyById(id, userId)
}

export type ScanActionResponse = 
  | { ok: true; tools: string[]; compatibleSkillIds: string[]; isSimulated?: boolean }
  | { ok: false; error: string }

export async function scanEndpointAction(url: string): Promise<ScanActionResponse> {
  try {
    const result = await scanRealEndpoint(url)
    return { ok: true, tools: result.tools, compatibleSkillIds: result.compatibleSkillIds, isSimulated: false }
  } catch (error) {
    console.error("[Scanner Action Error]:", error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to scan endpoint."
    }
  }
}

export async function triggerCompanyPersonasAction(
  companyId: string,
  force: boolean = true
): Promise<{ ok: boolean; results: { id: string; ok: boolean; actionTaken?: string; error?: string }[] }> {
  try {
    const { auth } = await import("@clerk/nextjs/server")
    const { userId } = await auth()
    if (!userId) {
      throw new Error("Unauthorized")
    }

    const [company, personas] = await Promise.all([
      getCompanyById(companyId, userId),
      getAllPersonas(userId),
    ])

    if (!company) {
      throw new Error("Company not found")
    }

    const companyPersonas = personas.filter(
      (p) => p.companyId === companyId && (force || (p.status !== "offline" && p.status !== "hibernating"))
    )
    if (companyPersonas.length === 0) {
      return { ok: true, results: [] }
    }

    const { executePersonaAgent } = await import("@/lib/agent-runner")
    const results = await Promise.all(
      companyPersonas.map(async (persona) => {
        const res = await executePersonaAgent(persona, company, new Date(), force)
        return { id: persona.id, ...res }
      })
    )

    revalidatePath("/dashboard")
    return { ok: true, results }
  } catch (err: any) {
    console.error("[Trigger Company Personas Action Error]:", err)
    return { ok: false, results: [] }
  }
}

export async function getCompanyActivitiesAction(
  companyId: string,
  limit = 20
): Promise<ActivityEvent[]> {
  try {
    const { auth } = await import("@clerk/nextjs/server")
    const { userId } = await auth()
    if (!userId) {
      return []
    }
    return await getActivitiesByCompany(companyId, limit, userId)
  } catch (err) {
    console.error("[Get Company Activities Action Error]:", err)
    return []
  }
}

