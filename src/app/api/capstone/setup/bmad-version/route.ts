import { getPinnedBmadVersion } from "@/lib/capstone/bootstrap/bmad-version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Trainee-facing read of the pinned BMAD version. Used by the
 * bootstrap page's command-preview block so the trainee sees the
 * exact `npx bmad-method@<version>` invocation before clicking
 * "Open terminal".
 */
export async function GET(): Promise<Response> {
  try {
    return Response.json({ ok: true, version: getPinnedBmadVersion() });
  } catch (err) {
    console.error("bmad-version pin unreadable", err);
    return Response.json(
      { ok: false, error: "BMAD version pin unreadable" },
      { status: 500 },
    );
  }
}
