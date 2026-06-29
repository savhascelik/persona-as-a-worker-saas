"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useUser } from "@clerk/nextjs"
import type { Role } from "@/lib/types"

interface SessionUser {
  name: string
  email: string
  role: Role
}

interface SessionState {
  user: SessionUser
  /** True when the signed-in Clerk user has `publicMetadata.role === "admin"`. */
  isAdmin: boolean
  /** Whether Clerk has finished loading the user. */
  isLoaded: boolean
  /** Company currently in focus across dashboard / billing. null = all. */
  activeCompanyId: string | null
  setActiveCompanyId: (id: string | null) => void
}

const SessionContext = createContext<SessionState | null>(null)

const COMPANY_KEY = "paaw-active-company"

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser()
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null)

  // Hydrate persisted company selection after mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COMPANY_KEY)
      if (stored) setActiveCompanyIdState(stored)
    } catch {
      /* ignore */
    }
  }, [])

  // Debug log to inspect Clerk user metadata in browser console
  useEffect(() => {
    if (isLoaded && user) {
      console.log("DEBUG [SessionProvider]: User loaded:", {
        email: user.primaryEmailAddress?.emailAddress,
        publicMetadata: user.publicMetadata,
        isAdmin: user.publicMetadata?.role === "admin"
      })
    }
  }, [user, isLoaded])

  const setActiveCompanyId = useCallback((id: string | null) => {
    setActiveCompanyIdState(id)
    try {
      if (id) localStorage.setItem(COMPANY_KEY, id)
      else localStorage.removeItem(COMPANY_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  // The role lives in Clerk's public metadata (set it to "admin" in the
  // Clerk dashboard to unlock the Admin Console).
  const isAdmin = user?.publicMetadata?.role === "admin"

  const value = useMemo<SessionState>(
    () => ({
      user: {
        name: user?.fullName || user?.firstName || user?.username || "Operator",
        email: user?.primaryEmailAddress?.emailAddress ?? "",
        role: isAdmin ? "ADMIN" : "MANAGER",
      },
      isAdmin,
      isLoaded,
      activeCompanyId,
      setActiveCompanyId,
    }),
    [user, isAdmin, isLoaded, activeCompanyId, setActiveCompanyId],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within SessionProvider")
  return ctx
}
