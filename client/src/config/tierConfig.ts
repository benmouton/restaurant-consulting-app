export type TierRequirement = "free" | "basic" | "pro";

export interface DomainTierInfo {
  slug: string;
  requiredTier: TierRequirement;
  name: string;
  description: string;
}

export const DOMAIN_TIER_MAP: Record<string, DomainTierInfo> = {
  leadership: {
    slug: "leadership",
    requiredTier: "free",
    name: "Ownership & Leadership",
    description: "Transition from operator-fixer to architect-leader.",
  },
  kitchen: {
    slug: "kitchen",
    requiredTier: "free",
    name: "Kitchen Operations",
    description: "Prep discipline, ticket flow, and BOH accountability.",
  },
  crisis: {
    slug: "crisis",
    requiredTier: "free",
    name: "Crisis Management",
    description: "Playbooks for meltdowns, walkouts, and burnout.",
  },
  hr: {
    slug: "hr",
    requiredTier: "basic",
    name: "HR & Documentation",
    description: "Progressive discipline, legal protection, and termination protocols.",
  },
  staffing: {
    slug: "staffing",
    requiredTier: "basic",
    name: "Staffing & Labor",
    description: "Labor models, scheduling, and accountability frameworks.",
  },
  costs: {
    slug: "costs",
    requiredTier: "basic",
    name: "Cost & Margin Control",
    description: "Portion control, waste management, and margin protection.",
  },
  training: {
    slug: "training",
    requiredTier: "basic",
    name: "Training Systems",
    description: "Role-based paths, certification, and retraining protocols.",
  },
  "training-log": {
    slug: "training-log",
    requiredTier: "basic",
    name: "Training Log & Certifications",
    description: "Track staff certifications, assessment scores, and training history.",
  },
  service: {
    slug: "service",
    requiredTier: "basic",
    name: "Service Standards",
    description: "Clear, enforceable service standards and guest experience.",
  },
  sops: {
    slug: "sops",
    requiredTier: "basic",
    name: "SOPs & Scalability",
    description: "Make performance transferable, repeatable, and scalable.",
  },
  reviews: {
    slug: "reviews",
    requiredTier: "basic",
    name: "Reviews & Reputation",
    description: "Online reputation management, prevention, and brand protection.",
  },
  "social-media": {
    slug: "social-media",
    requiredTier: "basic",
    name: "Social Media Tools",
    description: "Platform strategy, content planning, and engagement rules.",
  },
  facilities: {
    slug: "facilities",
    requiredTier: "basic",
    name: "Facilities & Asset Protection",
    description: "Preventative maintenance and equipment classification.",
  },
  consultant: {
    slug: "consultant",
    requiredTier: "basic",
    name: "Operations Consultant",
    description: "Expert guidance on any restaurant operations challenge.",
  },
};

export const FREE_DOMAINS = Object.values(DOMAIN_TIER_MAP).filter(
  (d) => d.requiredTier === "free"
);

export const GATED_DOMAINS = Object.values(DOMAIN_TIER_MAP).filter(
  (d) => d.requiredTier !== "free"
);

export const FREE_DOMAIN_COUNT = FREE_DOMAINS.length;
export const TOTAL_DOMAIN_COUNT = Object.keys(DOMAIN_TIER_MAP).filter(k => k !== "consultant" && k !== "training-log").length;

export function isDomainFree(slug: string): boolean {
  return DOMAIN_TIER_MAP[slug]?.requiredTier === "free";
}

export function getRequiredTier(slug: string): TierRequirement {
  return DOMAIN_TIER_MAP[slug]?.requiredTier ?? "basic";
}
