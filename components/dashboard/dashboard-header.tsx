"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { Hexagon, LayoutDashboard, CreditCard, ShieldCheck } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { useSession } from "@/components/session-provider"
import { LanguageToggle, ThemeToggle } from "@/components/controls"
import { CreditGauge } from "./credit-gauge"
import type { Company } from "@/lib/types"

export function DashboardHeader({ companies }: { companies: Company[] }) {
  const { t } = useI18n()
  const pathname = usePathname()
  const { isAdmin, globalView, setGlobalView, activeCompanyId } = useSession()

  const gauge = useMemo(() => {
    const active = activeCompanyId ? companies.find((c) => c.id === activeCompanyId) : undefined
    if (active && !(globalView && !activeCompanyId)) {
      return { balance: active.totalCredits, consumed: active.creditsConsumed, label: undefined }
    }
    // Aggregate across all companies.
    const balance = companies.reduce((s, c) => s + (c.totalCredits ?? 0), 0)
    const consumed = companies.reduce((s, c) => s + (c.creditsConsumed ?? 0), 0)
    return { balance, consumed, label: t.credits.aggregate }
  }, [companies, activeCompanyId, globalView, t])

  const showAdmin = isAdmin && globalView

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
              <Hexagon className="h-4 w-4" />
            </span>
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">Persona-as-a-Worker</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/dashboard" active={pathname === "/dashboard"} icon={LayoutDashboard}>
              {t.nav.dashboard}
            </NavLink>
            <NavLink href="/dashboard/billing" active={pathname === "/dashboard/billing"} icon={CreditCard}>
              {t.session.profileBilling}
            </NavLink>
            {showAdmin && (
              <NavLink href="/dashboard/admin" active={pathname === "/dashboard/admin"} icon={ShieldCheck}>
                {t.session.adminConsole}
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <CreditGauge balance={gauge.balance} consumed={gauge.consumed} label={gauge.label} />

          {isAdmin && (
            <button
              type="button"
              role="switch"
              aria-checked={globalView}
              onClick={() => setGlobalView(!globalView)}
              className={`hidden items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:inline-flex ${
                globalView
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
              }`}
              title={t.session.superAdmin}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t.session.superAdmin}</span>
              <span
                className={`relative h-4 w-7 rounded-full transition-colors ${globalView ? "bg-accent" : "bg-muted"}`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-background transition-transform ${
                    globalView ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          )}

          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

function NavLink({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string
  active: boolean
  icon: typeof LayoutDashboard
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  )
}
