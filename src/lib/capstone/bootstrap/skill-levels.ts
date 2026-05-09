export const SKILL_LEVELS = [
  {
    value: "beginner",
    label: "Beginner",
    description: "BMAD primers explain context as you go; verbose Socratic prompts.",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Default. Primers assume basic familiarity with the artifact chain.",
  },
  {
    value: "expert",
    label: "Expert",
    description: "Primers stay terse; assumes confidence with brief/PRD/architecture/epics/ADR vocabulary.",
  },
] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number]["value"];
