"use client"

import Link from "next/link"
import { Hexagon } from "lucide-react"
import { useAuth, SignInButton, UserButton } from "@clerk/nextjs"
import { useI18n } from "./i18n-provider"
import { LanguageToggle, ThemeToggle } from "./controls"

export function SiteNav() {
  const { t } = useI18n()
  const { isSignedIn, isLoaded } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
            <Hexagon className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Persona-as-a-Worker</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t.nav.features}
          </a>
          <a href="#manifesto" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t.nav.manifesto}
          </a>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t.nav.dashboard}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
          {isLoaded && isSignedIn && (
            <>
              <Link
                href="/dashboard"
                className="hidden h-9 items-center rounded-md border border-border bg-background/50 px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent/10 sm:inline-flex mr-1"
              >
                {t.nav.dashboard}
              </Link>
              <UserButton />
            </>
          )}
          {isLoaded && !isSignedIn && (
            <SignInButton mode="modal">
              <button
                type="button"
                className="hidden h-9 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:inline-flex"
              >
                {t.nav.startSeeding}
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  )
}
