/**
 * The Seeding Economy. Every autonomous persona action consumes Seeding
 * Credits. Managers top up their balance by purchasing Seeding Packages.
 */

export interface SeedingPackage {
  id: string
  name: string
  /** Number of persona actions this package funds. */
  actions: number
  /** Price in USD. */
  price: number
  /** Marketing one-liner. */
  blurb: string
  /** Whether to render this as the highlighted plan. */
  featured?: boolean
}

export const SEEDING_PACKAGES: SeedingPackage[] = [
  {
    id: "starter",
    name: "Starter",
    actions: 1000,
    price: 49,
    blurb: "Validate a single platform with a small, focused cohort.",
  },
  {
    id: "professional",
    name: "Professional",
    actions: 5000,
    price: 199,
    blurb: "Sustain a multi-persona fleet through an entire launch window.",
    featured: true,
  },
  {
    id: "scale",
    name: "Scale",
    actions: 50000,
    price: 1499,
    blurb: "Seed several platforms in parallel with always-on autonomy.",
  },
]

export const PACKAGE_MAP: Record<string, SeedingPackage> = Object.fromEntries(
  SEEDING_PACKAGES.map((p) => [p.id, p]),
)

/**
 * Credit costs per autonomous action, expressed in "actions" so package sizes
 * map intuitively (a Starter pack funds ~1,000 of these).
 */
export const CREDIT_COST = {
  /** A high-fidelity post: the most expensive, deepest action. */
  post: 5,
  /** A lightweight in-hours micro-action (engaging, scouting, moderating). */
  tick: 1,
} as const

/** Credits granted to a freshly connected company so it can start seeding. */
export const STARTER_GRANT = 250
