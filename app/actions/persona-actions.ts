"use server"

import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { auth } from "@clerk/nextjs/server"
import { createPersona, deletePersona, getAllPersonas, updatePersona } from "@/lib/db"
import { MAX_SKILLS, MIN_SKILLS, SKILL_MAP } from "@/lib/skills"
import type { Persona, PersonaInput } from "@/lib/types"

export type ActionResult = { ok: true; persona?: Persona } | { ok: false; error: string }

/**
 * Every persona mutation is protected: the caller must be an authenticated
 * Clerk user. Returns the userId or throws to abort the Server Action.
 */
async function requireUser(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error("UNAUTHENTICATED")
  return userId
}

function parseForm(formData: FormData): PersonaInput {
  const num = (key: string, fallback: number) => {
    const raw = formData.get(key)
    const parsed = raw != null ? Number.parseInt(String(raw), 10) : Number.NaN
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const clampHour = (h: number) => Math.min(23, Math.max(0, h))

  // Skills arrive either as repeated "skillIds" fields or a comma list.
  const rawSkills = formData.getAll("skillIds").flatMap((v) => String(v).split(","))
  const skillIds = [...new Set(rawSkills.map((s) => s.trim()).filter((s) => s.length > 0))]

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

/** Fetch all personas from DynamoDB (used for server-rendered lists). */
export async function listPersonasAction(): Promise<Persona[]> {
  await requireUser()
  return getAllPersonas()
}

/**
 * Primary entry point for the 3-step deployment wizard. Validates the form,
 * then performs a real DynamoDB PutItem (via `createPersona`, which uses
 * `@aws-sdk/lib-dynamodb`'s PutCommand on top of `@aws-sdk/client-dynamodb`).
 */
export async function createPersonaWithSkills(formData: FormData): Promise<ActionResult> {
  await requireUser()

  const input = parseForm(formData)
  const error = validatePersona(input)
  if (error) return { ok: false, error }

  const persona = await createPersona(nanoid(12), input)

  // Refresh every surface that reads persona data so the new row appears
  // immediately and survives a hard refresh (it now lives in DynamoDB).
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/admin")
  return { ok: true, persona }
}

export async function updatePersonaAction(id: string, formData: FormData): Promise<ActionResult> {
  await requireUser()

  const input = parseForm(formData)
  const error = validatePersona(input)
  if (error) return { ok: false, error }

  const persona = await updatePersona(id, input)
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/admin")
  if (!persona) return { ok: false, error: "Persona not found." }
  return { ok: true, persona }
}

export async function deletePersonaAction(id: string): Promise<ActionResult> {
  await requireUser()

  await deletePersona(id)
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/admin")
  return { ok: true }
}
