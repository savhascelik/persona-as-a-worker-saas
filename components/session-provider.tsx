"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { Role } from "@/lib/types"

interface SessionUser {
  name: string
  email: string
  role: Role
}

interface SessionState {
  user: SessionUser
  isAdmin: boolean
  /** When true, an admin is viewing the global (cross-company) surface. */
  globalView: boolean
  setGlobalView: (v: boolean) => void
  /** Company currently in focus across dashboard / billing. null = all. */
  activeCompanyId: string | null
  setActiveCompanyId: (id: string | null) => void
}

/**
 * Mock session. In a real deployment this would be hydrated from an auth
 * provider. The demo user holds ADMIN permissions so the Super Admin toggle and
 * global views are demonstrable; flip `role` to "MANAGER" to see the scoped UX.
 */
const DEMO_USER: SessionUser = {
  name: "Avery Chen",
  email: "avery@personaworker.io",
  role: "ADMIN",
}

const SessionContext = createContext<SessionState | null>(null)

const GLOBAL_KEY = "paaw-global-view"
const COMPANY_KEY = "paaw-active-company"

export function SessionProvider({ children }: { children: ReactNode }) {
  const [globalView, setGlobalViewState] = useState(false)
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null)

  // Hydrate persisted selections after mount.
  useEffect(() => {
    try {
      setGlobalViewState(localStorage.getItem(GLOBAL_KEY) === "1")
      const stored = localStorage.getItem(COMPANY_KEY)
      if (stored) setActiveCompanyIdState(stored)
    } catch {
      /* ignore */
    }
  }, [])

  const setGlobalView = useCallback((v: boolean) => {
    setGlobalViewState(v)
    try {
      localStorage.setItem(GLOBAL_KEY, v ? "1" : "0")
    } catch {
      /* ignore */
    }
  }, [])

  const setActiveCompanyId = useCallback((id: string | null) => {
    setActiveCompanyIdState(id)
    try {
      if (id) localStorage.setItem(COMPANY_KEY, id)
      else localStorage.removeItem(COMPANY_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<SessionState>(
    () => ({
      user: DEMO_USER,
      isAdmin: DEMO_USER.role === "ADMIN",
      globalView,
      setGlobalView,
      activeCompanyId,
      setActiveCompanyId,
    }),
    [globalView, setGlobalView, activeCompanyId, setActiveCompanyId],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within SessionProvider")
  return ctx
}
