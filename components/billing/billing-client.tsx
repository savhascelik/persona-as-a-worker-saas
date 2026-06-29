"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Coins, Sparkles, Zap, Lock, ShieldAlert, History, Send, Loader2 } from "lucide-react"
import { useI18n } from "@/components/i18n-provider"
import { useSession } from "@/components/session-provider"
import { createCreditRequestAction } from "@/app/actions"
import { SEEDING_PACKAGES, CREDIT_COST } from "@/lib/billing"
import type { Company, CreditRequest } from "@/lib/types"

export function BillingClient({
  companies,
  initialCreditRequests = [],
}: {
  companies: Company[]
  initialCreditRequests?: CreditRequest[]
}) {
  const { t, locale } = useI18n()
  const { activeCompanyId, setActiveCompanyId } = useSession()
  const [isPending, startTransition] = useTransition()
  
  // Local state for snappy UI updates
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>(initialCreditRequests)
  const [balances, setBalances] = useState<Record<string, number>>(() =>
    Object.fromEntries(companies.map((c) => [c.id, c.totalCredits ?? 0])),
  )

  // Form State
  const [formAmount, setFormAmount] = useState<number>(5000)
  const [formReason, setFormReason] = useState<string>("")
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const nf = useMemo(() => new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US"), [locale])
  const cf = useMemo(
    () => new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", { style: "currency", currency: "USD" }),
    [locale],
  )

  const selected = activeCompanyId ?? companies[0]?.id ?? null
  const company = companies.find((c) => c.id === selected) ?? null
  const balance = company ? (balances[company.id] ?? company.totalCredits ?? 0) : 0

  // Filter requests belonging to the active company for clear scoping
  const companyRequests = useMemo(() => {
    if (!company) return []
    return creditRequests.filter((r) => r.companyId === company.id)
  }, [creditRequests, company])

  const hasPendingRequest = useMemo(() => {
    return companyRequests.some((r) => r.status === "pending")
  }, [companyRequests])

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return

    setFormError(null)
    setFormSuccess(null)

    if (formAmount < 500 || formAmount > 25000) {
      setFormError(
        locale === "es"
          ? "La cantidad de créditos debe estar entre 500 y 25,000 para evitar abusos."
          : "Requested amount must be between 500 and 25,000 credits to prevent abuse."
      )
      return
    }

    if (formReason.trim().length < 10) {
      setFormError(
        locale === "es"
          ? "Por favor, proporcione un motivo detallado (mínimo 10 caracteres)."
          : "Please provide a detailed reason (at least 10 characters)."
      )
      return
    }

    if (formReason.trim().length > 500) {
      setFormError(
        locale === "es"
          ? "El motivo no puede superar los 500 caracteres."
          : "Reason cannot exceed 500 characters."
      )
      return
    }

    startTransition(async () => {
      const res = await createCreditRequestAction(company.id, formAmount, formReason)
      if (res.ok) {
        setCreditRequests((prev) => [res.request, ...prev])
        setFormReason("")
        setFormSuccess(
          locale === "es"
            ? "¡Solicitud enviada con éxito! Los administradores revisarán su solicitud en breve."
            : "Request submitted successfully! Admins will review your request shortly."
        )
      } else {
        setFormError(res.error)
      }
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
        <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
          {locale === "es"
            ? "Gestiona el financiamiento de tus adoptadores tempranos sintéticos de manera segura mediante créditos de prueba."
            : "Securely fund your synthetic early adopters fleet using managed credit trials."}
        </p>
      </header>

      {/* Company selector */}
      <div className="mt-8">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">
          {locale === "es" ? "Plataforma Activa" : "Active Platform Connection"}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {companies.map((c) => {
            const active = c.id === selected
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveCompanyId(c.id)
                  setFormError(null)
                  setFormSuccess(null)
                }}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-accent/60 bg-accent/10 text-foreground"
                    : "border-border bg-background/40 text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </div>

      {!company ? (
        <p className="mt-8 rounded-xl border border-border bg-card/40 p-6 text-sm text-muted-foreground">
          {companies.length === 0 ? t.billing.noCompanies : t.billing.selectCompanyFirst}
        </p>
      ) : (
        <div className="space-y-10">
          {/* Balance summary */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="glow-border rounded-2xl p-5 bg-card/20 backdrop-blur-md">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="h-4 w-4 text-accent" />
                {t.billing.currentBalance} · {company.name}
              </div>
              <p className="mt-2 font-mono text-3xl font-semibold text-foreground">{nf.format(balance)}</p>
              <p className="text-xs text-muted-foreground">{t.credits.remaining}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/40 p-5">
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

          {/* Secure Credit Request & Lock Section */}
          <div className="grid gap-6 md:grid-cols-5 items-start">
            
            {/* Left: The Credit Request Form (3 cols) */}
            <div className="md:col-span-3 rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Coins className="h-24 w-24 text-accent" />
              </div>

              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Send className="h-5 w-5 text-accent" />
                {locale === "es" ? "Solicitar Créditos de Prueba" : "Request Trial Seeding Credits"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                {locale === "es"
                  ? "Envíe una solicitud de créditos a un administrador. Cada envío es auditado y limitado para garantizar la seguridad del sistema."
                  : "Submit a trial request to system administrators. Every request is audited and limited to ensure system safety against bot attacks."}
              </p>

              <form onSubmit={handleRequestSubmit} className="space-y-4">
                {/* Pre-defined Amount Presets */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                    {locale === "es" ? "Cantidad a Solicitar" : "Amount to Request"}
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[1000, 5000, 10000, 25000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormAmount(preset)}
                        className={`py-1.5 rounded-lg border text-xs font-semibold font-mono transition-all ${
                          formAmount === preset
                            ? "border-accent bg-accent/10 text-accent-foreground"
                            : "border-border bg-background/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        +{nf.format(preset)}
                      </button>
                    ))}
                  </div>

                  {/* Manual input */}
                  <div className="relative">
                    <input
                      type="number"
                      min={500}
                      max={25000}
                      value={formAmount}
                      onChange={(e) => setFormAmount(Number(e.target.value))}
                      className="w-full h-10 rounded-lg border border-border bg-background/60 px-3 pr-16 font-mono text-sm focus:border-accent focus:outline-none transition-colors"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono uppercase">
                      {t.billing.creditsUnit}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    {locale === "es" ? "Rango permitido: 500 - 25,000 créditos" : "Allowed range: 500 - 25,000 credits"}
                  </span>
                </div>

                {/* Reason for Request */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    {locale === "es" ? "Motivo del Requerimiento" : "Reason for Request"}
                  </label>
                  <textarea
                    rows={4}
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    placeholder={
                      locale === "es"
                        ? "Por ejemplo: Necesito realizar pruebas de estrés con 3 personas durante 2 días..."
                        : "e.g., Testing a new Slack integration on our developer environment with 3 personas..."
                    }
                    className="w-full rounded-lg border border-border bg-background/60 p-3 text-sm focus:border-accent focus:outline-none transition-colors resize-none placeholder:text-muted-foreground/50"
                    maxLength={500}
                    required
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {locale === "es" ? "Mínimo 10 caracteres" : "Minimum 10 characters"}
                    </span>
                    <span className={`text-[10px] font-mono ${formReason.length < 10 ? "text-muted-foreground" : formReason.length > 450 ? "text-amber-500" : "text-emerald-500"}`}>
                      {formReason.length}/500
                    </span>
                  </div>
                </div>

                {/* Security info / Anti-Abuse alert */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-3 text-xs text-amber-500/90 leading-normal">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">
                      {locale === "es" ? "Medidas de Protección de Recursos" : "Spam & Abuse Protection Active"}
                    </span>
                    {locale === "es"
                      ? "Para mitigar ataques automatizados de bots, cada conexión está limitada a una sola solicitud activa de crédito de prueba a la vez."
                      : "To mitigate automated bot flooding, each platform connection is limited to exactly one pending request at any given time."}
                  </div>
                </div>

                {/* Error & Success Messages */}
                {formError && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 text-sm leading-normal">
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 text-sm leading-normal">
                    {formSuccess}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isPending || hasPendingRequest}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg font-medium text-sm transition-all shadow-md bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {hasPendingRequest
                    ? locale === "es"
                      ? "Esperando Aprobación"
                      : "Awaiting Admin Approval"
                    : locale === "es"
                    ? "Enviar Solicitud de Crédito"
                    : "Submit Credit Request"}
                </button>
              </form>
            </div>

            {/* Right: Packages locked (2 cols) */}
            <div className="md:col-span-2 space-y-4">
              <div className="rounded-2xl border border-border/80 bg-background/20 p-5 relative overflow-hidden flex flex-col items-center text-center">
                {/* Locks aesthetic */}
                <div className="h-10 w-10 rounded-full bg-border/40 flex items-center justify-center border border-border mb-3 text-muted-foreground shadow-inner">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {locale === "es" ? "Pagos Directos Deshabilitados" : "Self-Purchase Locked"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                  {locale === "es"
                    ? "La autocompra directa está deshabilitada temporalmente en preparación para la integración del paywall."
                    : "Direct credit purchasing has been deactivated as we build our payment gateway integration."}
                </p>
              </div>

              {/* Blur representation of packages */}
              <div className="opacity-50 pointer-events-none relative rounded-2xl border border-border/40 bg-card/20 p-4 space-y-4 filter blur-[0.7px]">
                <div className="flex justify-between items-center pb-2 border-b border-border/40 text-xs">
                  <span className="font-semibold text-muted-foreground">{t.billing.packages}</span>
                  <span className="font-mono text-[10px] text-accent">Locked</span>
                </div>
                {SEEDING_PACKAGES.map((pkg) => (
                  <div key={pkg.id} className="p-3 rounded-lg border border-border bg-card/50 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{pkg.name}</p>
                      <p className="text-[10px] text-muted-foreground">{nf.format(pkg.actions)} {t.billing.actionsUnit}</p>
                    </div>
                    <span className="font-mono font-semibold text-muted-foreground">{cf.format(pkg.price)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Credit Request History */}
          <div className="rounded-2xl border border-border bg-card/20 p-6">
            <h2 className="text-lg font-medium text-foreground flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-muted-foreground" />
              {locale === "es" ? "Historial de Solicitudes" : "Credit Request History"}
            </h2>

            {companyRequests.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                {locale === "es"
                  ? "No se encontraron solicitudes de crédito previas para esta plataforma."
                  : "No credit requests found for this active platform connection."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-4 font-semibold">{locale === "es" ? "Fecha" : "Date"}</th>
                      <th className="py-3 px-4 font-semibold">{locale === "es" ? "Cantidad" : "Amount"}</th>
                      <th className="py-3 px-4 font-semibold">{locale === "es" ? "Motivo" : "Reason"}</th>
                      <th className="py-3 px-4 font-semibold text-right">{locale === "es" ? "Estado" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {companyRequests.map((req) => {
                      const dateStr = new Date(req.createdAt).toLocaleDateString(
                        locale === "es" ? "es-ES" : "en-US",
                        { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                      )
                      return (
                        <tr key={req.id} className="hover:bg-muted/10 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {dateStr}
                          </td>
                          <td className="py-3.5 px-4 font-semibold font-mono text-foreground whitespace-nowrap">
                            +{nf.format(req.amount)}
                          </td>
                          <td className="py-3.5 px-4 max-w-[280px] truncate text-muted-foreground text-xs" title={req.reason}>
                            {req.reason}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {req.status === "pending" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-500 animate-pulse">
                                {locale === "es" ? "Pendiente" : "Pending"}
                              </span>
                            )}
                            {req.status === "approved" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                {locale === "es" ? "Aprobado" : "Approved"}
                              </span>
                            )}
                            {req.status === "rejected" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400">
                                {locale === "es" ? "Rechazado" : "Rejected"}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Credit ledger */}
          <h2 className="text-lg font-medium text-foreground">{t.billing.ledgerTitle}</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card/10">
            <LedgerRow label={t.billing.ledgerPost} cost={CREDIT_COST.post} unit={t.billing.perAction} />
            <div className="h-px bg-border" />
            <LedgerRow label={t.billing.ledgerTick} cost={CREDIT_COST.tick} unit={t.billing.perAction} />
          </div>
        </div>
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
