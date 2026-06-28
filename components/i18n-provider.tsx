"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { dictionaries, type Locale } from "@/lib/i18n"

type Dict = (typeof dictionaries)["en"]

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dict
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = "paaw-locale"

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored && stored in dictionaries) {
      setLocaleState(stored)
    } else if (navigator.language.startsWith("es")) {
      setLocaleState("es")
    }
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.lang = next
  }, [])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: dictionaries[locale] }}>{children}</I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}
