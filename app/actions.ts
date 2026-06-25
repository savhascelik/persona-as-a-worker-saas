"use server"

import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import {
  createCompany,
  createPersona,
  deletePersona,
  getAllCompanies,
  getAllPersonas,
  updatePersona,
} from "@/lib/db"
import { MAX_SKILLS, MIN_SKILLS, SKILL_MAP } from "@/lib/skills"
import type { Company, CompanyInput, Persona, PersonaInput } from "@/lib/types"

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
  const input: CompanyInput = {
    name: String(formData.get("name") || "").trim(),
    domain: String(formData.get("domain") || "").trim(),
    baseUrl: String(formData.get("baseUrl") || "").trim(),
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
