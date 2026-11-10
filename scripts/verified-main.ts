import { execFileSync } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { z } from "zod";

export const REPOSITORY = "VdustR/game-data-patch-android-warhammer-survivors";
const shaSchema = z.string().regex(/^[a-f0-9]{40}$/);

export function githubJson(endpoint: string): unknown {
  return JSON.parse(execFileSync("gh", ["api", endpoint], { encoding: "utf8" }));
}

export function localRevision() {
  return shaSchema.parse(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim());
}

export function verifyCurrentMain() {
  const candidate = localRevision();
  const main = z
    .object({ commit: z.object({ sha: shaSchema }) })
    .parse(githubJson(`repos/${REPOSITORY}/branches/main`));
  if (candidate !== main.commit.sha)
    return {
      verified: false,
      candidate,
      reason: "This revision is no longer the current main.",
    } as const;
  const runs = z
    .object({
      workflow_runs: z.array(
        z.object({
          head_sha: shaSchema,
          head_branch: z.string(),
          event: z.string(),
          status: z.string(),
          conclusion: z.string().nullable(),
          path: z.string(),
        }),
      ),
    })
    .parse(
      githubJson(
        `repos/${REPOSITORY}/actions/workflows/ci.yml/runs?branch=main&event=push&head_sha=${candidate}&per_page=1`,
      ),
    );
  const run = runs.workflow_runs[0];
  if (
    !run ||
    run.head_sha !== candidate ||
    run.head_branch !== "main" ||
    run.event !== "push" ||
    run.path !== ".github/workflows/ci.yml" ||
    run.status !== "completed" ||
    run.conclusion !== "success"
  ) {
    throw new Error(
      "Current main has no successful completed push CI run; publication is blocked.",
    );
  }
  return { verified: true, candidate } as const;
}

if (import.meta.main) {
  const result = verifyCurrentMain();
  if (!result.verified && process.env["GITHUB_EVENT_NAME"] !== "workflow_run")
    throw new Error(result.reason);
  console.log(result.verified ? `Verified current main ${result.candidate}` : result.reason);
  if (process.env["GITHUB_OUTPUT"])
    await appendFile(process.env["GITHUB_OUTPUT"], `verified=${result.verified}\n`);
}
