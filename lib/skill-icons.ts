import type { LucideIcon } from "lucide-react"
import {
  Sparkles,
  Bot,
  Brain,
  Compass,
  Eye,
  Gauge,
  Globe,
  Lightbulb,
  LineChart,
  Megaphone,
  Network,
  Newspaper,
  Rocket,
  Search,
  Workflow,
  Wand2,
} from "lucide-react"

/**
 * Curated set of icons available to admin-authored Skill Templates. The
 * generator picks one of these by name; the UI resolves it back to a component.
 */
export const SKILL_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Bot,
  Brain,
  Compass,
  Eye,
  Gauge,
  Globe,
  Lightbulb,
  LineChart,
  Megaphone,
  Network,
  Newspaper,
  Rocket,
  Search,
  Workflow,
  Wand2,
}

export const SKILL_ICON_NAMES = Object.keys(SKILL_ICONS)

export function resolveSkillIcon(name: string): LucideIcon {
  return SKILL_ICONS[name] ?? Sparkles
}
