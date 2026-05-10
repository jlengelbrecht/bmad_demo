import { INSTALL_TAG } from "@/lib/capstone/bootstrap/bmad-version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Trainee-facing read of the BMAD install tag. Used by the
 * bootstrap page's command-preview block so the trainee sees the
 * exact `npx bmad-method@<tag>` invocation before clicking
 * "Open terminal". Default tag is "latest" (the portal stays evergreen
 * against BMAD); override via BMAD_INSTALL_TAG env var if needed.
 */
export async function GET(): Promise<Response> {
  return Response.json({ ok: true, version: INSTALL_TAG });
}
