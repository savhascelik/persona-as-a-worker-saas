"use server"

import { revalidatePath } from "next/cache"
import { nanoid } from "nanoid"
import { createPersona, deletePersona, getAllPersonas, updatePersona } from "@/lib/db"
import type { Persona, PersonaInput } from "@/lib/types"

function parseForm(formData: FormData): PersonaInput {
  const num = (key: string, fallback: number) => {
    const raw = formData.get(key)
    const parsed = raw != null ? Number.parseInt(String(raw), 10) : Number.NaN
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const clampHour = (h: number) => Math.min(23, Math.max(0, h))

  return {
    name: String(formData.get("name") || "").trim(),
    role: String(formData.get("role") || "").trim(),
    platform: String(formData.get("platform") || "").trim(),
    mcpUrl: String(formData.get("mcpUrl") || "").trim(),
    timezone: String(formData.get("timezone") || "UTC").trim(),
    workStartHour: clampHour(num("workStartHour", 9)),
    workEndHour: clampHour(num("workEndHour", 18)),
    minLatencySeconds: Math.max(0, num("minLatencySeconds", 30)),
    maxLatencySeconds: Math.max(1, num("maxLatencySeconds", 240)),
    postsPerDay: Math.max(1, num("postsPerDay", 2)),
  }
}

export type ActionResult = { ok: true; persona?: Persona } | { ok: false; error: string }

export async function listPersonasAction(): Promise<Persona[]> {
  return getAllPersonas()
}

export async function createPersonaAction(formData: FormData): Promise<ActionResult> {
  const input = parseForm(formData)

  if (!input.name || !input.role || !input.platform) {
    return { ok: false, error: "Name, role, and target platform are required." }
  }
  if (input.minLatencySeconds > input.maxLatencySeconds) {
    return { ok: false, error: "Minimum latency cannot exceed maximum latency." }
  }

  const persona = await createPersona(nanoid(12), input)
  revalidatePath("/dashboard")
  return { ok: true, persona }
}

export async function updatePersonaAction(id: string, formData: FormData): Promise<ActionResult> {
  const input = parseForm(formData)

  if (!input.name || !input.role || !input.platform) {
    return { ok: false, error: "Name, role, and target platform are required." }
  }
  if (input.minLatencySeconds > input.maxLatencySeconds) {
    return { ok: false, error: "Minimum latency cannot exceed maximum latency." }
  }

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
