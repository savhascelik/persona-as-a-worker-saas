import { SiteNav } from "@/components/site-nav"
import { CtaSection, Features, Hero, InteractiveAlgorithmFlow, SiteFooter } from "@/components/landing"

export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main>
        <Hero />
        <InteractiveAlgorithmFlow />
        <Features />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  )
}

