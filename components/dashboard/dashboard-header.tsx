"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { Hexagon, LayoutDashboard, CreditCard, ShieldCheck, Workflow } from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import { useI18n } from "@/components/i18n-provider"
import { useSession } from "@/components/session-provider"
import { LanguageToggle, ThemeToggle } from "@/components/controls"
import { CreditGauge } from "./credit-gauge"
import type { Company } from "@/lib/types"

export function DashboardHeader({ companies }: { companies: Company[] }) {
  const { t } = useI18n()
  const pathname = usePathname()
  const { isAdmin, activeCompanyId } = useSession()

  const gauge = useMemo(() => {
    const active = activeCompanyId ? companies.find((c) => c.id === activeCompanyId) : undefined
    if (active) {
      return { balance: active.totalCredits ?? 0, consumed: active.creditsConsumed ?? 0, label: undefined }
    }
    // Aggregate across all companies.
    const balance = companies.reduce((s, c) => s + (c.totalCredits ?? 0), 0)
    const consumed = companies.reduce((s, c) => s + (c.creditsConsumed ?? 0), 0)
    return { balance, consumed, label: t.credits.aggregate }
  }, [companies, activeCompanyId, t])

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
            <NavLink href="/dashboard/skills" active={pathname === "/dashboard/skills" || pathname.startsWith("/dashboard/skills")} icon={Workflow}>
              {t.nav.skills}
            </NavLink>
            <NavLink href="/dashboard/billing" active={pathname === "/dashboard/billing"} icon={CreditCard}>
              {t.session.profileBilling}
            </NavLink>
            {isAdmin && (
              <NavLink href="/dashboard/admin" active={pathname === "/dashboard/admin"} icon={ShieldCheck}>
                {t.session.adminConsole}
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <CreditGauge balance={gauge.balance} consumed={gauge.consumed} label={gauge.label} />

          {isAdmin && (
            <span
              className="hidden items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent sm:inline-flex"
              title={t.session.superAdmin}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{t.session.admin}</span>
            </span>
          )}

          <LanguageToggle />
          <ThemeToggle />
          <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
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
