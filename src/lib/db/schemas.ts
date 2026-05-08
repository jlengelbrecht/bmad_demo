import { z } from "zod";

/**
 * Request shape for `POST /api/progress` (Story 3.2).
 *
 * `kind` is gated to `lesson` and `lab` at the API boundary. Capstone
 * kinds (`capstone-session`, `capstone-step`) are written by the capstone
 * harness through a different code path (Epic 4), not by the public
 * progress endpoint, so they are intentionally rejected here.
 */
export const ProgressUpsertRequest = z.object({
  kind: z.enum(["lesson", "lab"]),
  id: z.string().min(1),
  completed: z.boolean(),
});

export type ProgressUpsertRequest = z.infer<typeof ProgressUpsertRequest>;
