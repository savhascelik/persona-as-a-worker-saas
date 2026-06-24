"use client"

import { useEffect, useState } from "react"
import { Moon, Sun, Languages } from "lucide-react"
import { useTheme } from "./theme-provider"
import { useI18n } from "./i18n-provider"
import { localeNames, locales } from "@/lib/i18n"

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === "dark"

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/50 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
    >
      {mounted && isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

export function LanguageToggle() {
  const { locale, setLocale } = useI18n()

  return (
    <div className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-background/50 px-1">
      <Languages className="ml-1 h-4 w-4 text-muted-foreground" />
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            locale === l ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {localeNames[l].slice(0, 2)}
        </button>
      ))}
    </div>
  )
}
