"use server"

import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { generateText, Output } from "ai"
import { z } from "zod"
import {
  addCredits,
  createCompany,
  createPersona,
  createSkillTemplate,
  deletePersona,
  deleteSkillTemplate,
  getAllCompanies,
  getAllPersonas,
  getAllSkillTemplates,
  getCompanyById,
  updatePersona,
} from "@/lib/db"
import { MAX_SKILLS, MIN_SKILLS, SKILL_MAP } from "@/lib/skills"
import { getPackage } from "@/lib/billing"
import { SKILL_ICON_NAMES } from "@/lib/skill-icons"
import type { Company, CompanyInput, Persona, PersonaInput, SkillTemplate } from "@/lib/types"

function parseForm(formData: FormData): PersonaInput {
  const num = (key: string, fallback: number) => {
    const raw = formData.get(key)
    const parsed = raw != null ? Number.parseInt(String(raw), 10) : Number.NaN
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const clampHour = (h: number) => Math.min(23, Math.max(0, h))

  // Skills arrive either as repeated "skillIds" fields or a comma list.
  const rawSkills = formData.getAll("skillIds").flatMap((v) => String(v).split(","))
  const skillIds = [...new Set(rawSkills.map((s) => s.trim()).filter((s) => s && SKILL_MAP[s]))]

  return {
    companyId: String(formData.get("companyId") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    role: String(formData.get("role") || "").trim(),
    platform: String(formData.get("platform") || "").trim(),
    mcpUrl: String(formData.get("mcpUrl") || "").trim(),
    skillIds,
    timezone: String(formData.get("timezone") || "UTC").trim(),
    workStartHour: clampHour(num("workStartHour", 9)),
    workEndHour: clampHour(num("workEndHour", 18)),
    minLatencySeconds: Math.max(0, num("minLatencySeconds", 30)),
    maxLatencySeconds: Math.max(1, num("maxLatencySeconds", 240)),
    postsPerDay: Math.max(1, num("postsPerDay", 2)),
  }
}

function validatePersona(input: PersonaInput): string | null {
  if (!input.companyId) return "Select a company before deploying a persona."
  if (!input.name || !input.role || !input.platform) {
    return "Name, role, and target platform are required."
  }
  if (input.skillIds.length < MIN_SKILLS) return "Assign at least one skill from the marketplace."
  if (input.skillIds.length > MAX_SKILLS) return `Personas can hold at most ${MAX_SKILLS} skills.`
  if (input.minLatencySeconds > input.maxLatencySeconds) {
    return "Minimum latency cannot exceed maximum latency."
  }
  return null
}

export type ActionResult = { ok: true; persona?: Persona } | { ok: false; error: string }
export type CompanyResult = { ok: true; company: Company } | { ok: false; error: string }

/* -------------------------------------------------------------------------- */
/*  Companies                                                                 */
/* -------------------------------------------------------------------------- */

export async function listCompaniesAction(): Promise<Company[]> {
  return getAllCompanies()
}

export async function createCompanyAction(formData: FormData): Promise<CompanyResult> {
  const suggestedSkillIds = [
    ...new Set(formData.getAll("suggestedSkillIds").map((v) => String(v).trim()).filter(Boolean)),
  ]
  const input: CompanyInput = {
    name: String(formData.get("name") || "").trim(),
    domain: String(formData.get("domain") || "").trim(),
    baseUrl: String(formData.get("baseUrl") || "").trim(),
    suggestedSkillIds: suggestedSkillIds.length ? suggestedSkillIds : undefined,
  }

  if (!input.name || !input.domain || !input.baseUrl) {
    return { ok: false, error: "Platform name, domain, and base API/MCP URL are all required." }
  }

  const company = await createCompany(nanoid(12), input)
  revalidatePath("/dashboard")
  return { ok: true, company }
}

/* -------------------------------------------------------------------------- */
/*  Personas                                                                  */
/* -------------------------------------------------------------------------- */

export async function listPersonasAction(): Promise<Persona[]> {
  return getAllPersonas()
}

/**
 * Creates a persona with its assigned company and Skill Marketplace selections.
 * This is the primary entry point used by the 3-step deployment wizard.
 */
export async function createPersonaWithSkills(formData: FormData): Promise<ActionResult> {
  const input = parseForm(formData)
  const error = validatePersona(input)
  if (error) return { ok: false, error }

  const persona = await createPersona(nanoid(12), input)
  revalidatePath("/dashboard")
  return { ok: true, persona }
}

export async function updatePersonaAction(id: string, formData: FormData): Promise<ActionResult> {
  const input = parseForm(formData)
  const error = validatePersona(input)
  if (error) return { ok: false, error }

  const persona = await updatePersona(id, input)
  revalidatePath("/dashboard")
  if (!persona) return { ok: false, error: "Persona not found." }
  return { ok: true, persona }
}

export async function deletePersonaAction(id: string): Promise<ActionResult> {
  await deletePersona(id)
  revalidatePath("/dashboard")
  return { ok: true }
}

/* -------------------------------------------------------------------------- */
/*  Billing — Seeding Credits                                                 */
/* -------------------------------------------------------------------------- */

export async function purchasePackageAction(
  companyId: string,
  packageId: string,
): Promise<CompanyResult> {
  if (!companyId) return { ok: false, error: "Select a company before purchasing credits." }
  const pkg = getPackage(packageId)
  if (!pkg) return { ok: false, error: "Unknown seeding package." }

  // In production this is invoked after a Stripe webhook confirms payment.
  // Each "action" funds one credit unit of the seeding economy.
  const company = await addCredits(companyId, pkg.actions)
  if (!company) return { ok: false, error: "Company not found." }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/billing")
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
  revalidatePath("/dashboard/admin")
  return { ok: true, skill }
}

export async function deleteSkillTemplateAction(id: string): Promise<SkillResult | { ok: true }> {
  await deleteSkillTemplate(id)
  revalidatePath("/dashboard/admin")
  return { ok: true }
}

/* -------------------------------------------------------------------------- */
/*  Lookups                                                                   */
/* -------------------------------------------------------------------------- */

export async function getCompanyAction(id: string): Promise<Company | null> {
  return getCompanyById(id)
}
