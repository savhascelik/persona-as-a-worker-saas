import { SiteNav } from "@/components/site-nav"
import { CtaSection, Features, Hero, SiteFooter } from "@/components/landing"

export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main>
        <Hero />
        <Features />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  )
}
