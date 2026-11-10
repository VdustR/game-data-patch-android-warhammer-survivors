import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vite-plus/test";
import { CHECKSUM_FILE, inspectArtifacts, PAYLOAD_FILES } from "../scripts/artifacts.ts";
import { hostStateSchema, type HostState } from "./host-fixture.ts";

const head = "a".repeat(40);
const shellQuote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
async function fixture(
  run: (context: {
    directory: string;
    state: HostState;
    save: () => Promise<void>;
    read: () => Promise<HostState>;
    invoke: (script?: string, event?: string) => ReturnType<typeof spawnSync>;
  }) => Promise<void>,
) {
  const directory = await mkdtemp(join(tmpdir(), "warhammer release "));
  const state: HostState = {
    head,
    main: head,
    tag: null,
    dirty: false,
    apiError: false,
    failUpload: false,
    corruptDownload: false,
    lagDraftListing: false,
    release: null,
    run: {
      head_sha: head,
      head_branch: "main",
      event: "push",
      status: "completed",
      conclusion: "success",
      path: ".github/workflows/ci.yml",
    },
  };
  const statePath = join(directory, "state.json");
  const save = () => writeFile(statePath, JSON.stringify(state));
  try {
    await mkdir(join(directory, "release"));
    await mkdir(join(directory, "bin"));
    await writeFile(join(directory, "package.json"), JSON.stringify({ version: "0.1.1" }));
    for (const name of PAYLOAD_FILES)
      await writeFile(join(directory, "release", name), "synthetic " + name + "\n");
    const host = fileURLToPath(new URL("./host-fixture.ts", import.meta.url));
    for (const command of ["git", "gh"])
      await writeFile(
        join(directory, "bin", command),
        "#!/bin/sh\nexec " +
          shellQuote(process.execPath) +
          " " +
          shellQuote(host) +
          " " +
          command +
          ' "$@"\n',
        { mode: 0o700 },
      );
    await save();
    await run({
      directory,
      state,
      save,
      read: async () => hostStateSchema.parse(JSON.parse(await readFile(statePath, "utf8"))),
      invoke: (script = "release", event = "workflow_dispatch") =>
        spawnSync(
          process.execPath,
          [fileURLToPath(new URL("../scripts/" + script + ".ts", import.meta.url))],
          {
            cwd: directory,
            env: {
              ...process.env,
              PATH: join(directory, "bin") + ":" + process.env["PATH"],
              TEST_HOST_STATE: statePath,
              GITHUB_EVENT_NAME: event,
              GITHUB_OUTPUT: join(directory, "output.txt"),
            },
            encoding: "utf8",
            timeout: 15_000,
          },
        ),
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
const options = { skip: process.platform === "win32", timeout: 20_000 };

test(
  "artifact boundary refuses extras, links, missing and empty payloads without deleting them",
  options,
  async () => {
    await fixture(async ({ directory }) => {
      const root = join(directory, "release");
      await writeFile(join(root, "unexpected.sav"), "private sentinel");
      await assert.rejects(inspectArtifacts(root), /Unexpected/);
      assert.equal(await readFile(join(root, "unexpected.sav"), "utf8"), "private sentinel");
      await rm(join(root, "unexpected.sav"));
      await symlink(join(root, "LICENSE"), join(root, CHECKSUM_FILE));
      await assert.rejects(inspectArtifacts(root), /links/);
      await rm(join(root, CHECKSUM_FILE));
      await writeFile(join(root, "LICENSE"), "");
      await assert.rejects(inspectArtifacts(root), /Empty/);
      await rm(join(root, "LICENSE"));
      await assert.rejects(inspectArtifacts(root), /ENOENT/);
    });
  },
);

test(
  "release resumes a partial matching draft, verifies downloads, and leaves published assets unchanged",
  options,
  async () => {
    await fixture(async ({ state, save, read, invoke, directory }) => {
      state.failUpload = true;
      await save();
      assert.equal(invoke().status, 1);
      assert.equal((await read()).release?.draft, true);
      const resumed = invoke();
      assert.equal(resumed.status, 0, String(resumed.stderr));
      assert.equal((await read()).release?.draft, false);
      const before = await readFile(join(directory, "calls.jsonl"), "utf8");
      const again = invoke();
      assert.equal(again.status, 0, String(again.stderr));
      const after = (await readFile(join(directory, "calls.jsonl"), "utf8")).slice(before.length);
      assert.doesNotMatch(after, /"create"|"upload"|"edit"/);
    });
  },
);

test("release blocks unexpected files before upload", options, async () => {
  await fixture(async ({ directory, invoke, read }) => {
    await writeFile(join(directory, "release", "unexpected.sav"), "sentinel");
    assert.equal(invoke().status, 1);
    assert.equal((await read()).release, null);
    assert.doesNotMatch(
      await readFile(join(directory, "calls.jsonl"), "utf8"),
      /"create"|"upload"/,
    );
  });
});

test("incomplete published release and foreign draft fail without mutation", options, async () => {
  for (const draft of [false, true])
    await fixture(async ({ state, save, invoke, directory }) => {
      state.release = {
        tag_name: "v0.1.1",
        target_commitish: "b".repeat(40),
        draft,
        prerelease: false,
        assets: [],
      };
      await save();
      assert.equal(invoke().status, 1);
      assert.doesNotMatch(
        await readFile(join(directory, "calls.jsonl"), "utf8"),
        /"create"|"upload"|"edit"/,
      );
    });
});

test("download corruption keeps the release draft", options, async () => {
  await fixture(async ({ state, save, invoke, read }) => {
    state.corruptDownload = true;
    await save();
    assert.equal(invoke().status, 1);
    assert.equal((await read()).release?.draft, true);
  });
});

test("dirty source, conflicting tag, and API errors cannot publish", options, async () => {
  for (const fault of ["dirty", "tag", "apiError"] as const)
    await fixture(async ({ state, save, invoke, read }) => {
      if (fault === "tag") state.tag = "b".repeat(40);
      else state[fault] = true;
      await save();
      assert.equal(invoke().status, 1);
      assert.equal((await read()).release, null);
    });
});

test("source gate accepts only successful push CI for the current main", options, async () => {
  await fixture(async ({ state, save, invoke }) => {
    assert.equal(invoke("verified-main").status, 0);
    for (const patch of [
      { status: "in_progress" },
      { conclusion: "failure" },
      { head_sha: "b".repeat(40) },
      { event: "pull_request" },
      { head_branch: "other" },
      { path: ".github/workflows/other.yml" },
    ]) {
      const run = state.run;
      assert.ok(run);
      state.run = { ...run, ...patch };
      await save();
      assert.equal(invoke("verified-main").status, 1);
      assert.equal(invoke().status, 1);
      state.run = run;
    }
    state.run = null;
    await save();
    assert.equal(invoke("verified-main").status, 1);
  });
});

test("stale automatic source skips, while a manual stale run fails", options, async () => {
  await fixture(async ({ state, save, invoke, directory }) => {
    state.main = "b".repeat(40);
    await save();
    assert.equal(invoke("verified-main", "workflow_run").status, 0);
    assert.match(await readFile(join(directory, "output.txt"), "utf8"), /verified=false/);
    assert.equal(invoke("verified-main").status, 1);
  });
});

test("release resolves a new draft even when the collection listing lags", options, async () => {
  await fixture(async ({ state, save, invoke, read, directory }) => {
    state.lagDraftListing = true;
    await save();
    const published = invoke();
    assert.equal(published.status, 0, String(published.stderr));
    assert.equal((await read()).release?.draft, false);
    const calls = await readFile(join(directory, "calls.jsonl"), "utf8");
    assert.match(calls, /"graphql"/);
    assert.match(calls, /\/releases\/1"/);
    assert.doesNotMatch(calls, /"--slurp"/);
  });
});
