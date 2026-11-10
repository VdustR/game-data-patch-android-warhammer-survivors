<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import {
    decodeSave,
    inspectSave,
    MAX_FILE_BYTES,
    outputName,
    parseAmount,
    patchSave,
    VERIFIED,
    type SaveInfo,
    type Targets,
  } from "./core.ts";

  const repo =
    "https://github.com/VdustR/game-data-patch-android-warhammer-survivors";
  const worlds = [
    {
      key: "WH_40K",
      name: "WARHAMMER 40,000",
      short: "40K",
      hint: "Reserves for the far future",
      label: "40K coins",
      theme: "future",
    },
    {
      key: "WH_AOS",
      name: "AGE OF SIGMAR",
      short: "AoS",
      hint: "Reserves for the Mortal Realms",
      label: "AoS coins",
      theme: "realms",
    },
  ] as const;
  let source = $state("");
  let filename = $state("");
  let info = $state<SaveInfo | null>(null);
  let amounts = $state({ WH_40K: "", WH_AOS: "" });
  let errors = $state({ WH_40K: "", WH_AOS: "" });
  let accepted = $state(false);
  let busy = $state(false);
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });
  let status = $state("");
  let failure = $state(false);
  let fileStatus = $state("");
  let fileFailure = $state(false);
  let download = $state("");
  let revision = 0;
  let downloadLink = $state<HTMLAnchorElement>();
  const number = new Intl.NumberFormat("en-US");

  function discardDownload() {
    if (download) URL.revokeObjectURL(download);
    download = "";
  }
  function invalidate() {
    revision += 1;
    discardDownload();
    status = "";
    failure = false;
    errors = { WH_40K: "", WH_AOS: "" };
  }
  onDestroy(discardDownload);

  async function selectFile(event: Event) {
    if (!(event.currentTarget instanceof HTMLInputElement)) return;
    const file = event.currentTarget.files?.[0];
    invalidate();
    const request = revision;
    source = "";
    info = null;
    accepted = false;
    amounts = { WH_40K: "", WH_AOS: "" };
    filename = file?.name ?? "";
    fileStatus = "";
    fileFailure = false;
    if (!file) return;
    busy = true;
    fileStatus = "Checking save format and checksum…";
    try {
      if (file.size > MAX_FILE_BYTES)
        throw new Error("This file exceeds 5 MiB. Choose SaveDataUnity.sav.");
      const text = decodeSave(new Uint8Array(await file.arrayBuffer()));
      const result = await inspectSave(text);
      if (request !== revision) return;
      source = text;
      info = result;
      fileStatus = "";
    } catch (error) {
      if (request !== revision) return;
      fileFailure = true;
      fileStatus =
        error instanceof Error
          ? error.message
          : "Could not read the file. Choose it again.";
    } finally {
      if (request === revision) busy = false;
    }
  }

  function preset(value: string) {
    invalidate();
    amounts = { WH_40K: value, WH_AOS: value };
  }

  async function generate(event: SubmitEvent) {
    event.preventDefault();
    invalidate();
    if (!info || !source) return;
    const targets: Targets = {};
    for (const world of worlds) {
      const value = amounts[world.key];
      if (!value) continue;
      try {
        targets[world.key] = parseAmount(value);
      } catch (error) {
        errors[world.key] =
          error instanceof Error ? error.message : "Check the coin amount.";
      }
    }
    if (errors.WH_40K || errors.WH_AOS) {
      failure = true;
      status = "Invalid amount. Correct the highlighted field.";
      return;
    }
    if (Object.keys(targets).length === 0) {
      failure = true;
      status = "Enter at least one amount or choose a preset.";
      return;
    }
    const request = revision;
    busy = true;
    try {
      const patched = await patchSave(source, targets, {
        allowUnverifiedVersion: accepted,
      });
      if (request !== revision) return;
      download = URL.createObjectURL(
        new Blob([patched], { type: "application/octet-stream" }),
      );
      status = "Your patched copy is ready. Its checksum has been verified.";
      await tick();
      downloadLink?.focus();
    } catch (error) {
      if (request !== revision) return;
      failure = true;
      status =
        error instanceof Error
          ? error.message
          : "Could not create a copy. Select the original save again.";
    } finally {
      if (request === revision) busy = false;
    }
  }
</script>

<svelte:head><meta name="color-scheme" content="dark" /></svelte:head>

<div class="app-shell">
  <header class="masthead">
    <a
      class="brand"
      href="#title"
      aria-label="Warhammer Survivors save editor home"
    >
      <img src="./app-icon.png" alt="" width="56" height="56" />
      <span>WARHAMMER<br /><strong>SURVIVORS</strong></span>
    </a>
    <a class="source-link" href={repo} target="_blank" rel="noreferrer"
      >Source code <span aria-hidden="true">↗</span></a
    >
  </header>

  <main>
    <section class="intro" aria-labelledby="title">
      <div class="intro-copy">
        <h1 id="title">Warhammer Survivors <br /><span>save editor.</span></h1>
        <p>
          Edit 40K and Age of Sigmar coins in your Android save. Download a
          patched copy and keep your original.
        </p>
        <div class="trust-line">
          <span class="status-light" aria-hidden="true"></span>Free · Runs
          locally · No save uploads
        </div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <img src="./app-icon.png" alt="" width="240" height="240" />
        <span class="art-caption">TWO WORLDS. ONE SAVE.</span>
      </div>
    </section>

    <noscript
      ><p class="no-script">
        Enable JavaScript to check and patch saves locally. You can also <a
          href={`${repo}/releases/latest`}>download the Node script</a
        >. The guide below remains available.
      </p></noscript
    >
    <div class="workbench">
      <section class="file-section" aria-labelledby="file-heading">
        <div class="section-heading">
          <span class="step" aria-hidden="true">1</span>
          <h2 id="file-heading">Choose save</h2>
          <span class="small-label">ANDROID / .SAV</span>
        </div>
        <div class="file-row">
          <div class="file-copy">
            <p class="file-name">{filename || "SaveDataUnity.sav"}</p>
            <p class="muted">
              {info
                ? `Android · Game ${info.version} · ${info.selectedUniverse === "WH_40K" ? "40K" : "AoS"} selected`
                : "Choose an original save or backup copied from the game. Up to 5 MiB."}
            </p>
          </div>
          <label class="file-button"
            >{filename ? "Choose another" : "Choose .sav file"}<input
              aria-label="Choose save"
              type="file"
              accept=".sav,application/json"
              onchange={selectFile}
              disabled={!ready || busy}
            /></label
          >
        </div>
        <div
          class="file-feedback"
          class:error={fileFailure}
          role="status"
          aria-label="Save check result"
          aria-live="polite"
          aria-atomic="true"
        >
          {fileStatus}
        </div>
        {#if info}<p class="file-result">
            <span class="status-light" aria-hidden="true"></span>Format and
            checksum passed{info.verifiedVersion
              ? " · Matches the device-tested game version"
              : " · Version not device-tested"}
          </p>{/if}
      </section>

      <form onsubmit={generate} novalidate>
        <section class="amount-section" aria-labelledby="amount-heading">
          <div class="section-heading">
            <span class="step" aria-hidden="true">2</span>
            <h2 id="amount-heading">Set coin balances</h2>
            <span class="small-label">COIN RESERVES</span>
          </div>
          <fieldset disabled={!info || busy} class="amount-fields">
            <legend class="sr-only">Target coin balances for both worlds</legend
            >
            <div class="worlds">
              {#each worlds as world}
                <div class="world {world.theme}">
                  <div class="world-heading">
                    <span class="coin" aria-hidden="true"></span><span
                      class="pixel world-title">{world.name}</span
                    >
                  </div>
                  <p class="world-hint">{world.hint}</p>
                  <div class="balance">
                    <span>Current balance</span><strong
                      >{info
                        ? number.format(info.balances[world.key])
                        : "—"}</strong
                    >
                  </div>
                  <label for={world.key}
                    >{world.label}<span>Blank keeps current</span></label
                  >
                  <input
                    id={world.key}
                    name={world.key}
                    inputmode="numeric"
                    autocomplete="off"
                    placeholder="Enter new amount"
                    bind:value={amounts[world.key]}
                    oninput={invalidate}
                    aria-invalid={errors[world.key] ? "true" : undefined}
                    aria-describedby={errors[world.key]
                      ? `${world.key}-error`
                      : "amount-help"}
                  />
                  {#if errors[world.key]}<p
                      class="field-error"
                      id={`${world.key}-error`}
                    >
                      {errors[world.key]}
                    </p>{/if}
                </div>
              {/each}
            </div>
            <div class="presets">
              <span>Set both worlds</span><button
                type="button"
                onclick={() => preset("1000000")}>1 million</button
              ><button type="button" onclick={() => preset("1000000000")}
                >1 billion</button
              ><button
                class="subtle-button"
                type="button"
                onclick={() => preset("")}>Clear</button
              >
            </div>
          </fieldset>
          <p id="amount-help" class="amount-help">
            Set 0–1,000,000,000 coins. Large amounts must be stored exactly. One
            billion was device-tested; the main menu displays 9,999,999.
          </p>
          {#if info && !info.verifiedVersion}
            <div class="version-warning">
              <p>{info.warnings[0]}</p>
              <label
                ><input
                  type="checkbox"
                  disabled={busy}
                  bind:checked={accepted}
                  onchange={invalidate}
                />I understand this version has not been device-tested and want
                to create a copy.</label
              >
            </div>
          {/if}
        </section>

        <section class="export-section" aria-labelledby="export-heading">
          <div class="section-heading">
            <span class="step" aria-hidden="true">3</span>
            <h2 id="export-heading">Get your patched copy</h2>
          </div>
          <div class="export-row">
            <p>
              Changes only the chosen balances and recalculates the checksum.<br
              /><span class="muted"
                >Keep your original backup before replacing the main save on
                your phone.</span
              >
            </p>
            <button
              type="submit"
              class="primary"
              disabled={!info || busy || (!info.verifiedVersion && !accepted)}
              >{busy ? "Processing…" : "Create patched copy"}<span
                aria-hidden="true"
              >
                →</span
              ></button
            >
          </div>
          <div
            class:error={failure}
            class:success={!!download}
            class="feedback"
            role="status"
            aria-label="Patch result"
            aria-live="polite"
            aria-atomic="true"
          >
            {status}
          </div>
          {#if download}<a
              class="download"
              href={download}
              download={outputName(filename)}
              bind:this={downloadLink}
              >Download {outputName(filename)}
              <span aria-hidden="true">↓</span></a
            >{/if}
        </section>
      </form>
    </div>

    <aside class="field-notes" aria-label="Before you install">
      <div id="compatibility">
        <h2>Device-tested build</h2>
        <p>
          Game <strong>{VERIFIED.gameVersion}</strong> · build {VERIFIED.versionCode}<br
          />Android {VERIFIED.androidVersion} · {VERIFIED.date}
        </p>
        <p class="muted">
          This is a test record. A save cannot identify its APK build.
        </p>
      </div>
      <div>
        <h2>Keep a way back</h2>
        <p>
          Close the game completely. Back up the current main save and backup
          save. Rename the patched copy to <code>SaveDataUnity.sav</code> before replacing
          the main save.
        </p>
        <a
          href={`${repo}/blob/main/README.md#applying-a-copy-to-android`}
          target="_blank"
          rel="noreferrer"
          >Read the installation, cloud conflict, and restore guide ↗</a
        >
      </div>
    </aside>
    <section class="guide" aria-labelledby="guide-heading">
      <h2 id="guide-heading">Save editor field guide</h2>
      <dl>
        <div id="supported-saves">
          <dt>Which saves can I edit?</dt>
          <dd>
            Use <code>SaveDataUnity.sav</code> or a backup from Warhammer Survivors
            on Android. The editor checks the Android marker, both world balances,
            the selected world, and the checksum. Other game versions require your
            acknowledgment; passing these checks does not prove compatibility.
          </dd>
        </div>
        <div id="patched-fields">
          <dt>What does the patch change?</dt>
          <dd>
            It sets the coin balance for Warhammer 40,000, Age of Sigmar, or
            both. It also updates the selected world's mirrored balance and the
            root checksum. All other save bytes stay unchanged. A blank amount
            keeps that world's current balance.
          </dd>
        </div>
        <div id="save-privacy">
          <dt>Are my saves uploaded?</dt>
          <dd>
            No. Your save is processed on your device and never uploaded. There
            are no accounts or analytics. For use without a connection, <a
              href={`${repo}/releases/latest/download/warhammer-save-patcher.html`}
              >download the standalone HTML</a
            >
            or use the
            <a href={`${repo}/releases/latest/download/patch-save.mjs`}
              >Node script</a
            >.
          </dd>
        </div>
        <div id="cloud-saves">
          <dt>Will the change survive a cloud sync?</dt>
          <dd>
            Restart and cloud persistence remain unverified. A cloud-conflict
            choice can restore older progress and balances. Always patch your
            current save, keep the original main and backup saves, and restore
            them with the game closed if the copy fails. <a
              href={`${repo}/blob/main/VERIFICATION.md`}
              >Read the device test evidence and limits</a
            >.
          </dd>
        </div>
      </dl>
    </section>
  </main>
  <footer>
    <p>
      UNOFFICIAL FAN TOOL <span>·</span> Not affiliated with the game creators
    </p>
    <p>
      Code <a href={`${repo}/blob/main/LICENSE`}>MIT © 2026 VdustR</a>
      <span>·</span>
      <a href={`${repo}/blob/main/docs/assets.md`}>Artwork credits</a>
    </p>
  </footer>
</div>
