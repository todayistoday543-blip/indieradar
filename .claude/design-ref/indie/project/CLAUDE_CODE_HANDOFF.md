# IndieRadar — Claude Code Handoff
**Direction:** DIR-01 · Signal Terminal
**Logo:** LOGO-02 · Aperture (precision reticle, gold accent)
**Page in scope this round:** `/articles` (article list)
**Date:** 2026-05-04

---

## 0. North star (one paragraph)

IndieRadarは「読み物」ではなく **monetization signal terminal** である。
Bloomberg端末 × Aesop × Notion 的な高級感のあるダーク基調 + 単一アンバーアクセントで、
HN / PH / Reddit / X / Indie Hackers / User submissions を 9 言語で再配信する装置として見せる。
記事はリストではなく **番号付きシグナル行** として並ぶ。
読み手 (= 個人開発者 / インディーオペレーター) の上昇志向と、
「世界中の成功事例にアクセスできる」スケール感を、両立して引き出す。

---

## 1. Logo (LOGO-02 · Aperture)

```svg
<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(90 90)">
    <!-- six tick marks at 60° intervals -->
    <g stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2">
      <line x1="0" y1="-46" x2="0" y2="-58"/>
      <line x1="0" y1="-46" x2="0" y2="-58" transform="rotate(60)"/>
      <line x1="0" y1="-46" x2="0" y2="-58" transform="rotate(120)"/>
      <line x1="0" y1="-46" x2="0" y2="-58" transform="rotate(180)"/>
      <line x1="0" y1="-46" x2="0" y2="-58" transform="rotate(240)"/>
      <line x1="0" y1="-46" x2="0" y2="-58" transform="rotate(300)"/>
    </g>
    <circle r="42" fill="none" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.5"/>
    <circle r="22" fill="none" stroke="#D4A24A" stroke-width="1.2"/>
    <line x1="-6" y1="-22" x2="-6" y2="22" stroke="#D4A24A" stroke-width="1.2"/>
    <line x1="6"  y1="-22" x2="6"  y2="22" stroke="#D4A24A" stroke-width="1.2"/>
    <circle r="3" fill="#D4A24A"/>
  </g>
</svg>
```

- Outer ring + 6 tick marks = paper/canvas (use `currentColor`, expect `#E8E6E1` on dark, `#1A1814` on light)
- Inner reticle (small circle, two parallel rules, center dot) = `#D4A24A` (signal gold), always
- Favicon: render at 32×32 with the inner reticle slightly scaled up (r=26 inner, drop tick marks if needed)
- Logo lockup: mark + wordmark "IndieRadar" (Fraunces 400, -0.005em). Mark height = cap height of wordmark.

---

## 2. Design tokens

```css
:root {
  /* INK / canvas */
  --ink-0: #0B0B0C;     /* canvas */
  --ink-1: #141416;     /* surface */
  --ink-2: #1F1F22;     /* divider */
  --ink-3: #2A2A2D;     /* border-strong */
  --ink-4: #5C5852;     /* text-mute */
  --ink-5: #8A857D;     /* text-secondary */

  /* PAPER / type */
  --paper-1: #A8A39B;   /* body */
  --paper-2: #C8C3BA;   /* emphasis */
  --paper-3: #E8E6E1;   /* primary */

  /* SIGNAL / accents */
  --signal-gold: #D4A24A;   /* primary accent · MRR · CTA */
  --signal-live: #7BA88F;   /* live · positive · verified */
  --signal-warn: #C9695C;   /* declining · ended */

  /* SOURCE colors */
  --src-hn:     #FF6600;
  --src-ph:     #DA552F;
  --src-reddit: #FF4500;
  --src-x:      #FFFFFF;
  --src-ih:     #A78BFA;
  --src-user:   #7BA88F;

  /* TYPE */
  --font-display: 'Fraunces', Georgia, serif;
  --font-body:    'Inter', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', ui-monospace, monospace;

  /* MOTION */
  --ease:     cubic-bezier(.2, .7, .3, 1);
  --dur-fast: 120ms;
  --dur-std:  180ms;
  --dur-slow: 320ms;

  /* GEOMETRY */
  --radius:      0;        /* default — sharp */
  --radius-pill: 9999px;   /* pills only */
  --hairline:    1px solid var(--ink-2);
  --strong:      1px solid var(--ink-3);
}
```

### Type scale
| Token | Font | Size/Line | Weight | Tracking |
|---|---|---|---|---|
| `display.xl` | Fraunces | 76 / 76 | 300 | -0.03em |
| `display.l` | Fraunces | 44 / 46 | 300 | -0.025em |
| `headline.lead` | Fraunces | 24 / 30 | 400 | -0.012em |
| `headline` | Fraunces | 19 / 24 | 400 | -0.012em |
| `body` | Inter | 13 / 20 | 400 | normal |
| `body.lg` | Inter | 16 / 26 | 400 | normal |
| `ui.label` | JetBrains Mono | 10 / 14 | 500 | 0.2em uppercase |
| `data.amount` | Fraunces | 26 / 26 | 300 | -0.02em (gold) |
| `data.code` | JetBrains Mono | 11 / 16 | 400 | 0.1em |

### Spacing (4px base)
`s.1=4 s.2=8 s.3=12 s.4=16 s.6=24 s.8=32 s.10=40 s.16=64`

### Radius rule
`--radius: 0` is the default. Only **state pills** (LIVE, +38%, NEW, −ENDED) use `--radius-pill`. No other rounded corners.

### Border / elevation
- Layers are expressed via background tone + 1px borders, not shadows.
- `elev.0 = flat`, `elev.1 = bg ink-1 + hairline`, `elev.2 = bg rgba(20,20,22,.4) + backdrop-blur(8px) + hairline` (sparingly — Digest panel, lang menu).

---

## 3. Component map (replace existing → new)

| New component | Replaces | Role |
|---|---|---|
| `<TopBar>` | `Header.tsx` | Logo · primary nav (SIGNALS / SOURCES / OPERATORS / LIBRARY / FIELD NOTES) · LIVE indicator · LANG switch · SIGN IN |
| `<HeroBand>` | hero in `app/page.tsx` | Status line + display headline + paragraph |
| `<DigestPanel>` | new | 4-cell KPI (SCANNED / CLEARED / MRR_TOTAL / LANGS) + next-sweep CTA, glass elev.2 |
| `<FilterBar>` | `Filters.tsx` | Source tabs with counts + SORT / WINDOW / +ADD FILTER controls |
| `<SignalRow>` | `ArticleCard.tsx` | Numbered row: # · src · title+desc+meta · MRR/Δ · heat · X/9 · → |
| `<SourceBadge>` | generic chip | 6 variants with colored 1px border |
| `<LangChipset>` | new | TR → JP/EN/KO + "X/9" indicator, expand-on-click |
| `<HeatMeter>` | new | 5-bar amber meter, 0–5 levels |
| `<EmptyRadar>` | `EmptyState.tsx` | Sweep-in-progress with arc + countdown + "NOTIFY ME" |
| `<InfoBand>` | new | 3-cell trust strip below feed |
| `<Footer>` | `Footer.tsx` | 4-col + status line |

---

## 4. State coverage (every component)

```
TopBar       default · scrolled · auth-out · auth-in · lang-menu-open
HeroBand     default · loading · empty
DigestPanel  default · loading · error · subscribed
FilterBar    default · hover-tab · active-tab · disabled · loading-counts · overflow-scroll
SignalRow    default · hover · lead · saved · external-only · user-submitted ·
             loading-skeleton · translation-incomplete · ended
SourceBadge  hn / ph / reddit / x / ih / user · interactive · static
LangChipset  default · partial(<9) · full(9/9) · hover · active(current lang) · loading
HeatMeter    0 · 1 · 2 · 3 · 4 · 5 · animated-on-hover
EmptyRadar   scanning · zero-results · error · pre-launch · notify-subscribed
InfoBand     static · CTA-variant
Footer       default
```

---

## 5. SignalRow — the atomic spec

**Grid (≥1280):** `60px · 80px · 1fr · 130px · 120px · 80px · 40px`, `gap: 24px`, `padding: 24px 40px`.

```
[ 003 ] [ HN ] [ Title (Fraunces 19) ──────────────] [ $42K ] [ ▮▮▮▮▯ ] [4/9] [ → ]
                desc (Inter 13, ink-5, 660px max)
                ◇ AI · SEO  —  TR → JP EN KO ZH +5  —  6h ago · CASE
```

**Hover state:**
- background → `rgba(212,162,74,.05)`
- left border 2px gold (handled via `border-left` + reduce `padding-left` from 40 → 38 to keep alignment)
- `→` arrow → gold
- transition: `background var(--dur-std) var(--ease), border-color var(--dur-std), padding-left var(--dur-std)`

**Lead-row variant (`isLead`):** prepend `★ LEAD SIGNAL · CLEARED 38× THRESHOLD` (Mono 9 / 0.2em / gold), bump title to 24, gradient bg `linear-gradient(90deg, rgba(212,162,74,.05), transparent 35%)`.

**A11y:** entire row is one `<a>` (or button). The number is `aria-hidden`. Accessible name = title.

---

## 6. Motion principles

- **No bounces. No 3D. No parallax. No skews.**
- Allowed: opacity, ≤4px translate, color, background, border-color.
- Base ease: `cubic-bezier(.2, .7, .3, 1)`.
- Durations: `120ms` UI hover · `180ms` row reveal / tab swap · `320ms` hero / language switch.

| Interaction | Spec |
|---|---|
| Row hover | bg + left-stroke + → color, 180ms |
| Tab swap | active chip fill paints in 120ms; list cross-fades 180ms |
| Language switch | title/desc cross-fade 320ms; lang chip flashes once; X/9 counts up |
| Card reveal (initial) | opacity 0→1, translateY 6→0, 220ms, stagger 30ms |
| LIVE pulse | 1.6s, 0.6→1 opacity (only if `prefers-reduced-motion: no-preference`) |
| Hero radar arc | sweep once on mount, 320ms, then static |
| Empty state arc | very faint pulse every 4s |

---

## 7. Responsive

| Breakpoint | Behavior |
|---|---|
| ≥1280 | Full 7-column grid; hero 2-col with Digest; filter bar one line |
| 768–1279 | Row collapses meta line below desc; heat meter joins meta row; Digest moves below hero |
| <768 | Card-style row, no columns; MRR + heat inline; filter bar horizontal scroll-snap; LangChipset becomes a drawer; mark-only logo |

---

## 8. Accessibility checklist

- Contrast: `paper-3 / ink-0` = 16.4:1, `gold / ink-0` = 8.1:1 ✓ (gold OK at 14px+, not for 12px body)
- Source badges always include text (HN, PH, ...). Never color-only.
- HeatMeter: `role="meter"`, `aria-valuemin=0`, `aria-valuemax=5`, `aria-valuenow={n}`, `aria-label="Heat {n} of 5"`.
- LIVE pulse honors `prefers-reduced-motion: reduce` → static dot only.
- Decorative SVGs (radar arc, empty-state sweep) `aria-hidden="true"`.
- Lang switch = native `<select>` with visible label "LANG", not a custom dropdown.
- Numbered prefix in row is `aria-hidden`.
- **RTL pass required (AR):** mirror nav order, source-badge alignment, arrow direction, gradient direction.
- Focus rings: 1px outset gold, `outline-offset: 2px`. Never remove without replacement.

---

## 9. Implementation order

1. **Tokens + fonts** — install Fraunces / Inter / JetBrains Mono via `next/font` (variable, weights 300/400/500/600). Define CSS vars + Tailwind theme extension.
2. **SourceBadge / HeatMeter / LangChipset** — atomic units; lock these first.
3. **SignalRow** — compose from #2; cover hover / lead / loading / ended states.
4. **FilterBar** — source tabs with live counts; SORT / WINDOW / +ADD FILTER.
5. **TopBar** with new Aperture logo + lang switch.
6. **HeroBand + DigestPanel**.
7. **EmptyRadar** (replaces current empty state — top priority for first-launch experience).
8. **InfoBand + Footer**.
9. **i18n copy** for 9 langs (priority: JP / EN / KO / ZH first).
10. **Motion polish** — hover states, hero sweep, language cross-fade.
11. **RTL pass** for Arabic.

---

## 10. Out of scope (defer)

- Article detail page (use the same row vocabulary as a spine; full layout next round).
- User submission form & moderation queue (placeholder USER badge only this round).
- Operator profiles, "Stack" library, paid plans / pricing page.
- Inline video embeds (URL link only for now).
- Personalization / saved feed / notifications.
- Search.

---

## 11. Paste-ready summary block

```
// IndieRadar — Terminal Edition · v0.1
// Goal: convert /articles into a "monetization signal terminal".
// Logo: LOGO-02 Aperture (see §1 SVG).
// Direction: monochrome ink + single signal-gold accent. No purple. No glow gradients.
//
// 1. Install tokens (§2) and three fonts (Fraunces / Inter / JetBrains Mono).
// 2. Build atoms: SourceBadge, HeatMeter, LangChipset.
// 3. Compose SignalRow (§5) with all states (§4).
// 4. Compose FilterBar, TopBar, HeroBand, DigestPanel, EmptyRadar, InfoBand, Footer.
// 5. Replace existing Header / Hero / ArticleCard / EmptyState / Footer.
// 6. Motion per §6. A11y per §8. Responsive per §7.
// 7. Default lang = JP. Lang chip persists per user (cookie). RTL for AR.
// 8. Defer detail page, profiles, paid plans (§10).
```

---

**Reference:** see `IndieRadar Redesign.html` — section 04 for the full article-list mock at 1440 wide; section 05 for the live design system sheet.
