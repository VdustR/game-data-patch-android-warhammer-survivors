<script lang="ts">
  import { onDestroy, tick } from "svelte";
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
      hint: "遙遠未來的戰備金庫",
      label: "40K 金額",
      theme: "future",
    },
    {
      key: "WH_AOS",
      name: "AGE OF SIGMAR",
      short: "AoS",
      hint: "凡界諸域的遠征金庫",
      label: "AoS 金額",
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
    fileStatus = "正在檢查存檔格式與校驗碼…";
    try {
      if (file.size > MAX_FILE_BYTES)
        throw new Error("檔案超過 5 MiB，請選擇 SaveDataUnity.sav。");
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
        error instanceof Error ? error.message : "無法讀取檔案，請重新選擇。";
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
          error instanceof Error ? error.message : "請檢查金額。";
      }
    }
    if (errors.WH_40K || errors.WH_AOS) {
      failure = true;
      status = "金額格式有誤，請修正標示的欄位。";
      return;
    }
    if (Object.keys(targets).length === 0) {
      failure = true;
      status = "請填入至少一個金額，或選擇快速設定。";
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
      status = "修改副本已準備好，輸出校驗碼檢查通過。";
      await tick();
      downloadLink?.focus();
    } catch (error) {
      if (request !== revision) return;
      failure = true;
      status =
        error instanceof Error
          ? error.message
          : "產生失敗，請重新選擇原始存檔。";
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
      aria-label="Warhammer Survivors 存檔修改器首頁"
    >
      <img src="./app-icon.png" alt="" width="56" height="56" />
      <span>WARHAMMER<br /><strong>SURVIVORS</strong></span>
    </a>
    <a class="source-link" href={repo} target="_blank" rel="noreferrer"
      >原始碼 <span aria-hidden="true">↗</span></a
    >
  </header>

  <main>
    <section class="intro" aria-labelledby="title">
      <div class="intro-copy">
        <h1 id="title">為下一場戰役<br /><span>補足金庫。</span></h1>
        <p>
          Android 存檔金額修改器。調整 40K 與 AoS 金額，<br
            class="desktop-break"
          />下載新的存檔副本，繼續你的遠征。
        </p>
        <div class="trust-line">
          <span class="status-light" aria-hidden="true"
          ></span>本機處理・存檔不會上傳・原檔保留
        </div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <img src="./app-icon.png" alt="" width="240" height="240" />
        <span class="art-caption">TWO WORLDS. ONE SAVE.</span>
      </div>
    </section>

    <div class="workbench">
      <section class="file-section" aria-labelledby="file-heading">
        <div class="section-heading">
          <span class="step" aria-hidden="true">1</span>
          <h2 id="file-heading">選擇存檔</h2>
          <span class="small-label">ANDROID / .SAV</span>
        </div>
        <div class="file-row">
          <div class="file-copy">
            <p class="file-name">{filename || "SaveDataUnity.sav"}</p>
            <p class="muted">
              {info
                ? `Android · 遊戲版本 ${info.version} · ${info.selectedUniverse === "WH_40K" ? "40K" : "AoS"} 世界`
                : "選擇遊戲匯出的原始存檔或備份，最大 5 MiB。"}
            </p>
          </div>
          <label class="file-button"
            >{filename ? "重新選擇" : "選擇 .sav 檔案"}<input
              aria-label="選擇存檔"
              type="file"
              accept=".sav,application/json"
              onchange={selectFile}
              disabled={busy}
            /></label
          >
        </div>
        <div
          class="file-feedback"
          class:error={fileFailure}
          role="status"
          aria-label="存檔檢查結果"
          aria-live="polite"
          aria-atomic="true"
        >
          {fileStatus}
        </div>
        {#if info}<p class="file-result">
            <span class="status-light" aria-hidden="true"
            ></span>基本格式與校驗碼通過{info.verifiedVersion
              ? " · 版本符合實機驗證紀錄"
              : " · 版本尚未實機驗證"}
          </p>{/if}
      </section>

      <form onsubmit={generate} novalidate>
        <section class="amount-section" aria-labelledby="amount-heading">
          <div class="section-heading">
            <span class="step" aria-hidden="true">2</span>
            <h2 id="amount-heading">設定金額</h2>
            <span class="small-label">COIN RESERVES</span>
          </div>
          <fieldset disabled={!info || busy} class="amount-fields">
            <legend class="sr-only">兩個世界的目標金額</legend>
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
                    <span>目前金額</span><strong
                      >{info
                        ? number.format(info.balances[world.key])
                        : "—"}</strong
                    >
                  </div>
                  <label for={world.key}
                    >{world.label}<span>留空即保留</span></label
                  >
                  <input
                    id={world.key}
                    name={world.key}
                    inputmode="numeric"
                    autocomplete="off"
                    placeholder="輸入新金額"
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
              <span>同時設定兩個世界</span><button
                type="button"
                onclick={() => preset("1000000")}>100 萬</button
              ><button type="button" onclick={() => preset("1000000000")}
                >10 億</button
              ><button
                class="subtle-button"
                type="button"
                onclick={() => preset("")}>清空</button
              >
            </div>
          </fieldset>
          <p id="amount-help" class="amount-help">
            可設 0～1,000,000,000。大額須能精確儲存；「10
            億」已通過實機讀檔測試，遊戲主畫面顯示為 9,999,999。
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
                />我了解此版本尚未實機驗證，仍要產生副本</label
              >
            </div>
          {/if}
        </section>

        <section class="export-section" aria-labelledby="export-heading">
          <div class="section-heading">
            <span class="step" aria-hidden="true">3</span>
            <h2 id="export-heading">帶上修改副本</h2>
          </div>
          <div class="export-row">
            <p>
              只修改指定金額並重算校驗碼。<br /><span class="muted"
                >下載後，先保留原始備份，再替換手機上的主存檔。</span
              >
            </p>
            <button
              type="submit"
              class="primary"
              disabled={!info || busy || (!info.verifiedVersion && !accepted)}
              >{busy ? "處理中…" : "產生修改副本"}<span aria-hidden="true">
                →</span
              ></button
            >
          </div>
          <div
            class:error={failure}
            class:success={!!download}
            class="feedback"
            role="status"
            aria-label="修改結果"
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
              >下載 {outputName(filename)} <span aria-hidden="true">↓</span></a
            >{/if}
        </section>
      </form>
    </div>

    <aside class="field-notes" aria-label="使用須知">
      <div>
        <h2>經過實機驗證</h2>
        <p>
          遊戲 <strong>{VERIFIED.gameVersion}</strong> · build {VERIFIED.versionCode}<br
          />Android {VERIFIED.androidVersion} · {VERIFIED.date}
        </p>
        <p class="muted">此為測試紀錄；存檔本身無法辨識 APK build。</p>
      </div>
      <div>
        <h2>替換前，先保留退路</h2>
        <p>
          完全關閉遊戲，備份目前的主存檔與備份檔。將修改副本命名為 <code
            >SaveDataUnity.sav</code
          > 後再替換。
        </p>
        <a
          href={`${repo}/blob/main/README.md#applying-a-copy-to-android`}
          target="_blank"
          rel="noreferrer">查看安裝、雲端衝突與還原說明 ↗</a
        >
      </div>
    </aside>
  </main>
  <footer>
    <p>UNOFFICIAL FAN TOOL <span>·</span> 與遊戲官方無關</p>
    <p>
      Code <a href={`${repo}/blob/main/LICENSE`}>MIT © 2026 VdustR</a>
      <span>·</span> <a href={`${repo}/blob/main/docs/assets.md`}>美術來源</a>
    </p>
  </footer>
</div>
