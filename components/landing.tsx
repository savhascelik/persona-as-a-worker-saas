"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Gauge, MoonStar, PenLine, Plug, Sparkles, Target, Cpu, CheckCircle2, RefreshCw, Play, Database, Search, Terminal as TerminalIcon } from "lucide-react"
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

export function InteractiveAlgorithmFlow() {
  const { t, locale } = useI18n()
  const [activeStep, setActiveStep] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4)
    }, 4500)
    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const steps = [
    {
      id: 0,
      title: locale === "es" ? "1. Definir Meta" : "1. Define Business Goal",
      subtitle: locale === "es" ? "Instrucción de Alto Nivel" : "High-Level Instructions",
      icon: Target,
      color: "from-blue-500 to-cyan-500",
      bgLight: "bg-blue-500/10",
      borderGlow: "rgba(59, 130, 246, 0.4)",
      desc: locale === "es" 
        ? "El viaje comienza cuando defines un objetivo comercial de alto nivel. Sin escribir código o scripts difíciles, simplemente configuras lo que quieres lograr."
        : "The process begins with a simple, high-level business goal. No code, no complex scripts. You simply specify what you want the persona to achieve, and our autonomous engine does the rest.",
      bullet1: locale === "es" ? "Escribe objetivos en lenguaje natural simple" : "Plain natural-language input",
      bullet2: locale === "es" ? "Asigna presupuestos diarios y límites de acción" : "Define action budgets & constraints",
      bullet3: locale === "es" ? "Desacoplado de la interfaz para ejecución 24/7" : "100% decoupled from UI for 24/7 background run"
    },
    {
      id: 1,
      title: locale === "es" ? "2. Escaneo Dinámico de MCP" : "2. Dynamic MCP Scanning",
      subtitle: locale === "es" ? "Descubrimiento de Herramientas" : "On-the-fly Tool Discovery",
      icon: Search,
      color: "from-purple-500 to-indigo-500",
      bgLight: "bg-purple-500/10",
      borderGlow: "rgba(168, 85, 247, 0.4)",
      desc: locale === "es"
        ? "El persona accede a la URL MCP de tu plataforma. Escanea dinámicamente las herramientas disponibles y aprende a usarlas al instante."
        : "Our background worker scans your platform's live MCP (Model Context Protocol) URL. It dynamically discovers available endpoints and tools on-the-fly, binding them as skills to the active persona.",
      bullet1: locale === "es" ? "Descubrimiento en tiempo real sin reiniciar" : "Zero rebuilds, real-time reflection",
      bullet2: locale === "es" ? "Mapeo dinámico de esquemas OpenAPI y MCP" : "Dynamic OpenAPI and MCP schema parsing",
      bullet3: locale === "es" ? "Seguridad estricta en las llamadas a la API" : "Secure sandboxed execution & authentication"
    },
    {
      id: 2,
      title: locale === "es" ? "3. Algoritmo de Bucle ReAct" : "3. Autonomous ReAct Loop",
      subtitle: locale === "es" ? "Pensamiento y Acción Autonómicos" : "Cognitive Reasoning & Tools",
      icon: Cpu,
      color: "from-amber-500 to-orange-500",
      bgLight: "bg-amber-500/10",
      borderGlow: "rgba(245, 158, 11, 0.4)",
      desc: locale === "es"
        ? "El persona entra en un bucle cognitivo de Pensamiento -> Acción -> Observación. Planea, elige la mejor herramienta, evalúa el resultado y sigue."
        : "The persona enters an autonomous Reasoning + Action (ReAct) loop. It reasons about the current state, selects the optimal MCP tool, executes it, analyzes the result (observation), and adapts its plan dynamically.",
      bullet1: locale === "es" ? "Razonamiento continuo hasta completar el objetivo" : "Reasoning loop terminates only when goal is met",
      bullet2: locale === "es" ? "Toma de decisiones multi-herramienta inteligente" : "Multi-tool selection based on context",
      bullet3: locale === "es" ? "Manejo automático de errores y reintentos" : "Self-healing error and boundary handling"
    },
    {
      id: 3,
      title: locale === "es" ? "4. Meta Lograda" : "4. Goal Accomplished",
      subtitle: locale === "es" ? "Éxito y Almacenamiento AWS" : "Success & DynamoDB Persistence",
      icon: CheckCircle2,
      color: "from-emerald-500 to-green-500",
      bgLight: "bg-emerald-500/10",
      borderGlow: "rgba(16, 185, 129, 0.4)",
      desc: locale === "es"
        ? "El objetivo se cumple con éxito. Los resultados se guardan de forma permanente en DynamoDB, se actualiza el feed en vivo y se apaga."
        : "Upon goal resolution, the worker compiles the results, persists execution logs and metrics securely in AWS DynamoDB, updates the active dashboard feed, and clocks out.",
      bullet1: locale === "es" ? "Persistencia escalable a nivel de AWS" : "High-scale AWS DynamoDB data layer",
      bullet2: locale === "es" ? "Contadores de acciones MCP incrementados" : "MCP Action counters incremented live",
      bullet3: locale === "es" ? "Feed de actividad en tiempo real" : "Real-time activity feed updates instantly"
    }
  ]

  return (
    <section className="border-t border-border/60 bg-muted/20 py-24 relative overflow-hidden">
      <div className="dotted-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="mx-auto max-w-6xl px-6">
        
        {/* Header Region */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1 text-xs text-muted-foreground mb-4">
            <RefreshCw className="h-3 w-3 text-accent animate-spin" style={{ animationDuration: '6s' }} />
            {locale === "es" ? "Cómo Funciona El Motor" : "The Core Execution Engine"}
          </span>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl text-gradient">
            {locale === "es" ? "El Ciclo Autónomo de MCP" : "The Autonomous Seeding Loop"}
          </h2>
          <p className="mt-4 text-sm md:text-base leading-relaxed text-muted-foreground">
            {locale === "es" 
              ? "Descubra cómo nuestras personas de IA comprenden metas, escanean herramientas y ejecutan bucles cognitivos de forma 100% independiente."
              : "Experience how our synthetic personas understand high-level goals, dynamically scan connected endpoints, and execute cognitive reasoning loops to solve complex tasks."}
          </p>
        </div>

        {/* Step Buttons (Tabs) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-12">
          {steps.map((step) => {
            const Icon = step.icon
            const isActive = activeStep === step.id
            return (
              <button
                key={step.id}
                onClick={() => {
                  setActiveStep(step.id)
                  setIsAutoPlaying(false)
                }}
                className={`glow-border flex flex-col items-start p-5 rounded-xl text-left transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                  isActive 
                    ? "scale-[1.02] bg-card border-accent/40" 
                    : "opacity-70 hover:opacity-100 bg-card/40 border-border"
                }`}
                style={{
                  boxShadow: isActive ? `0 0 15px ${step.borderGlow}` : 'none'
                }}
              >
                <div className={`p-2.5 rounded-lg mb-4 text-accent transition-transform duration-300 ${step.bgLight} ${isActive ? 'scale-110' : ''}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {step.subtitle}
                </div>
                <h3 className="font-medium text-sm text-foreground group-hover:text-accent transition-colors">
                  {step.title}
                </h3>
                {isActive && (
                  <div className={`absolute bottom-0 left-0 h-[3px] bg-gradient-to-r ${step.color} w-full animate-pulse-width`} />
                )}
              </button>
            )
          })}
        </div>

        {/* Dynamic Split Panel */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Panel: Description */}
          <div className="lg:col-span-5 flex flex-col justify-between p-8 rounded-2xl border border-border bg-card/60 backdrop-blur-md relative overflow-hidden">
            <div className="dotted-grid pointer-events-none absolute inset-0 opacity-10" />
            
            <div className="relative z-10">
              <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-mono mb-4 text-white bg-gradient-to-r ${steps[activeStep].color}`}>
                STAGE 0{activeStep + 1}
              </span>
              <h4 className="text-xl font-semibold mb-4 text-foreground transition-all duration-300">
                {steps[activeStep].title}
              </h4>
              <p className="text-sm leading-relaxed text-muted-foreground mb-6 transition-all duration-300">
                {steps[activeStep].desc}
              </p>

              <ul className="space-y-3.5">
                {[steps[activeStep].bullet1, steps[activeStep].bullet2, steps[activeStep].bullet3].map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white bg-gradient-to-r ${steps[activeStep].color} text-[8px] font-bold mt-0.5`}>
                      ✓
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-border flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {isAutoPlaying ? "AUTO-PLAYING DEMO" : "PAUSED (CLICK TO RESUME)"}
                </span>
              </div>
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="text-xs text-accent hover:text-accent/80 font-medium flex items-center gap-1"
              >
                {isAutoPlaying ? "Pause" : "Resume Auto-Play"}
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Right Panel: Stunning Interactive Simulator Visual */}
          <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-6 flex flex-col justify-center min-h-[360px] relative overflow-hidden shadow-inner">
            <div className="dotted-grid pointer-events-none absolute inset-0 opacity-10" />
            
            {/* Visual Simulator based on Active Step */}
            {activeStep === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-8 space-y-6 relative z-10">
                <div className="w-full max-w-sm rounded-xl border border-border bg-muted/30 p-5 space-y-4 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center justify-between border-b border-border/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">goal_wizard.exe</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono text-muted-foreground uppercase">Target Persona</label>
                    <div className="px-3 py-2 rounded border border-border bg-card flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">JD</div>
                      <span className="text-xs font-medium text-foreground">John_Doe (Marketing Lead)</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono text-muted-foreground uppercase">Define High-Level Goal</label>
                    <div className="p-3 rounded border border-accent/40 bg-card/80 text-xs font-mono relative overflow-hidden min-h-[50px] shadow-[inset_0_0_10px_rgba(var(--accent),0.02)]">
                      <span className="text-foreground">Analyze </span>
                      <span className="text-accent underline decoration-dotted decoration-2">recent organic tea trends</span>
                      <span className="text-foreground"> on Shopify MCP, draft a creative campaign, and alert Shopify channel.</span>
                      <span className="inline-block h-3 w-1.5 bg-accent ml-1 animate-pulse-cursor" />
                    </div>
                  </div>
                  <button className="w-full py-2 bg-foreground text-background font-mono text-xs rounded-lg flex items-center justify-center gap-2 font-medium shadow-md">
                    <Play className="h-3 w-3 fill-current" /> EXECUTE AUTONOMOUS WORKER
                  </button>
                </div>
              </div>
            )}

            {activeStep === 1 && (
              <div className="flex flex-col items-center justify-center h-full py-6 space-y-6 relative z-10">
                <div className="relative flex items-center justify-center w-full max-w-md h-[220px]">
                  
                  {/* Outer Scanning Circles */}
                  <div className="absolute h-40 w-40 rounded-full border border-purple-500/20 animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute h-56 w-56 rounded-full border border-indigo-500/10 animate-ping" style={{ animationDuration: '4s' }} />
                  
                  {/* Central Persona Node */}
                  <div className="absolute z-20 flex flex-col items-center justify-center h-16 w-16 rounded-full border border-accent bg-card shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                    <Cpu className="h-6 w-6 text-accent animate-pulse" />
                    <span className="text-[9px] font-mono mt-0.5 text-accent font-bold">WORKER</span>
                  </div>

                  {/* Connected Target Tools Nodes */}
                  <div className="absolute top-2 left-6 px-3 py-1.5 rounded-lg border border-border bg-card/90 shadow-md flex items-center gap-2 animate-bounce" style={{ animationDuration: '4s' }}>
                    <Database className="h-3 w-3 text-purple-500" />
                    <span className="text-[10px] font-mono">get_products()</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  <div className="absolute bottom-4 left-10 px-3 py-1.5 rounded-lg border border-border bg-card/90 shadow-md flex items-center gap-2 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
                    <TerminalIcon className="h-3 w-3 text-indigo-500" />
                    <span className="text-[10px] font-mono">publish_post()</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  <div className="absolute top-10 right-4 px-3 py-1.5 rounded-lg border border-border bg-card/90 shadow-md flex items-center gap-2 animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '0.8s' }}>
                    <Sparkles className="h-3 w-3 text-yellow-500" />
                    <span className="text-[10px] font-mono">analyze_sentiment()</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  <div className="absolute bottom-8 right-12 px-3 py-1.5 rounded-lg border border-border bg-card/90 shadow-md flex items-center gap-2 animate-bounce" style={{ animationDuration: '3s', animationDelay: '1.2s' }}>
                    <Search className="h-3 w-3 text-blue-500" />
                    <span className="text-[10px] font-mono">slack_notify()</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  {/* SVG Connection Lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="50%" y1="50%" x2="25%" y2="20%" stroke="rgba(168,85,247,0.3)" strokeWidth="1.5" strokeDasharray="5,5" className="animate-dash" />
                    <line x1="50%" y1="50%" x2="28%" y2="80%" stroke="rgba(168,85,247,0.3)" strokeWidth="1.5" strokeDasharray="5,5" className="animate-dash" />
                    <line x1="50%" y1="50%" x2="78%" y2="28%" stroke="rgba(168,85,247,0.3)" strokeWidth="1.5" strokeDasharray="5,5" className="animate-dash" />
                    <line x1="50%" y1="50%" x2="72%" y2="72%" stroke="rgba(168,85,247,0.3)" strokeWidth="1.5" strokeDasharray="5,5" className="animate-dash" />
                  </svg>

                </div>
                <div className="text-center font-mono text-[11px] text-muted-foreground">
                  Scanning <span className="text-accent underline">https://api.acme.com/mcp</span> ... Dynamic bindings success.
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="flex flex-col h-full relative z-10">
                <div className="rounded-xl border border-border bg-muted/40 p-4 font-mono text-[11px] text-muted-foreground space-y-2.5 h-[230px] overflow-y-auto flex flex-col justify-end shadow-inner">
                  <div className="border-b border-border/80 pb-2 mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Cpu className="h-3 w-3 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} /> REACT COGNITIVE LOOP
                    </span>
                    <span className="text-[10px] text-muted-foreground">Running Loop Tick #2...</span>
                  </div>
                  
                  <div className="text-amber-500 font-semibold animate-pulse-fast">
                    &gt; THINKING: I need to query Shopify MCP to extract the latest tea catalog.
                  </div>
                  <div className="text-blue-400">
                    &gt; ACTION: Invoking Shopify.get_products({"{"} limit: 3, organic: true {"}"})
                  </div>
                  <div className="text-emerald-400/90 pl-2">
                    &gt; OBSERVATION: Catalog load successful. Found "Organic Matcha", "Herbal Lavender", "Chai Boost".
                  </div>
                  <div className="text-amber-500 font-semibold">
                    &gt; THINKING: Next, write a highly engaging content summary for Lavender and trigger the publisher.
                  </div>
                  <div className="text-blue-400">
                    &gt; ACTION: Invoking Social.publish_post({"{"} content: "Cozy vibes with Lavender..." {"}"})
                  </div>
                  <div className="text-white font-semibold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded w-fit">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    GOAL MET: All conditions verified. Terminal loop exit code 0.
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 mt-4 font-mono text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 text-amber-500 animate-spin" /> Reasoning Loop Active
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">100% Autonomous (No Human-in-the-loop)</span>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="flex flex-col items-center justify-center h-full py-4 space-y-6 relative z-10">
                <div className="text-center space-y-4">
                  <div className="relative inline-flex">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="relative h-20 w-20 rounded-full border-2 border-emerald-500 bg-card flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.35)]">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" style={{ animationDuration: '3s' }} />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h5 className="font-semibold text-lg text-foreground">Goal Completed Successfully!</h5>
                    <p className="text-xs text-muted-foreground font-mono">Job Hash: d7b8a1c9-dynamo-aws</p>
                  </div>
                </div>

                {/* Simulated AWS Database Stat Sync */}
                <div className="w-full max-w-sm grid grid-cols-2 gap-3.5 pt-4 border-t border-border">
                  <div className="rounded-xl border border-border bg-card p-3.5 text-center">
                    <span className="text-[10px] font-mono text-muted-foreground block uppercase mb-1">AWS DynamoDB Stat</span>
                    <span className="font-semibold text-foreground text-sm flex items-center justify-center gap-1">
                      <Database className="h-3.5 w-3.5 text-emerald-500" /> SYNCED OK
                    </span>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3.5 text-center">
                    <span className="text-[10px] font-mono text-muted-foreground block uppercase mb-1">MCP Actions Live</span>
                    <span className="font-mono font-bold text-emerald-500 text-base">
                      +1 Live Action
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Embedded Styles for custom animations to guarantee absolute portability */}
      <style jsx global>{`
        @keyframes pulseWidth {
          0% { width: 0%; opacity: 0.5; }
          100% { width: 100%; opacity: 1; }
        }
        @keyframes pulseCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-pulse-width {
          animation: pulseWidth 4.5s linear infinite;
        }
        .animate-pulse-cursor {
          animation: pulseCursor 0.8s infinite;
        }
        .animate-dash {
          animation: dash 1.5s linear infinite;
        }
        .animate-pulse-fast {
          animation: pulseCursor 1.5s infinite;
        }
      `}</style>
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

