"use client"

import Link from "next/link"
import { ArrowRight, Gauge, MoonStar, PenLine, Plug, Sparkles } from "lucide-react"
import { useI18n } from "./i18n-provider"

export function Hero() {
  const { t } = useI18n()

  return (
    <section className="relative overflow-hidden">
      <div className="dotted-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-20 text-center md:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          {t.hero.badge}
        </span>

        <h1 className="mt-8 max-w-3xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
          <span className="text-gradient">{t.hero.title}</span>
        </h1>

        <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          {t.hero.subtitle}
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            {t.hero.primary}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#manifesto"
            className="inline-flex h-11 items-center rounded-md border border-border bg-card/40 px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent/10"
          >
            {t.hero.secondary}
          </a>
        </div>

        <WorkdayStrip />
      </div>
    </section>
  )
}

function WorkdayStrip() {
  const items = [
    { icon: MoonStar, label: "09:00 — Clock in" },
    { icon: Gauge, label: "11:30 — Analyze data" },
    { icon: PenLine, label: "14:00 — Publish deep post" },
    { icon: MoonStar, label: "18:00 — Clock out" },
  ]
  return (
    <div className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="glow-border flex flex-col items-start gap-2 rounded-lg p-4 text-left"
        >
          <Icon className="h-4 w-4 text-accent" />
          <span className="font-mono text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  )
}

export function Features() {
  const { t } = useI18n()

  const cards = [
    { icon: PenLine, title: t.features.card1Title, text: t.features.card1Text },
    { icon: Gauge, title: t.features.card2Title, text: t.features.card2Text },
    { icon: Plug, title: t.features.card3Title, text: t.features.card3Text },
  ]

  return (
    <section id="features" className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-4xl">
            {t.features.heading}
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">{t.features.subheading}</p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {cards.map(({ icon: Icon, title, text }) => (
            <article key={title} className="glow-border group rounded-xl p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background/50 text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-medium tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function CtaSection() {
  const { t } = useI18n()

  return (
    <section id="manifesto" className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="glow-border relative overflow-hidden rounded-2xl px-8 py-16 text-center md:px-16">
          <div className="dotted-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <h2 className="relative mx-auto max-w-2xl text-balance text-2xl font-semibold tracking-tight md:text-4xl">
            {t.cta.title}
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">
            {t.cta.subtitle}
          </p>
          <Link
            href="/dashboard"
            className="relative mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            {t.cta.button}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export function SiteFooter() {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="text-sm font-semibold tracking-tight">Persona-as-a-Worker</span>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">{t.footer.tagline}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          © {year} Persona-as-a-Worker. {t.footer.rights}
        </p>
      </div>
    </footer>
  )
}
