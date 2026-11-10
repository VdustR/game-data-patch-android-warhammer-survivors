import {
  appendFileSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { z } from "zod";

// The response fields mirror captured GitHub REST responses; this fake never accesses the network.
export const hostStateSchema = z.object({
  head: z.string(),
  main: z.string(),
  tag: z.string().nullable(),
  dirty: z.boolean(),
  apiError: z.boolean(),
  failUpload: z.boolean(),
  corruptDownload: z.boolean(),
  run: z
    .object({
      head_sha: z.string(),
      head_branch: z.string(),
      event: z.string(),
      status: z.string(),
      conclusion: z.string().nullable(),
      path: z.string(),
    })
    .nullable(),
  release: z
    .object({
      tag_name: z.string(),
      target_commitish: z.string(),
      draft: z.boolean(),
      prerelease: z.boolean(),
      assets: z.array(z.object({ name: z.string(), state: z.string(), size: z.number() })),
    })
    .nullable(),
});
export type HostState = z.infer<typeof hostStateSchema>;

if (import.meta.main) {
  const statePath = process.env["TEST_HOST_STATE"];
  if (!statePath) throw new Error("Missing isolated host state");
  const state = hostStateSchema.parse(JSON.parse(readFileSync(statePath, "utf8")));
  const [command, ...args] = process.argv.slice(2);
  const save = () => writeFileSync(statePath, JSON.stringify(state));
  appendFileSync(join(process.cwd(), "calls.jsonl"), JSON.stringify({ command, args }) + "\n");
  if (command === "git") {
    if (args[0] === "rev-parse") console.log(state.head);
    else if (args[0] === "status") console.log(state.dirty ? " M source.ts" : "");
    else if (args[0] === "ls-remote") console.log(state.tag ? state.tag + "\t" + args[3] : "");
    else throw new Error("Unexpected git call");
  } else if (args[0] === "api") {
    if (state.apiError) process.exit(2);
    if (args.includes("--slurp"))
      console.log(JSON.stringify([state.release ? [state.release] : []]));
    else if (args[1]?.endsWith("/branches/main"))
      console.log(JSON.stringify({ commit: { sha: state.main } }));
    else if (args[1]?.includes("/actions/workflows/ci.yml/runs?"))
      console.log(JSON.stringify({ workflow_runs: state.run ? [state.run] : [] }));
    else throw new Error("Unexpected API endpoint");
  } else if (args[0] === "release") {
    const option = (name: string) => {
      const value = args[args.indexOf(name) + 1];
      if (!value) throw new Error("Missing option " + name);
      return value;
    };
    const remote = join(process.cwd(), "remote");
    if (args[1] === "create") {
      if (!args.includes("--draft")) throw new Error("Must create as draft");
      state.release = {
        tag_name: args[2] ?? "",
        target_commitish: option("--target"),
        draft: true,
        prerelease: false,
        assets: [],
      };
    } else if (args[1] === "upload") {
      if (!state.release?.draft) throw new Error("Cannot upload to published release");
      mkdirSync(remote, { recursive: true });
      for (const path of args.filter((value) => value.startsWith("release/"))) {
        const name = basename(path);
        copyFileSync(path, join(remote, name));
        state.release.assets = state.release.assets.filter((asset) => asset.name !== name);
        state.release.assets.push({ name, state: "uploaded", size: readFileSync(path).length });
        if (state.failUpload) {
          state.failUpload = false;
          save();
          process.exit(2);
        }
      }
    } else if (args[1] === "download") {
      for (const name of readdirSync(remote))
        copyFileSync(join(remote, name), join(option("--dir"), name));
      if (state.corruptDownload) writeFileSync(join(option("--dir"), "LICENSE"), "corrupt");
    } else if (args[1] === "edit") {
      if (!state.release || !args.includes("--draft=false")) throw new Error("Unexpected edit");
      state.release.draft = false;
      state.tag = state.head;
    } else throw new Error("Unexpected release operation");
    save();
  } else throw new Error("Unexpected host command");
}
