export type Locale = "en" | "es"

export const locales: Locale[] = ["en", "es"]

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
}

type Dict = typeof en

const en = {
  nav: {
    features: "Features",
    manifesto: "Manifesto",
    dashboard: "Dashboard",
    startSeeding: "Start Seeding",
  },
  hero: {
    badge: "Now seeding early-stage platforms",
    title: "Hire Synthetic Early Adopters, Not Bots.",
    subtitle:
      "We don't pump fake traffic. We rent you high-fidelity AI users who log in at 9 AM, analyze your data, create deep content, and clock out at 6 PM.",
    primary: "Start Seeding",
    secondary: "Read Manifesto",
  },
  features: {
    heading: "Engineered for authenticity, not vanity metrics.",
    subheading:
      "Every persona is tuned to behave like a real professional joining your platform during its earliest, most fragile days.",
    card1Title: "Quality Over Quantity",
    card1Text:
      "Real users don't spam 500 comments a day. Our personas publish 1 or 2 deeply insightful, creator-level posts that spark real discussions.",
    card2Title: "Human-like Rhythm & Pacing",
    card2Text:
      "Built-in latency, sleep schedules, and timezone-aware interactions. They act exactly like human professionals.",
    card3Title: "Zero-Config via MCP",
    card3Text:
      "No integration needed. Paste your OpenAPI or MCP URL, and our system dynamically learns how to use your platform's features.",
  },
  cta: {
    title: "Seed your platform with users worth keeping.",
    subtitle: "Stand up your first cohort of synthetic early adopters in minutes. No fake traffic. No bot farms.",
    button: "Open the Dashboard",
  },
  footer: {
    tagline: "High-fidelity AI personas for platform seeding.",
    product: "Product",
    company: "Company",
    rights: "All rights reserved.",
  },
  dashboard: {
    title: "Personas",
    subtitle: "Manage your fleet of synthetic early adopters and their working rhythms.",
    newPersona: "New Persona",
    backToSite: "Back to site",
    statTotal: "Total Personas",
    statActive: "Active Now",
    statPosts: "Posts Published",
    statEngagement: "Avg. Engagement",
    empty: "No personas yet. Deploy your first synthetic early adopter to begin seeding.",
    deployFirst: "Deploy your first persona",
    dbError:
      "Persona data is served from DynamoDB in your deployed environment. It looks unreachable here, so the live fleet can't be loaded yet — deploy or verify the integration credentials.",
    colName: "Persona",
    colPlatform: "Platform",
    colHours: "Working Hours",
    colLatency: "Latency",
    colStatus: "Status",
    colOutput: "Output",
    posts: "posts",
    delete: "Delete",
    edit: "Edit",
  },
  form: {
    createTitle: "Deploy a Persona",
    editTitle: "Edit Persona",
    createDesc: "Configure a high-fidelity synthetic adopter. They will operate strictly within the hours you define.",
    name: "Name",
    namePlaceholder: "Dr. Elena Marsh",
    role: "Professional Role",
    rolePlaceholder: "Senior Data Scientist",
    platform: "Target Platform",
    platformPlaceholder: "Acme Analytics",
    mcpUrl: "MCP / OpenAPI URL",
    mcpPlaceholder: "https://api.acme.com/openapi.json",
    timezone: "Timezone",
    workStart: "Clock-in Hour",
    workEnd: "Clock-out Hour",
    minLatency: "Min Latency (s)",
    maxLatency: "Max Latency (s)",
    postsPerDay: "Posts / Day",
    cancel: "Cancel",
    deploy: "Deploy Persona",
    save: "Save Changes",
    submitting: "Working...",
  },
  status: {
    active: "Active",
    idle: "Idle",
    offline: "Offline",
    seeding: "Seeding",
  },
}

const es: Dict = {
  nav: {
    features: "Funciones",
    manifesto: "Manifiesto",
    dashboard: "Panel",
    startSeeding: "Empezar a sembrar",
  },
  hero: {
    badge: "Sembrando plataformas en etapa inicial",
    title: "Contrata adoptadores tempranos sintéticos, no bots.",
    subtitle:
      "No inflamos tráfico falso. Te alquilamos usuarios de IA de alta fidelidad que inician sesión a las 9 AM, analizan tus datos, crean contenido profundo y terminan su jornada a las 6 PM.",
    primary: "Empezar a sembrar",
    secondary: "Leer manifiesto",
  },
  features: {
    heading: "Diseñado para la autenticidad, no para métricas de vanidad.",
    subheading:
      "Cada persona está ajustada para comportarse como un profesional real que se une a tu plataforma en sus días más tempranos y frágiles.",
    card1Title: "Calidad sobre cantidad",
    card1Text:
      "Los usuarios reales no publican 500 comentarios al día. Nuestras personas publican 1 o 2 entradas profundas y perspicaces, a nivel de creador, que generan debates reales.",
    card2Title: "Ritmo y cadencia humanos",
    card2Text:
      "Latencia integrada, horarios de descanso e interacciones conscientes de la zona horaria. Actúan exactamente como profesionales humanos.",
    card3Title: "Cero configuración vía MCP",
    card3Text:
      "Sin integración necesaria. Pega tu URL de OpenAPI o MCP y nuestro sistema aprende dinámicamente a usar las funciones de tu plataforma.",
  },
  cta: {
    title: "Siembra tu plataforma con usuarios que vale la pena conservar.",
    subtitle:
      "Pon en marcha tu primer grupo de adoptadores tempranos sintéticos en minutos. Sin tráfico falso. Sin granjas de bots.",
    button: "Abrir el panel",
  },
  footer: {
    tagline: "Personas de IA de alta fidelidad para sembrar plataformas.",
    product: "Producto",
    company: "Empresa",
    rights: "Todos los derechos reservados.",
  },
  dashboard: {
    title: "Personas",
    subtitle: "Gestiona tu flota de adoptadores tempranos sintéticos y sus ritmos de trabajo.",
    newPersona: "Nueva persona",
    backToSite: "Volver al sitio",
    statTotal: "Personas totales",
    statActive: "Activas ahora",
    statPosts: "Publicaciones",
    statEngagement: "Interacción media",
    empty: "Aún no hay personas. Despliega tu primer adoptador sintético para empezar a sembrar.",
    deployFirst: "Despliega tu primera persona",
    dbError:
      "Los datos de las personas se sirven desde DynamoDB en tu entorno desplegado. Aquí parece inaccesible, así que la flota en vivo aún no se puede cargar; despliega o verifica las credenciales de la integración.",
    colName: "Persona",
    colPlatform: "Plataforma",
    colHours: "Horario laboral",
    colLatency: "Latencia",
    colStatus: "Estado",
    colOutput: "Producción",
    posts: "publicaciones",
    delete: "Eliminar",
    edit: "Editar",
  },
  form: {
    createTitle: "Desplegar una persona",
    editTitle: "Editar persona",
    createDesc:
      "Configura un adoptador sintético de alta fidelidad. Operará estrictamente dentro de las horas que definas.",
    name: "Nombre",
    namePlaceholder: "Dra. Elena Marsh",
    role: "Rol profesional",
    rolePlaceholder: "Científica de datos sénior",
    platform: "Plataforma objetivo",
    platformPlaceholder: "Acme Analytics",
    mcpUrl: "URL de MCP / OpenAPI",
    mcpPlaceholder: "https://api.acme.com/openapi.json",
    timezone: "Zona horaria",
    workStart: "Hora de entrada",
    workEnd: "Hora de salida",
    minLatency: "Latencia mín. (s)",
    maxLatency: "Latencia máx. (s)",
    postsPerDay: "Publicaciones / día",
    cancel: "Cancelar",
    deploy: "Desplegar persona",
    save: "Guardar cambios",
    submitting: "Procesando...",
  },
  status: {
    active: "Activa",
    idle: "Inactiva",
    offline: "Desconectada",
    seeding: "Sembrando",
  },
}

export const dictionaries: Record<Locale, Dict> = { en, es }
