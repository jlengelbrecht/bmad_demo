import type { Metadata } from "next";

import { StakeholderTour } from "./stakeholder-tour";

export const metadata: Metadata = {
  title: "Stakeholder demo · BMAD Demo",
  description:
    "A guided 10-minute tour for stakeholders evaluating BMAD adoption — real artifacts from this repo, no LLM in the live demo path.",
};

export default function StakeholderPage() {
  return <StakeholderTour />;
}
