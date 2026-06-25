"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Coins, Sparkles, Zap } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { useSession } from "@/components/session-provider"
import { purchasePackageAction } from "@/app/actions"
import { SEEDING_PACKAGES, CREDIT_COST } from "@/lib/billing"
import type { Company } from "@/lib/types"

export function BillingClient({ companies }: { companies: Company[] }) {
  const { t, locale } = useI18n()
  const { activeCompanyId, setActiveCompanyId } = useSession()
  const [isPending, startTransition] = useTransition()
  const [pendingPackage, setPendingPackage] = useState<string | null>(null)
  const [balances, setBalances] = useState<Record<string, number>>(() =>
    Object.fromEntries(companies.map((c) => [c.id, c.totalCredits ?? 0])),
  )

  const nf = useMemo(() => new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US"), [locale])
  const cf = useMemo(
    () => new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", { style: "currency", currency: "USD" }),
    [locale],
  )

  const selected = activeCompanyId ?? companies[0]?.id ?? null
  const company = companies.find((c) => c.id === selected) ?? null
  const balance = company ? (balances[company.id] ?? company.totalCredits ?? 0) : 0

  function buy(packageId: string) {
    if (!company) return
    setPendingPackage(packageId)
    startTransition(async () => {
      const res = await purchasePackageAction(company.id, packageId)
      if (res.ok) {
        setBalances((prev) => ({ ...prev, [company.id]: res.company.totalCredits }))
      }
      setPendingPackage(null)
    })
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.billing.back}
      </Link>

      <header className="mt-6">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground">{t.billing.title}</h1>
        <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">{t.billing.subtitle}</p>
      </header>

      {/* Company selector */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        {companies.map((c) => {
          const active = c.id === selected
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCompanyId(c.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "border-accent/60 bg-accent/10 text-foreground"
                  : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.name}
            </button>
          )
        })}
      </div>

      {!company ? (
        <p className="mt-8 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {t.billing.selectCompanyFirst}
        </p>
      ) : (
        <>
          {/* Balance summary */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="glow-border rounded-2xl p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="h-4 w-4 text-accent" />
                {t.billing.currentBalance} · {company.name}
              </div>
              <p className="mt-2 font-mono text-3xl font-semibold text-foreground">{nf.format(balance)}</p>
              <p className="text-xs text-muted-foreground">{t.credits.remaining}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                {t.billing.consumed}
              </div>
              <p className="mt-2 font-mono text-3xl font-semibold text-foreground">
                {nf.format(company.creditsConsumed ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">{t.billing.creditsUnit}</p>
            </div>
          </div>

          {/* Packages */}
          <h2 className="mt-10 text-lg font-medium text-foreground">{t.billing.packages}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {SEEDING_PACKAGES.map((pkg) => {
              const busy = isPending && pendingPackage === pkg.id
              return (
                <div
                  key={pkg.id}
                  className={`relative flex flex-col rounded-2xl border p-6 ${
                    pkg.featured ? "border-accent/50 bg-accent/[0.04]" : "border-border bg-card"
                  }`}
                >
                  {pkg.featured && (
                    <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                      <Sparkles className="h-3 w-3" />
                      {t.billing.mostPopular}
                    </span>
                  )}
                  <h3 className="text-base font-medium text-foreground">{pkg.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight text-foreground">{cf.format(pkg.price)}</span>
                  </div>
                  <p className="mt-1 font-mono text-sm text-accent">
                    {nf.format(pkg.actions)} {t.billing.actionsUnit}
                  </p>
                  <p className="mt-3 flex-1 text-pretty text-sm text-muted-foreground">{pkg.blurb}</p>
                  <button
                    type="button"
                    onClick={() => buy(pkg.id)}
                    disabled={isPending}
                    className={`mt-5 inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-60 ${
                      pkg.featured
                        ? "bg-accent text-accent-foreground hover:bg-accent/90"
                        : "border border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {busy ? t.billing.buying : t.billing.buy}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Credit ledger */}
          <h2 className="mt-10 text-lg font-medium text-foreground">{t.billing.ledgerTitle}</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <LedgerRow label={t.billing.ledgerPost} cost={CREDIT_COST.post} unit={t.billing.perAction} />
            <div className="h-px bg-border" />
            <LedgerRow label={t.billing.ledgerTick} cost={CREDIT_COST.tick} unit={t.billing.perAction} />
          </div>
        </>
      )}
    </main>
  )
}

function LedgerRow({ label, cost, unit }: { label: string; cost: number; unit: string }) {
  return (
    <div className="flex items-center justify-between bg-card px-4 py-3">
      <span className="flex items-center gap-2 text-sm text-foreground">
        <Check className="h-4 w-4 text-accent" />
        {label}
      </span>
      <span className="font-mono text-sm text-muted-foreground">
        {cost} {unit}
      </span>
    </div>
  )
}
