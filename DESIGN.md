---
name: "Warhammer Survivors save editor"
description: "Dark iron, brass, and game pixels around a readable local save editor."
colors:
  gold: "#d5b36c"
  green: "#c1df91"
  action-hover: "#dbefba"
  action-ink: "#192418"
  action-border: "#e1f4bb"
  future-accent: "#a8cee2"
  future-panel: "#192c38"
  future-border: "#4b6472"
  realms-accent: "#e0c786"
  realms-panel: "#302d20"
  realms-border: "#726344"
  ink: "#f3ead7"
  muted: "#b9bdba"
  ground: "#0d1317"
  panel: "#182126"
  line: "#45504e"
  file-panel: "#20292a"
  export-panel: "#1d2725"
  frame-line: "#716247"
  page-divider: "#39423e"
  intro-ink: "#d2d5cf"
  trust-ink: "#c0d59f"
  label-ink: "#bcc3ba"
  step-ink: "#172025"
  balance-ink: "#d3d5cb"
  balance-line: "#586257"
  field-hint: "#c1c6be"
  preset-label: "#c9cdc3"
  help-ink: "#b9c1bc"
  note-heading: "#e0cc9f"
  footer-ink: "#aeb9af"
  code-ink: "#dfc68f"
  input-panel: "#0d171e"
  input-ink: "#fff1d1"
  input-border: "#6e7c7e"
  placeholder: "#aeb8bb"
  button-panel: "#263129"
  button-ink: "#eef3df"
  button-border: "#7a836e"
  button-hover: "#3b4c36"
  subtle-ink: "#d4d5ca"
  file-button-panel: "#34362c"
  file-button-ink: "#f6e2b5"
  file-button-border: "#d2b981"
  file-button-hover: "#4b4735"
  link-hover: "#fff0cb"
  focus: "#f2d68d"
  selection: "#c7a660"
  selection-ink: "#11191d"
  scrollbar: "#78694e"
  error: "#ffb7a9"
  warning-panel: "#37301f"
  warning-ink: "#f2d89d"
  warning-border: "#ab8a4d"
  feedback-ink: "#d9dfca"
  feedback-line: "#515b4b"
  success-ink: "#d6edb6"
  download-panel: "#2c402a"
  download-ink: "#e2f2cc"
  download-ready: "#52643a"
  icon-border: "#8a764e"
  art-panel: "#202b2a"
  art-border: "#a58a54"
  art-caption: "#e5c983"
  coin: "#d8ac40"
  coin-edge: "#f9d67a"
  coin-shade: "#987024"
typography:
  display:
    fontFamily: "system-ui, sans-serif"
    fontSize: "clamp(34px, 4.3vw, 52px)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  display-compact:
    fontSize: "36px"
  display-mobile:
    fontSize: "clamp(24px, 7vw, 30px)"
  headline:
    fontSize: "20px"
    letterSpacing: "0.025em"
  headline-mobile:
    fontSize: "18px"
  title:
    fontSize: "15px"
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "16px"
    lineHeight: 1.65
  body-intro:
    lineHeight: 1.9
  body-small:
    fontSize: "14px"
  label:
    fontSize: "13px"
  caption:
    fontSize: "12px"
  footer:
    fontSize: "11px"
  footer-mobile:
    fontSize: "10px"
  balance:
    fontFamily: "ui-monospace, monospace"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.4
  input:
    fontFamily: "ui-monospace, monospace"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.5
  placeholder:
    fontFamily: "system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  filename:
    fontFamily: "ui-monospace, monospace"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.6
  filename-mobile:
    fontSize: "15px"
  brand:
    fontFamily: "Press Start 2P, monospace"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.8
  brand-strong:
    fontSize: "13px"
    fontWeight: 400
  brand-mobile:
    fontSize: "7px"
  brand-strong-mobile:
    fontSize: "9px"
  world-title:
    fontFamily: "Press Start 2P, monospace"
    fontSize: "9px"
    lineHeight: 1.8
  world-title-compact:
    fontSize: "7px"
  pixel-label:
    fontFamily: "Press Start 2P, monospace"
    fontSize: "8px"
    lineHeight: 1.7
  pixel-label-compact:
    fontSize: "6px"
  art-caption:
    fontFamily: "Press Start 2P, monospace"
    fontSize: "7px"
    lineHeight: 1.6
  art-caption-compact:
    fontSize: "5px"
  step:
    fontFamily: "Press Start 2P, monospace"
    fontSize: "10px"
    lineHeight: 1
  code:
    fontSize: "0.875em"
rounded:
  square: "0"
spacing:
  gap-xs: "8px"
  gap-sm: "12px"
  gap-md: "16px"
  gap-lg: "24px"
  shell-desktop: "0 40px"
  shell-compact: "0 22px"
  shell-mobile: "0 16px"
  section-desktop: "26px 30px"
  section-compact: "24px 20px"
  section-mobile: "22px 16px"
  world-desktop: "20px"
  world-compact: "16px"
  input: "12px 14px"
  button: "9px 18px"
  button-primary: "13px 20px"
  button-file: "11px 20px"
  preset: "7px 15px"
  preset-mobile: "9px 16px"
  download: "15px 18px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.square}"
    padding: "{spacing.button-primary}"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-preset:
    backgroundColor: "{colors.button-panel}"
    textColor: "{colors.button-ink}"
    rounded: "{rounded.square}"
    padding: "{spacing.preset}"
  button-preset-hover:
    backgroundColor: "{colors.button-hover}"
  button-subtle:
    backgroundColor: "transparent"
    textColor: "{colors.subtle-ink}"
    rounded: "{rounded.square}"
    padding: "{spacing.preset}"
  button-file:
    backgroundColor: "{colors.file-button-panel}"
    textColor: "{colors.file-button-ink}"
    rounded: "{rounded.square}"
    padding: "{spacing.button-file}"
  button-file-hover:
    backgroundColor: "{colors.file-button-hover}"
  input-amount:
    backgroundColor: "{colors.input-panel}"
    textColor: "{colors.input-ink}"
    typography: "{typography.input}"
    rounded: "{rounded.square}"
    padding: "{spacing.input}"
    width: "100%"
  world-future:
    backgroundColor: "{colors.future-panel}"
    textColor: "{colors.future-accent}"
    rounded: "{rounded.square}"
    padding: "{spacing.world-desktop}"
  world-realms:
    backgroundColor: "{colors.realms-panel}"
    textColor: "{colors.realms-accent}"
    rounded: "{rounded.square}"
    padding: "{spacing.world-desktop}"
  download:
    backgroundColor: "{colors.download-panel}"
    textColor: "{colors.download-ink}"
    rounded: "{rounded.square}"
    padding: "{spacing.download}"
  version-warning:
    backgroundColor: "{colors.warning-panel}"
    textColor: "{colors.warning-ink}"
    rounded: "{rounded.square}"
    padding: "{spacing.gap-md}"
  source-link:
    textColor: "{colors.gold}"
    typography: "{typography.body-small}"
---

# Design System: Warhammer Survivors save editor

## Overview

**Creative North Star: "Dual-realm supply forge"**

Dark iron and stone surfaces, square brass edges, and crisp game pixels frame the save editor. The 40K world uses blue steel; Age of Sigmar uses ochre stone. English instructions and numeric balances stay readable inside this game identity.

The visual system is extracted from [the stylesheet](src/style.css), [the editor](src/App.svelte), and [the local font import](src/main.ts). The [product constraints](PRODUCT.md) preserve local processing and recoverable copies. The [editor surface brief](.impeccable/surfaces/editor.md) owns the page composition and acceptance criteria. Frontmatter records current implementation values; role names for inline colors describe their existing use rather than a new CSS token API.

**Key Characteristics:**

- Original app-icon pixels and short English pixel labels establish the game identity.
- Flat, square panels use tonal changes and visible borders to separate tasks.
- Warm text, tabular numbers, and native controls support careful file editing.
- Responsive stacking preserves the reading order and both worlds' identities.

## Colors

Warm brass and pale green sit against dark iron, with blue and ochre identifying the two worlds. The frontmatter is the normative color inventory; names below describe where the values apply.

### Primary

- **Brass (`gold`):** page and editor top edges, heading emphasis, links, step markers, input carets, and checkbox accents.
- **Pale green (`green`):** generation action, successful file checks, square status lights, and the download border. `action-ink`, `action-border`, and `action-hover` complete the generation button.

### Secondary

- **Blue steel (`future-*`):** 40K panel, border, title, and hint.
- **Ochre stone (`realms-*`):** Age of Sigmar panel, border, title, and hint.
- **Pixel brass (`coin`, `coin-edge`, `coin-shade`):** the stepped coin motif. `icon-border` and `art-*` frame and caption the existing app icon.

### Neutral

- **Iron surfaces (`ground`, `panel`, `file-panel`, `export-panel`):** page canvas, editor, file selection, and export area. `line`, `frame-line`, and `page-divider` supply structural separation.
- **Warm and muted text (`ink`, `muted`, `intro-ink`, `label-ink`, `balance-ink`, `field-hint`, `preset-label`, `help-ink`, `note-heading`, `footer-ink`, `code-ink`, `step-ink`):** distinct existing text roles. Keep each assignment paired with its current surface.
- **Control surfaces (`input-*`, `placeholder`, `button-*`, `file-button-*`, `subtle-ink`):** recessed amount fields, preset buttons, file selection, and the underlined clear action.
- **Interaction (`focus`, `link-hover`, `selection`, `selection-ink`, `scrollbar`):** keyboard outlines, link hover, text selection, and scrollbar treatment.
- **Feedback (`error`, `warning-*`, `feedback-*`, `success-ink`, `download-*`, `trust-ink`):** coral errors, amber version consent, and green readiness. `balance-line` separates world identity from the current balance.

**The Named World Rule.** Pair each world color with its written name and field label. Color alone never identifies a currency or an error.

## Typography

**The Readable Instructions Rule.** English headings and instructions use the native sans stack in `body`. Press Start 2P belongs to short English labels and numbered steps. The Latin font is bundled locally through `@fontsource/press-start-2p`. Keep long instructions in the readable sans stack.

| Role                    | Frontmatter tokens                                                                                                       | Use                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Display                 | `display`, `display-compact`, `display-mobile`                                                                           | Main English heading; fluid on wide screens and phones, with a compact intermediate size.                                       |
| Section and note titles | `headline`, `headline-mobile`, `title`                                                                                   | Editor sections and supporting note headings. Heading weight follows native bold styling unless the display explicitly sets it. |
| Body and guidance       | `body`, `body-intro`, `body-small`, `label`, `caption`                                                                   | Body copy, spacious introduction, form labels, status messages, hints, and verification details.                                |
| Stable numbers          | `balance`, `input`                                                                                                       | Current balances and editable targets; both use `tabular-nums`.                                                                 |
| File and code           | `filename`, `filename-mobile`, `code`                                                                                    | Filenames and installation paths; allow wrapping anywhere.                                                                      |
| Input placeholder       | `placeholder`                                                                                                            | Readable system sans instructions inside the monospaced amount field.                                                           |
| Brand                   | `brand`, `brand-strong`, `brand-mobile`, `brand-strong-mobile`                                                           | Two-line English wordmark; the second line uses brass.                                                                          |
| Pixel labels            | `world-title`, `world-title-compact`, `pixel-label`, `pixel-label-compact`, `art-caption`, `art-caption-compact`, `step` | World names, supplemental labels, artwork caption, and step numbers.                                                            |
| Footer                  | `footer`, `footer-mobile`                                                                                                | Attribution and source links.                                                                                                   |

The scale is role-based; no single modular ratio is implemented. Partial role tokens describe only the property overrides used in CSS. The generation button adds bold weight (700). Native section headings remain bold. Keep the decorative pixel captions small only where the same information is available in readable text.

## Layout

The centered shell has a maximum width (1120px), including its horizontal padding. The page minimum width is (280px). Shared section, field, button, and gap measurements live in `spacing`.

| Width             | Implemented behavior                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Above 760px       | Shell uses `shell-desktop`. Intro columns are `minmax(0, 1fr) 260px` with a (64px) gap and (54px 10px 46px) padding. Editor sections use `section-desktop`. World panels are equal columns with a (24px) gap. Supporting notes use `1fr 1.4fr` with a (60px) gap.                                                                                                                                                        |
| At or below 760px | Shell uses `shell-compact`; sections use `section-compact`. Intro becomes `1fr 170px`, with a (24px) gap and (38px 0) padding. World panels retain two columns, reduce their gap and padding, and use the compact pixel title. Notes reduce their gap to (30px).                                                                                                                                                         |
| At or below 560px | Shell uses `shell-mobile`; sections use `section-mobile`. Intro pairs the heading with a (72px) icon column; its paragraph and local-processing statement span both columns. The caption and supplemental section labels disappear. Worlds and supporting notes become one column. File and export rows stack, their main controls fill the available width, and presets wrap. World titles return to their normal size. |

The masthead reduces from a minimum height (105px) to (86px) at the phone breakpoint. Its icon reduces from (56px) to (44px). The primary action has a desktop minimum width (202px), removed when it fills the phone row. Form guidance is limited to (80ch). Numeric rows can wrap; filenames, errors, paths, and download labels use `overflow-wrap: anywhere`.

**The Continuous Task Rule.** Keep file selection, both balances, generation, and recovery information in the same document flow. Responsive changes alter the columns without hiding controls or their feedback.

The field guide follows the installation notes, with a plain definition list limited to 72ch. Its questions link to stable section IDs, and its text is present in the initial HTML. A JavaScript-disabled notice uses the existing warning colors; file selection remains disabled until hydration completes.

## Elevation & Depth

There are no box shadows or text shadows. Depth comes from darker input wells, adjacent surface tones, and crisp borders. This preserves the square pixel character established in the surface brief while keeping text and controls unobscured. The editor's thick brass top edge, each world's border, and the field's heavier bottom stroke carry the structure.

**The Flat Material Rule.** Use tonal separation and solid edges for these components. Keyboard focus is an outline, not a glow or elevation effect.

## Shapes

Controls and panels have square corners (`rounded.square`). Fine structural strokes are generally (1px); input bottom strokes and the desktop artwork frame are (3px). The page and editor top edges are (4px), and the primary button border is (2px).

The artwork frame uses stepped corner cuts (8px); the small coin uses a stepped polygon with (3px) edges. Status markers are square (6px), and step markers are square (24px). Preserve `image-rendering: pixelated` on both uses of the existing app icon. The artwork has no decorative overlay over the form.

## Components

### Buttons and links

- **Generation button:** pale green with dark text, square corners, and a light border. Hover uses `action-hover`; its background transition is (0.16s ease-out).
- **Preset buttons:** dark green with a thin gray-green border. Hover uses `button-hover`. The clear action uses a transparent background and border with underlined text; it retains the inherited button hover treatment.
- **File selection:** brass-edged label with a native file input covering the label invisibly. Hover changes the surface to `file-button-hover`; `:focus-within` outlines the whole label. Busy state disables the native input.
- **Links:** brass with an underline offset (5px), lightening on hover. The brand link omits its underline. The download is a full-width, bordered green link with a wrapping filename and a separate arrow.
- **Keyboard focus:** `:focus-visible` uses the `focus` color with a solid outline (3px) and offset (5px). File selection uses the same treatment through `:focus-within`.
- **Disabled state:** buttons and disabled fieldsets reduce opacity to (0.5). A disabled preset button also inherits its fieldset's dimming. Buttons and inputs use `not-allowed` cursors; the visually hidden file input has its own pointer styling. No separate pressed transform or active-state color is authored.

### World panels and amount fields

Each world panel contains a stepped coin, a written world name and hint, a current balance, and a labeled target input. The 40K and AoS variants share layout and differ only in their world colors. Amount fields use a dark well, a thin outline, and a heavier bottom stroke. Each field spans its panel width and uses monospaced tabular numbers.

Invalid targets change their border to `error`, show a readable field message, set `aria-invalid`, and point `aria-describedby` to that message. Otherwise the description points to the shared amount guidance. A disabled fieldset keeps both world panels visible until a valid file is available or processing ends.

### Status, version consent, and download

File inspection and generation feedback have separate polite, atomic live regions. Empty regions add no message spacing. Errors use readable coral text; the generation status also identifies when the user must correct an amount. An unverified version adds an amber box with a native checkbox (20px), explanatory copy, and a separate acknowledgment label.

A successful generation displays a green message and the named download link. After Svelte renders that link, focus moves to it. Changing an amount, preset, file, or version acknowledgment removes the stale download. New file selection also resets targets and acknowledgment.

The download's `ready` animation changes its background from `download-ready` to `download-panel` over (0.35s ease-out). It neither fades text nor moves the layout. Under `prefers-reduced-motion: reduce`, all animations and transitions are disabled, including the button hover transition.

## Do's and Don'ts

- **Do** preserve the existing app icon's crisp pixels and pair the two world colors with written labels.
- **Do** use native sans for English instructions and tabular monospace for balances.
- **Do** keep square material edges, visible focus, readable error messages, and filenames that wrap.
- **Do** retain responsive access to both worlds, version consent, generation, and recovery guidance.
- **Don't** substitute decorative faction insignia for the neutral coin and material motifs.
- **Don't** add shadows, rounded card styling, or overlays that obscure the current flat material system.
- **Don't** use pixel lettering for long English instructions or rely on color alone for state.
- **Don't** add network-loaded design assets or present format recognition as device verification.
