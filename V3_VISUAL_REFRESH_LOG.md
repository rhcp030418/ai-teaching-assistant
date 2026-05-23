# V3 Visual Refresh Log

This log records the V3-inspired visual refresh work only.

Do not use this file as the implementation spec. The current spec is `V3_VISUAL_REFRESH_PLAN.md`.

## Context

The course-detail structure refactor is already complete. This visual pass should not change routing, data ownership, auth, feature placement, or behavior.

Reference files:

- `src/reference/V3_02_gpt.jpg`
- `src/reference/V3_03_gpt.jpg`
- `src/reference/V3_04_gpt.jpg`
- `course-detail-preview/v3-visual-preview.html`

## Phase V0: Audit

Status: Complete (no app code changed; logging only)

### Files Inspected

- `src/app/globals.css`
- `src/app/dashboard/layout.tsx` (parent global layout — context only)
- `src/app/dashboard/course/[courseId]/layout.tsx`
- `src/app/dashboard/course/[courseId]/course-nav.tsx`
- `src/app/dashboard/course/[courseId]/page.tsx`
- `src/app/dashboard/course/[courseId]/chat-side-panel.tsx`
- `src/app/dashboard/course/[courseId]/feedback-analysis.tsx`
- `src/app/dashboard/course/[courseId]/trend-analysis.tsx`
- `src/app/dashboard/course/[courseId]/radar-chart.tsx`

### Repeated Visual Patterns (current = neutral gray)

- Cards: `bg-white rounded-xl border border-gray-200 shadow-sm` (KPI cards, slim sidebar cards, link cards).
- Text: titles `text-gray-900`, secondary `text-gray-400`/`text-gray-500`.
- KPI accents: left border `border-l-{gray-400|blue-500|green-500|orange-500}`; numbers are `text-gray-900` (not colored).
- Course header (layout): `text-3xl font-bold text-gray-900` + `text-gray-400` subtitle + outline Button.
- Course nav: underline style — `border-b border-gray-200`, active `border-gray-900 text-gray-900 font-semibold`, inactive `text-gray-500`.
- Chat float (chat-side-panel): already `bg-blue-600` round button (on-palette).

### Theme Variable Structure

- `globals.css` uses Tailwind v4 + shadcn CSS variables (`:root` is a neutral gray oklch theme; `--primary` is near-black, charts are grayscale `--chart-*`).
- The course-detail pages do NOT consume these variables — they use hardcoded Tailwind gray classes. shadcn `:root` mainly affects `src/components/ui/*` primitives (Button, etc.) used app-wide.
- Decision: **do NOT touch `:root`** (constraint + it would restyle landing/dashboard-list/tone). V1 uses scoped hardcoded Tailwind classes (arbitrary hex for the few signature V3 tokens) only inside the course-detail files. No global token change.

### Chart Colors

- `radar-chart.tsx`: SVG props — data shape `stroke="#3b82f6"` / `fill="rgba(59,130,246,0.15)"` (blue, on-palette), grid `stroke="#e5e7eb"` (neutral, fine), compare overlay `#f97316` (orange/amber semantic). Axis labels `fill-gray-*`.
- `trend-analysis.tsx`: hardcoded series colors — 이해도 `#22c55e` (green=positive), 속도 적절 `#f97316` (amber/caution), 소통 `#3b82f6` (blue=product); axis/grid gray.
- Conclusion: charts are already semantic (blue/green/amber), NOT gray-dominant data. **No chart color change required for V1.** Optional later nudge: radar/trend blue `#3b82f6` → V3 `#1677ff` (deferred, cosmetic).

### V1 Pass-1 File List (intended edits)

- `src/app/dashboard/course/[courseId]/layout.tsx` — blue-white page surface (scoped, full-bleed via negative margins inside the parent `main`), navy header on a soft blue card, restyled materials button.
- `src/app/dashboard/course/[courseId]/course-nav.tsx` — pill nav (white/translucent bar, pale blue border) with bright-blue active pill.
- `src/app/dashboard/course/[courseId]/page.tsx` — KPI cards (pale blue border + colored numbers blue/sky/green/amber), slim sidebar cards to blue-white system, 평가 상태 card as the single blue-gradient anchor, quick-link cards.

Not editing in V1 (kept as-is): `chat-side-panel.tsx` (already blue, stays secondary), `feedback-analysis.tsx`, `trend-analysis.tsx`, `radar-chart.tsx` — will only revisit if the overview looks visually mismatched after the above.

### Global Variable Use Decision

- No `:root` / shadcn token changes. Scoped hardcoded Tailwind (+ minimal arbitrary hex for navy `#10233F`, blue `#1677ff`, page `#f8fbff`/`#eff6ff`, soft blue shadow). Repeated shadow value kept consistent across the 3 files.

### Chart Color Change Needed?

- No for V1. Charts already use semantic blue/green/amber. Optional future nudge documented above.

## Phase V1: Course Overview Pilot

Status: Complete (pending runtime visual QA)

### Files Changed

- `src/app/dashboard/course/[courseId]/layout.tsx`
- `src/app/dashboard/course/[courseId]/course-nav.tsx`
- `src/app/dashboard/course/[courseId]/page.tsx`

Not changed (confirmed not needed): `chat-side-panel.tsx`, `feedback-analysis.tsx`, `trend-analysis.tsx`, `radar-chart.tsx`. Charts already use semantic blue/green/amber; `feedback-analysis`/`trend-analysis` have no top-level gray card frame (AI summary already `blue-50/blue-100`, inner comment blocks neutral `gray-50`), so they harmonize with the new blue-white background without edits.

### Applied Visual Direction

- **Scoped blue-white surface** (no `:root`/shadcn token change): course layout wraps content in a full-bleed cool blue-white gradient (`from-[#f8fbff] via-[#f5f8ff] to-[#eff6ff]`) using `-mx-8 -my-8 … px-8 py-8` to cancel the parent `main` padding. Only the course-detail subtree is affected; landing/dashboard-list/tone untouched.
- **Header → soft blue card**: `rounded-2xl border border-blue-100 bg-white/90` + soft blue-tinted shadow; navy title `text-[#10233F]`; secondary `text-slate-500`; materials button restyled to blue outline (`border-blue-200 text-[#0F5FD7]`).
- **Course nav → pill bar**: white/translucent bar with pale blue border + soft shadow; active item is a bright-blue filled pill (`bg-[#1677FF] text-white`), inactive `text-slate-500 hover:bg-blue-50`. (Changed from the previous underline style.)
- **KPI cards**: `rounded-xl border-blue-100 bg-white` + soft blue shadow; hierarchy via colored numbers instead of left-border accents — 총응답 navy `#10233F`, 소통 blue `#1677FF`, 이해도 green `emerald-600`, 속도 amber `amber-500`. Density preserved (`p-5`).
- **Slim sidebar**: 평가 상태 becomes the single blue gradient anchor card (`from-[#1677FF] to-[#38BDF8]`, white text) when a round is active; otherwise a calm white card with a blue management link. 응답 요약 + quick links → white cards, pale blue borders, navy text, blue `→` accent.
- **Semantic colors preserved**: blue = product/accent, green = positive (이해도, charts), amber = caution (속도, charts), red reserved for real errors (none introduced). No "everything blue".
- **AI assistant**: `ChatSidePanel` left as-is — small blue floating button, visually secondary, not made into a hero element.
- **Radius/density guardrails**: cards `rounded-xl`; only header + nav containers use `rounded-2xl`; no `rounded-3xl`; padding kept `p-5`/`px-7 py-6`; hierarchy via weight/color, not oversized fonts.

### Validation

- `npm run lint` (eslint) → clean.
- `npx tsc --noEmit` → exit 0, no type errors.
- `grep` confirms: page.tsx has zero leftover `border-gray-200` / `border-l-*` / `text-gray-900` / `shadow-sm`; V3 tokens present in all 3 files.
- **Runtime visual QA: PENDING.** The dev server was stopped earlier (during the prior project's Phase 3 build) and not restarted. No live screenshot taken. To verify: `cd ai-teaching-assistant && npm run dev`, open `/dashboard/course/[courseId]` (login `kim@hansung.ac.kr` / `demo1234`).

### Remaining Visual QA Items (to check once dev is up)

- Full-bleed background: confirm the `-mx-8 -my-8` negative-margin trick fills correctly under the global header with no horizontal scrollbar and no gray gap (esp. when the demo banner is present, which adds height).
- Text contrast: confirm navy `#10233F` on white and white text on the blue gradient 평가 상태 card both read strongly.
- AI assistant entry point: confirm it still reads as secondary, not dominant.
- Active-round blue card vs no-active white card: verify both states look intentional.
- Left column (FeedbackAnalysis/TrendAnalysis) vs new blue-white shell: confirm no jarring mismatch; if the neutral `gray-50` inner blocks feel off, nudge to `blue-50/40` (deferred candidate).

### Before V2 Extension

- Get user visual approval of V1 first (per plan; V2 not started).
- Decide whether to consolidate the repeated arbitrary shadow/hex values into a small scoped helper (e.g. a `.v3-card` class) before applying the same system to `/analysis`, `/management`, `/benchmark`, `/materials` — V2 will repeat these tokens across more files, so consolidation may be worth it then.
- Optional chart nudge (radar/trend blue `#3b82f6` → `#1677FF`) can be folded into V2 if desired.

### V1.1 — Inner-Content Refinement (FeedbackAnalysis / Radar / Trend)

Status: Complete (pending runtime visual QA)

Reason: V1 only restyled the layout/page shell; the actual core of 현황 요약 (FeedbackAnalysis cards, RadarChart, TrendChart) still used shadcn-default gray. V1.1 brings the inner content to the V3 blue-white system to match `v3-visual-preview.html`.

#### Files Changed

- `feedback-analysis.tsx`, `radar-chart.tsx`, `trend-analysis.tsx`, `chat-side-panel.tsx`, `layout.tsx`

#### Changes

1. **FeedbackAnalysis cards** — shared `V3_CARD` constant (`ring-0 border-blue-100 bg-white/90` + soft blue shadow) passed to every shadcn `<Card>` via `className` (the global `card.tsx` primitive is NOT modified, so other pages are unaffected). Titles → deep navy `text-[#10233F]`, descriptions → muted blue-gray `text-slate-500`.
2. **AI summary line** → upgraded from a thin alert row to a "학생 의견 요약" panel (`rounded-xl border-blue-100`, soft blue gradient, labeled caption + a small low-key `AI` badge, summary text in `#27496D`). Not a large hero; badge intentionally de-emphasized.
3. **Bars** — track `bg-gray-100` → `bg-blue-50`; labels `#27496D`, counts `slate-400`. Colors lower-saturation + de-redded: 속도 빠름 `red-400 → amber-400`, 적당 `green-400 → emerald-400`; 이해도 높음 `emerald-400`, 보통 `yellow-400 → amber-400`, 낮음 `red-400 → rose-400` (real negative kept, softened). Communication score number → `#1677FF`.
4. **RadarChart** — grid + axis lines `#e5e7eb → #DBEAFE`; main shape `#3b82f6 → #1677FF` with softer fill `rgba(22,119,255,0.12)`; labels `fill-gray-600 → #27496D`; % labels + legend → slate; value readout navy `#10233F`. Compare overlay left orange (intentional contrast for 분야 평균).
5. **TrendChart** — added a soft blue gradient plot-area background (`<defs>` linearGradient + rounded `<rect>`); Y grid `#f0f0f0 → #DBEAFE`, divider `#d1d5db → #bfdbfe`, axis text → muted blue-gray; lines crisper (2.5→3), points (r4→4.5, sw2→2.5); series recolored to V3 tokens keeping semantics: 이해도 `#10B981` (green), 속도 `#F5B544` (amber), 소통 `#1677FF` (blue). Narrative box text → `#27496D`, predicted metric colors aligned (emerald/blue/amber).
6. **Typography** — course-detail wrapper given a Korean-friendly font stack (`-apple-system … "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic"`). Hierarchy kept via weight/color, not larger fonts.
7. **AI 어시스턴트 button** — kept floating structure/position/size; only the look tidied from default `bg-blue-600 shadow-xl` to a soft V3 blue gradient + softer blue shadow. Still visually secondary; no label/character added.

#### Semantic Color Preservation

- Response-rate warnings keep yellow (caution) / red (real low-response) — unchanged.
- Trend badges keep green (improving) / red (worsening) / amber (mixed); "안정적" stays neutral gray (a true neutral state, not positive/caution/error).

#### Validation

- `npm run lint` → clean.
- `npx tsc --noEmit` → exit 0.
- Residual-gray grep: only 2 intentional spots remain — `feedback-analysis.tsx:159` (`text-gray-500` inside the `!hideTitle` header branch, which never renders on 현황 요약 since it is called with `hideTitle`) and the `stable` neutral trend badge. Both intentional.
- **Runtime visual QA: PENDING** — dev server still stopped from the earlier build. To view: `npm run dev` → `/dashboard/course/[courseId]` (`kim@hansung.ac.kr` / `demo1234`).

#### Visual QA To Check

- Card borders/shadows read as soft blue (not gray); titles strongly navy.
- "학생 의견 요약" panel feels meaningful but not a giant hero; AI badge subdued.
- Radar/trend charts feel V3 (blue grid, crisp blue line, gradient area) while green/amber series stay distinguishable.
- Bars readable with the new blue track; no jarring red except genuine negatives.
- Korean text renders cleanly with the new font stack.

### V1.2 — RadarChart Structural Redesign

Status: Complete (pending runtime visual QA)

Reason: V1.1 only recolored the radar; its structure/grid/labels/background were unchanged, so the polygon "looked the same" to the user. V1.2 rebuilds the radar to clearly match `v3-visual-preview.html`.

#### Files Changed

- `radar-chart.tsx` (full rewrite of the visual layer; data/axis math unchanged)
- `chat-side-panel.tsx` (open-panel header/border only)
- `feedback-analysis.tsx`: not changed — the radar card already leads with the V1.1 "학생 의견 요약" panel above the chart, giving the reaction-summary feel without further edits.

#### RadarChart Changes (structure, not just color)

- **Soft blue plot background**: radial-gradient circle (`#38bdf8`→`#1677ff` fading to transparent) behind the chart.
- **Circular guide rings** replace the polygon grid (4 concentric circles, outer `#BFDBFE` / inner `#DBEAFE`) — removes the "tech-demo polygon" look and hides the awkwardness of 5- vs 6-gon shape changes. Axis spokes kept very faint (`#E4EEFB`).
- **Data polygon**: SVG `linearGradient` fill (blue→sky, 0.42→0.16 alpha) + crisper `#1677FF` stroke (2.5, round joins).
- **Data points**: smaller, white-bordered V3 dots (r3.5, fill `#1677FF`, white stroke).
- **Labels**: now rounded **pill chips** (white 85% bg + pale blue border) with bold navy text, anchored per quadrant — far more readable than bare SVG text.
- **Value readout**: redesigned into V3 chips (`rounded-full border-blue-100 bg-blue-50/70`, muted label + bold navy value) instead of plain gray text.
- **Compare overlay** recolored orange→amber `#F5B544` (caution/secondary), still dashed and distinct from the primary blue.
- Data calc, axis count handling, and `getPoint` geometry untouched — no metric/logic change.

#### Chat Panel (open state, minimal)

- Panel left border `gray-200 → blue-100`; header border `gray-100 → blue-100`; title `gray-700 → #10233F`; "스트리밍" badge `gray → blue-50/#0F5FD7`; close button hover `gray → blue-50/#0F5FD7`. Message list / input / streaming logic untouched.

#### Validation

- `npm run lint` → clean.
- `npx tsc --noEmit` → exit 0.
- **Runtime visual QA: PENDING** (dev server still stopped). To view: `npm run dev` → `/dashboard/course/[courseId]`.

#### Visual QA To Check

- Radar reads clearly different from V1.1: rings (not polygon grid), gradient fill, pill labels, soft blue glow.
- 5-axis vs 6-axis radars both look intentional (rings soften the shape change).
- Value chips align with the card's blue-white tone; density still compact.
- Chat open panel header/border now blue-white; body unchanged and functional.

### V1.3 — Codex Direct Polish Pass

Status: Complete (pending user visual QA)

Reason: The V1.2 radar rewrite improved the SVG internals, but the overview still needed a stronger composed dashboard feel. This pass keeps the work inside the current V1 scope and does not start V2.

#### Files Changed

- `radar-chart.tsx`
- `feedback-analysis.tsx`
- `trend-analysis.tsx`
- `ai-chat.tsx`

#### Changes

- **Radar chart**: expanded the SVG viewBox so label pills fit inside the chart instead of relying on overflow. Added unique SVG ids via `useId()` for gradients/filters, a stronger blue/sky/cyan data fill, a subtle drop shadow on the data polygon, an outer polygon guide over the circular rings, and a grid-style value chip readout below the chart.
- **Radar card composition**: changed the card title from the evaluative `종합 평가` to `주요 반응 요약`; split the card content into a left summary block and right chart panel on wide screens. Added compact chips for 응답/지표/익명 집계 so the section reads like an overview module rather than a raw chart.
- **Response badge**: changed the response-count badge from default shadcn gray to a blue-white V3 badge.
- **Trend button/badge**: restyled the `AI 분석` button to match the blue outline system and changed the neutral stable badge away from gray-only styling.
- **AI chat body**: extended the V3 tone beyond the floating button/header into empty-state suggestion buttons, assistant/user bubbles, message background, input border/focus, send button, scroll button, and non-panel chat container. Logic and streaming behavior unchanged.

#### Validation

- `npm run lint` → clean.
- `npx tsc --noEmit` → exit 0.
- Runtime visual QA still needs user/browser confirmation.

### V1.4 — HTML Preview Layout Alignment

Status: Complete (pending runtime visual QA)

Reason: The user wanted the actual course overview to match `course-detail-preview/v3-visual-preview.html` more directly, not just borrow its colors. This pass aligns the page shell, hero, nav, overview order, and lower two-column layout with the preview.

#### Files Changed

- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/course/[courseId]/layout.tsx`
- `src/app/dashboard/course/[courseId]/course-nav.tsx`
- `src/app/dashboard/course/[courseId]/page.tsx`
- `src/app/dashboard/course/[courseId]/feedback-analysis.tsx`

#### Changes

- **Dashboard shell**: changed the dashboard background/top nav from gray-white to the preview's blue-white glass navigation, including the gradient brand mark and pill-style nav links.
- **Course hero**: rebuilt the course header into a preview-like hero card with soft radial blue background, eyebrow badge, large navy title, and right-side action buttons.
- **Course nav**: changed the course-level nav to preview-style gradient active pills and added `강의자료 분석` as a course nav item.
- **Overview order**: removed duplicate KPI rendering from `page.tsx`; `FeedbackAnalysis` now owns the preview-like order: student summary → KPI cards → radar/distribution.
- **Trend/comments row**: moved `CommentsSection` beside `TrendAnalysis` in a two-column row, matching the preview's lower dashboard composition.
- **Summary card**: changed the nested summary box into a preview-like icon + narrative + chips panel.

#### Validation

- `npm run lint` → clean.
- `npx tsc --noEmit` → exit 0.
- `npm run build` → clean; all course subroutes listed as dynamic routes.
- Existing dev server on `http://localhost:3000` responded: `/login` 200, `/dashboard` redirects to `/login` when unauthenticated.
- Runtime authenticated visual QA still needs browser confirmation.

### V1.5 — Preview Parity + Demo DB Enrichment

Status: Complete (pending authenticated visual QA)

Reason: The previous pass still did not match the standalone preview's density: the current-round card was absent due to stale demo dates, the radar still looked like the earlier SVG chart, the top nav/floating assistant differed from the preview, and the visible demo course lacked submissions/material analysis density.

#### Files Changed

- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/sign-out-button.tsx`
- `src/app/dashboard/course/[courseId]/layout.tsx`
- `src/app/dashboard/course/[courseId]/page.tsx`
- `src/app/dashboard/course/[courseId]/feedback-analysis.tsx`
- `src/app/dashboard/course/[courseId]/radar-chart.tsx`
- `src/app/dashboard/course/[courseId]/chat-side-panel.tsx`
- `src/lib/course-access.ts`
- `prisma/enrich-demo-database.ts`

#### UI Changes

- **Top nav parity**: aligned the global dashboard nav with the preview: glass blue-white bar, `A` brand mark, active pill for `강의 목록`, `말투 교정`, `설정`, avatar, and professor label.
- **Hero current context**: course hero eyebrow now shows active round text when a round is currently open.
- **Overview data scope**: when an active round exists, overview metrics/comments/radar use that round's feedback instead of all-semester feedback. This matches the preview's "이번 주차" framing.
- **Current round sidebar**: rebuilt the right sidebar card into the preview's `현재 라운드` card with 피드백/제출/종료 stat rows, plus quick links and a `데이터 기준` privacy card.
- **Radar parity**: replaced the dense SVG/value-chip radar with the preview-like compact 230px radar: four circular rings, soft blue polygon, pill labels around the chart, no extra value chips.
- **Representative comments**: collapsed comments now show two quote-style student comments plus `전체 의견 보기`, closer to the preview's `대표 학생 의견` block.
- **Floating assistant parity**: restored the preview-like floating label + circular `AI` button while preserving the existing side panel behavior.

#### Demo DB Changes

- Added `prisma/enrich-demo-database.ts`, an idempotent script for the visible demo course `데이터베이스`.
- Ran the script against local `dev.db`.
- `데이터베이스` now has:
  - active `6주차` round from 2026-05-20 to 2026-05-29,
  - active round feedbacks: 28,
  - active round submissions: 32,
  - round feedback targets across 1~6 weeks: 22/24/23/25/26/28,
  - analyzed lecture material attached to each week,
  - cached summary for the student-opinion summary panel,
  - 40 one-time feedback tokens.

#### Validation

- `npm run lint` → clean.
- `npx tsc --noEmit` → exit 0.
- `npm run build` → clean.
- `prisma/enrich-demo-database.ts` executed successfully.
- `http://localhost:3000/login` → 200.

### V1.6 — Overview UX Fixes (Claude, post-Codex)

Status: Complete (pending runtime visual QA)

Reason: User feedback on the 현황 요약 screen after the Codex V1.3–V1.5 passes. Five concrete UX issues addressed. Still V1 scope — no V2 subpage work.

#### Files Changed

- `src/app/dashboard/course/[courseId]/layout.tsx`
- `src/app/dashboard/course/[courseId]/course-header-actions.tsx` (NEW)
- `src/app/dashboard/course/[courseId]/trend-analysis.tsx`
- `src/app/dashboard/course/[courseId]/feedback-analysis.tsx`
- `src/app/dashboard/course/[courseId]/page.tsx`
- `src/app/actions/classify-comment-sentiment.ts` (NEW)

#### Changes

1. **Header buttons deduped + active-aware** — `라운드 관리` and `피드백 링크 관리` both routed to `/management` (duplicate) and only the last was statically colored. Replaced the three hand-styled `<Button>` links in `layout.tsx` with a new client component `CourseHeaderActions` (`usePathname`) showing two buttons — `강의자료` (→/materials), `관리 및 기록` (→/management). The button for the current route renders as the blue gradient (active); others are outline. So the highlight now follows the page you're on instead of being fixed. (`Button`/`Link` imports dropped from `layout.tsx`.)
2. **"주차별 트렌드" → "주차별 지표 변화"** — clearer than the ambiguous "트렌드"; both the empty-state and active titles + descriptions updated in `trend-analysis.tsx`.
3. **2×2 cards → one feature per row** — `주요 지표 흐름`(radar) + `세부 응답 분포`(bars) grid in `feedback-analysis.tsx` and `주차별 지표 변화`(trend) + `대표 학생 의견`(comments) grid in `page.tsx` both changed from `xl:grid-cols-*` to vertical `space-y-5` stacks. The overview left column is now a single full-width vertical flow: summary → KPI → radar → distribution → trend → comments.
4. **"추가 의견" → "대표 학생 의견" + sentiment grouping** — title/description renamed. `전체 의견 보기`(expanded) now groups comments by tone (긍정 / 개선 요청 / 중립) with colored section badges instead of the previous week-grouped flat list. Tone is classified by a NEW on-demand server action `classifyCommentSentiment(texts[])` (mirrors `summarizeComments`: takes plain text array, calls `chatWithAI` + `parseAIJson`, **no DB schema change**, runs only when the section is expanded, and always returns an input-length array with a `중립` fallback so the UI never breaks if AI is unavailable). Negative tone is labeled `개선 요청` (amber), not `부정`/red, to keep the professor-respecting product tone. Collapsed 2-item preview unchanged.
5. **Sidebar quick-links removed** — the middle `바로가기 링크` card (강의자료 분석 / 지원 인사이트 / 관리 및 기록) in `page.tsx` was redundant with the course-nav tabs and the header actions; removed. Sidebar now keeps only `현재 라운드` + `데이터 기준`.

#### Notes / Open Items (for Codex)

- `classifyCommentSentiment` is intentionally schema-free and on-demand. If we later want persistent sentiment (and to avoid re-classifying on every expand), promote it into the background `comment-classifier` flow with a new `Feedback.commentSentiment` column + migration + demo re-enrichment. Deferred.
- Collapsed preview badges still use the old `commentCategory` (학습→긍정/제안, else 확인) mapping; only the expanded view uses the new tone classification. Could be unified later.
- Header actions (강의자료 / 관리 및 기록) now partially overlap the course-nav tabs (which also include these). Kept per user request to have quick actions near the hero; revisit if it feels redundant.
- Radar card full-width now has horizontal whitespace around the 230px chart (consequence of the one-per-row request). If too sparse, consider a left-chart / right-readout split inside that single card.

#### Validation

- `npm run lint` → clean.
- `npx tsc --noEmit` → exit 0.
- Grep-verified: no remaining "주차별 트렌드"; layout header has no 라운드/피드백 링크 관리 buttons; sidebar quick-link card removed; `대표 학생 의견` + sentiment wiring present.
- **Runtime visual QA: PENDING** — dev server not running this session. To view: `npm run dev` → `/dashboard/course/[courseId]` (`kim@hansung.ac.kr` / `demo1234`); expand `전체 의견 보기` to confirm tone grouping (needs AI provider configured, else all show as 중립 fallback).

### V1.7 — Follow-up Cleanup (Codex)

Status: Complete (pending runtime visual QA)

Reason: V1.6 still left two inconsistencies: the hero showed only 2 of the 5 course sections as quick buttons, and expanded comments depended on an on-demand LLM sentiment classifier whose accuracy/latency/cost were not worth the UI benefit at this stage.

#### Files Changed

- `src/app/dashboard/course/[courseId]/layout.tsx`
- `src/app/dashboard/course/[courseId]/trend-analysis.tsx`
- `src/app/dashboard/course/[courseId]/feedback-analysis.tsx`
- `src/app/dashboard/course/[courseId]/course-header-actions.tsx` (deleted)
- `src/app/actions/classify-comment-sentiment.ts` (deleted)
- `V3_VISUAL_REFRESH_LOG.md`

#### Changes

- **Hero quick actions removed**: the hero no longer shows partial section buttons. The 5-item course nav is now the single source of truth for section navigation: `현황 요약`, `지원 인사이트`, `관리 및 기록`, `비교 참고`, `강의자료 분석`.
- **Chart title refined**: changed `주차별 지표 변화` to `주차별 반응 변화`. This frames the chart as student response movement across rounds, not a vague trend widget.
- **KPI density adjusted**: kept the 4-card KPI layout, but enlarged numeric values from `text-3xl` to `text-[34px]` to better match the HTML preview's density.
- **Comment card title is state-aware**: collapsed state remains `대표 학생 의견`; expanded state changes to `학생 의견`. Description is now consistently `학생들이 남긴 의견`.
- **LLM sentiment grouping removed**: removed `classifyCommentSentiment` and the expanded-view AI sentiment grouping. Expanded comments now render as a readable full list with lightweight existing-category badges (`학습 관련`, `표현 정리됨`, `기타`) and no extra API call.

#### Validation

- `npm run lint` → clean.
- `npx tsc --noEmit` → exit 0.

### V1.8 — Radar Sizing + Trend Naming (Codex)

Status: Complete

Reason: User noted that `주요 지표 흐름` radar was too small for readability and asked to choose a clearer name between `주차별 평가 추이` and `주차별 평가 변화 추이`.

#### Changes

- **Radar enlarged**: `RadarChart` now uses a 300px chart frame instead of 230px. Container height increased to 350px, ring sizes increased proportionally, polygon radius increased, and labels are positioned dynamically around the larger chart.
- **Trend title renamed**: `주차별 반응 변화` changed to `주차별 평가 추이`. This is shorter and reads more naturally than `주차별 평가 변화 추이` while still communicating week-by-week movement.

#### Validation

- `npm run lint` → clean.
- `npx tsc --noEmit` → exit 0.
- `npm run build` → clean.

### V2.1 — Graph Readability + Subpage Visual Extension (Codex)

Status: Complete (pending runtime visual QA)

Reason: User noted the graph still felt too small, did not trust `commentCategory` as a visible classification signal, wanted the remaining 4 course subpages to start matching the V3 visual tone, and asked whether the top course navigation spacing should be increased.

#### Files Changed

- `src/app/dashboard/course/[courseId]/radar-chart.tsx`
- `src/app/dashboard/course/[courseId]/trend-analysis.tsx`
- `src/app/dashboard/course/[courseId]/feedback-analysis.tsx`
- `src/app/dashboard/course/[courseId]/course-nav.tsx`
- `src/app/dashboard/course/[courseId]/analysis/page.tsx`
- `src/app/dashboard/course/[courseId]/management/page.tsx`
- `src/app/dashboard/course/[courseId]/benchmark/page.tsx`
- `src/app/dashboard/course/[courseId]/materials/page.tsx`
- `src/app/dashboard/course/[courseId]/round-manager.tsx`
- `src/app/dashboard/course/[courseId]/token-manager.tsx`
- `src/app/dashboard/course/[courseId]/round-reports.tsx`
- `src/app/dashboard/course/[courseId]/cause-analysis.tsx`
- `src/app/dashboard/course/[courseId]/improvement-roadmap.tsx`
- `src/app/dashboard/course/[courseId]/benchmark.tsx`
- `src/app/dashboard/course/[courseId]/improvement-cases.tsx`
- `src/app/dashboard/course/[courseId]/materials/materials-client.tsx`
- `V3_VISUAL_REFRESH_LOG.md`

#### Changes

- **Radar enlarged again**: chart frame increased from 300px to 360px, with a 420px card area, larger guide rings, larger polygon radius, and slightly larger label chips.
- **Trend chart enlarged**: SVG viewbox changed from 600×180 to 720×260, with wider plot padding and larger data points. Title remains `주차별 평가 추이`.
- **`commentCategory` badges removed**: `commentCategory` is not shown as a visible badge or semantic label. It is no longer used to filter visible comments; any displayable anonymous comment text can render. No LLM sentiment API is called.
- **Course nav spacing increased**: five course-section pills now use larger min-width, padding, gap, and outer radius.
- **Remaining 4 subpages got V3 page surfaces**: `지원 인사이트`, `관리 및 기록`, `비교 참고`, `강의자료 분석` now have matching blue-white hero cards and navy/slate title hierarchy.
- **Key subpage widgets got V3 card surfaces**: management cards, round reports, cause analysis, roadmap, benchmark, improvement cases, and materials cards now use blue-white borders/shadows instead of default gray shadcn surfaces.

#### Notes / Open Items

- This is a first V2 visual extension, not a full redesign of every nested control. Some internal copy and secondary gray text can still be polished later.
- `commentCategory` remains in the data model and props because other filtering/classification flows may still populate it, but the overview UI no longer presents it as a trusted student-opinion classification.

### V2.2 — Demo AI Result Fixtures (Codex)

Status: Complete (pending runtime visual QA)

Reason: Demo account cannot reliably call external AI APIs during visual QA, but the UI states that appear after successful AI calls still need to be reviewed. User requested that every AI-result surface be visible as if all required data/API responses already existed.

#### Files Changed

- `src/lib/demo-ai-fixtures.ts` (NEW)
- `src/lib/course-access.ts`
- `src/app/dashboard/course/[courseId]/layout.tsx`
- `src/app/dashboard/course/[courseId]/page.tsx`
- `src/app/dashboard/course/[courseId]/analysis/page.tsx`
- `src/app/dashboard/course/[courseId]/management/page.tsx`
- `src/app/dashboard/course/[courseId]/benchmark/page.tsx`
- `src/app/dashboard/course/[courseId]/materials/page.tsx`
- `src/app/dashboard/course/[courseId]/feedback-analysis.tsx`
- `src/app/dashboard/course/[courseId]/trend-analysis.tsx`
- `src/app/dashboard/course/[courseId]/cause-analysis.tsx`
- `src/app/dashboard/course/[courseId]/improvement-roadmap.tsx`
- `src/app/dashboard/course/[courseId]/round-reports.tsx`
- `src/app/dashboard/course/[courseId]/improvement-cases.tsx`
- `src/app/dashboard/course/[courseId]/materials/materials-client.tsx`
- `src/app/dashboard/course/[courseId]/ai-chat.tsx`
- `src/app/dashboard/course/[courseId]/chat-side-panel.tsx`
- `src/app/dashboard/course/[courseId]/use-ai-chat.ts`

#### Changes

- Added centralized demo fixtures for AI-generated outputs:
  - student opinion summary,
  - trend narrative + prediction,
  - cause analysis result,
  - improvement roadmap result,
  - class checklist,
  - benchmark case insight,
  - material analysis,
  - chat assistant seed messages.
- Demo mode is detected from the course professor email via `isDemoUser(course.professor.email)`.
- In demo mode, AI-result components render their completed state immediately instead of waiting for an external API call.
- Actual API logic is preserved for non-demo users. Demo fixtures only fill local UI state; they do not write AI results to the database.
- Materials page now ensures demo mode has an analyzed material visible even if local DB materials are missing or incomplete.
- AI chat starts with a sample course-scoped conversation in demo mode and returns a fixed local reply instead of calling `/api/ai-chat`.

#### Notes / Open Items

- Demo fixtures are intentionally centralized so they can be removed or replaced with real API results later.
- The current fixture copy is written for the visible demo course `데이터베이스`.

### V2.3 — Public Entry + Feedback Form Visual Alignment (Codex)

Status: Complete (pending runtime visual QA)

Reason: User noted that some action buttons still looked black/default, the home/login screens did not match the course dashboard visual language, the home demo stats felt unnecessary, and the student feedback page also needed visual/label cleanup.

#### Files Changed

- `src/components/ui/button.tsx`
- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/app/login/login-form.tsx`
- `src/app/feedback/[courseId]/page.tsx`
- `src/app/feedback/[courseId]/feedback-form.tsx`
- `V3_VISUAL_REFRESH_LOG.md`

#### Changes

- **Default button tone changed**: shadcn/default `Button` now uses the V3 blue primary style instead of the black `primary` token. This affects primary actions such as `교수 로그인`, `라운드 추가`, `링크 생성`, and `피드백 제출`.
- **Home page rebuilt**: removed demo stats (`교수 12명`, `강의 30개`, etc.) and placed the professor login form directly on the home page.
- **Home/login visual tone unified**: applied the same blue-white radial background, navy headings, slate body text, and soft blue cards used in the course dashboard.
- **Login form restyled**: card surface, title, labels, and supporting text now match V3.
- **Student feedback page restyled**: error/info states, page background, course header card, and feedback form cards now use V3 blue-white surfaces.
- **Feedback form labels lightly clarified**:
  - `수업 속도` → `이번 수업의 진행 속도`
  - `자료 이해도` → `강의 내용 이해도`
  - `소통 만족도` → `질문·소통 만족도`
  - `강의 흥미도` → `수업 흥미도`
  - `과제 적절성` → `과제 난이도·분량 적절성`
  - `추가 의견` → `자유 의견`

#### Notes / Open Items

- This pass does not yet redesign the exact survey scale/option model. If the team wants to change the evaluation dimensions themselves, handle that as a separate product decision because it affects collected data semantics.

### V2.4 — Roadmap, Management Layout, Home Stability Fixes (Codex)

Status: Complete (pending runtime visual QA)

Reason: User found remaining visual inconsistencies: roadmap rank numbers were still dark, management operation widgets felt uneven in a 2-column layout, the dashboard `설정` item was non-clickable, and the home login card felt like it was floating without layout stability.

#### Files Changed

- `src/app/dashboard/course/[courseId]/improvement-roadmap.tsx`
- `src/app/dashboard/course/[courseId]/management/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/page.tsx`
- `V3_VISUAL_REFRESH_LOG.md`

#### Changes

- **Roadmap rank numbers updated**: dark gray rank circles changed to the V3 blue gradient.
- **Roadmap tone softened**: `즉시 개선 필요` renamed to `우선 확인`; `개선 권장` renamed to `참고 권장` to reduce directive/evaluative framing.
- **Management operation layout changed**: `RoundManager` and `TokenManager` now stack vertically instead of forcing a 2-column layout with mismatched heights.
- **Dead nav item removed**: non-clickable dashboard `설정` text removed from the top navigation.
- **Home layout stabilized**: intro copy and login form are now inside one large shared panel, with the login area attached as the right-side section rather than floating independently.

### V2.5 — Home Feature Row + Guide Page + AI Caveat (Codex)

Status: Complete (pending runtime visual QA)

Reason: User clarified that the home page feature cards should be laid out as 4 cards in one row to balance the login area, requested a real feature guide where the dead `설정` item had been, and wanted AI risk caveats visible across professor-facing pages.

#### Files Changed

- `src/app/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/guide/page.tsx` (NEW)
- `V3_VISUAL_REFRESH_LOG.md`

#### Changes

- **Home description line break**: split the supporting copy after `강의 단위로 정리하고,` for readability.
- **Home feature cards moved**: representative 4 features now sit in a single horizontal feature row across the bottom of the main panel on desktop (`lg:grid-cols-4`), instead of stacking vertically in the left column.
- **Home ratio corrected**: login area stays in the top-right section while the feature row spans the full panel width, reducing the empty top/bottom imbalance around the login form.
- **Dashboard guide added**: top navigation now includes `기능 사용 설명서`, linking to `/dashboard/guide`.
- **Guide content grouped by professor workflow**:
  - `필수 기능`
  - `필수는 아니지만 쓰면 좋은 기능`
  - `주의해서 봐야 하는 기능`
  - `AI 사용 시 공통 주의사항`
- **AI caveat added globally to dashboard pages**: low-opacity fixed notice at the lower-left of professor dashboard pages: AI summaries/analysis are reference material and may include hallucination, omissions, false positives, or over-inference.

### V2.6 — Home Sections, Summary Badges, Assistant Button, Materials Semantics (Codex)

Status: Complete (pending runtime visual QA)

Reason: User noted that the home representative features should match the five course sections, the student-summary badges reused the same blue tone, the floating assistant button felt too large/poorly placed, and the materials page mixed material-specific analysis with broader class-response metrics.

#### Files Changed

- `src/app/page.tsx`
- `src/app/dashboard/course/[courseId]/feedback-analysis.tsx`
- `src/app/dashboard/course/[courseId]/chat-side-panel.tsx`
- `src/app/dashboard/course/[courseId]/materials/materials-client.tsx`
- `V3_VISUAL_REFRESH_LOG.md`

#### Changes

- **Home feature cards changed from 4 to 5** and renamed to match course navigation:
  - `현황 요약`
  - `지원 인사이트`
  - `관리 및 기록`
  - `비교 참고`
  - `강의자료 분석`
- **Home feature descriptions rewritten** around AI-assisted summaries, insights, examples, and materials analysis.
- **Student summary badges differentiated**:
  - response-count badge now uses sky tone,
  - anonymous/privacy badge remains emerald,
  - course-scope badge now uses neutral slate.
- **Floating assistant trigger softened**:
  - moved closer to the lower-right corner,
  - reduced button size from 58px to 48px,
  - reduced label size and opacity.
- **Materials page semantics clarified**:
  - added visible criteria for `난이도`, `용어 밀도`, `예시 충분도`.
  - changed round feedback panel to material-relevant indicators: response count, comprehension, practice/example score.
  - removed `소통 만족도` and `속도 적절` from the visible material feedback card because they are broader class-experience metrics, not direct material-quality metrics.
  - changed `구조`, `예시`, `교수법` suggestions into expandable detail blocks.

#### Notes / Open Items

- The feedback form dimension redesign is intentionally not included here. It changes data semantics and should be handled as a separate schema/statistics migration phase.

### V2.7 — Guide Card Entry Links + Home Copy Cleanup (Codex)

Status: Complete (pending runtime visual QA)

Reason: User wanted the guide feature description cards to behave like navigational entry points, with hover affordance, and asked to remove the home copy that explained students enter through a shared feedback link.

#### Files Changed

- `src/app/page.tsx`
- `src/app/dashboard/guide/page.tsx`
- `V3_VISUAL_REFRESH_LOG.md`

#### Changes

- **Home copy removed**: deleted the sentence `학생은 교수님이 공유한 피드백 링크로 접근합니다.` from the home login area.
- **Guide feature cards made clickable**: 필수 기능 and optional-support feature cards now use `Link` and show a `기능 위치로 이동 →` cue.
- **Hover affordance added**: clickable guide cards now lift slightly, shift to a pale blue background, strengthen the blue border, and expose a focus ring for keyboard access.
- **Global route limitation documented**: because `/dashboard/guide` is not inside a specific course route and has no `courseId`, course-specific feature cards route to `/dashboard` first. The professor selects a course there, then uses the relevant course-level tab.
- **Initial caution-card decision**: 주의사항 cards were left non-clickable in this pass, then changed in V2.8 after user clarification.

### V2.8 — Guide Caution Links, Global AI Caveat Visibility, Tone Layout, Overview Sidebar Balance (Codex)

Status: Complete (pending runtime visual QA)

Reason: User clarified that caution guide cards should also navigate, the AI caveat should be visible across professor dashboard pages, the tone page felt too narrow/left-biased, the overview sidebar felt empty at the bottom, and the floating AI assistant trigger was too small/too close to the corner.

#### Files Changed

- `src/app/dashboard/guide/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/tone/page.tsx`
- `src/app/dashboard/tone/tone-client.tsx`
- `src/app/dashboard/course/[courseId]/page.tsx`
- `src/app/dashboard/course/[courseId]/chat-side-panel.tsx`
- `V3_VISUAL_REFRESH_LOG.md`

#### Changes

- **Guide caution cards made clickable**: `주의해서 봐야 하는 기능` cards now use the same clickable card behavior and `기능 위치로 이동 →` cue as the other guide cards.
- **AI caveat visibility improved**: global dashboard AI notice now appears from `lg` screens upward, with stronger opacity and padding reserved at the bottom of dashboard content.
- **Tone page rebalanced**: tone correction page now uses the same centered, wide V3-style header panel as other dashboard pages instead of a narrow left-aligned block.
- **Tone tool widened**: `ToneClient` no longer caps itself at `max-w-3xl`; input and result cards can use the available dashboard width.
- **Overview sidebar bottom filled**: added a compact `해석 안내` card with an AI/statistics caution and a link to the guide page.
- **Floating assistant trigger adjusted**: moved inward from the corner and increased from `48px` to `56px`, with a slightly stronger label and hover lift.

### V2.9 — Dashboard Energy Pass + Larger Assistant Trigger (Codex)

Status: Complete (pending runtime visual QA)

Reason: User felt the dashboard still looked too plain and asked for the floating assistant icon/text to be larger before moving on to feedback-question redesign.

#### Files Changed

- `src/app/dashboard/page.tsx`
- `src/app/dashboard/semester-selector.tsx`
- `src/app/dashboard/course/[courseId]/chat-side-panel.tsx`
- `V3_VISUAL_REFRESH_LOG.md`

#### Changes

- **Floating assistant trigger enlarged again**: button increased from `56px` to `64px`, label text increased to `text-sm`, button moved slightly inward, and hover lift/shadow strengthened.
- **Dashboard course list restyled**: replaced the plain `내 강의` header with a V3-style summary panel containing visible course count, feedback count, and current semester context.
- **Course cards made more active**: cards now have a blue top rail, stronger navy titles, larger feedback numbers, anonymous-aggregation badge, arrow affordance, and hover lift.
- **Locked demo course cards softened**: disabled cards now use dashed borders and muted slate styling rather than old gray shadcn card styling.
- **Semester selector refreshed**: semester filter pills now match the V3 blue-white system, with gradient active state and hover motion.

### V2.10 — Subtle Fixed Notices (Codex)

Status: Complete (pending runtime visual QA)

Reason: User wanted the AI caveat and floating assistant trigger to stay present but less visually dominant, becoming clearer only on hover/focus. User also requested the AI caveat to occupy one line.

#### Files Changed

- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/course/[courseId]/chat-side-panel.tsx`
- `V3_VISUAL_REFRESH_LOG.md`

#### Changes

- **Global AI caveat softened**: default opacity reduced and hover/focus restores opacity.
- **Global AI caveat compressed and resized**: changed to a one-line pill with shorter wording and `whitespace-nowrap`, then enlarged to a more visible `15px` label with larger padding while keeping low default opacity.
- **Floating assistant softened**: default opacity reduced and hover/focus restores full visibility.

## Phase V2: Course Subpage Extension

Status: started

Notes:

- V2.1 applied the first visual extension pass to all 4 non-overview course subpages.

## Phase V3: Optional Wider App Pass

Status: optional / not started

Notes:

- Not part of the immediate task.

### V2.11 — Guide Links + Visual Label Hotfix (Codex)

Status: Complete

Reason: User found several polish issues after deployment: duplicated prediction labels, guide cards routing to `/dashboard`, and material-analysis pedagogy color not matching the requested semantics.

#### Files Changed

- `src/app/dashboard/guide/page.tsx`
- `src/app/dashboard/course/[courseId]/trend-analysis.tsx`
- `src/app/dashboard/course/[courseId]/materials/materials-client.tsx`
- `V3_VISUAL_REFRESH_LOG.md`

#### Changes

- **Guide cards now route to actual feature pages**: guide page resolves the current professor's first available course and sends each card to the correct course-level destination (`overview`, `analysis`, `management`, `benchmark`, `materials`, or `tone`) instead of sending everything to `/dashboard`.
- **Prediction label duplication fixed**: trend chart predicted column now labels the x-axis as `다음 주차` and keeps only one `예측` badge.
- **Material-analysis pedagogy color fixed**: `교수법` detail block now uses purple border/text.
- **Guide copy updated**: additional feedback link is described as a course-wide anonymous written feedback path, not a regular weekly evaluation.
- Verification: `npm run lint`, `npx tsc --noEmit`, `npm run build` passed.

### V2.12 — Material Labels + Management Defaults (Codex)

Status: Complete

Reason: User found that management opened 1주차 by default, material-analysis labels were unclear, and recent comments looked repetitive in multiple screens.

#### Files Changed

- `src/app/dashboard/course/[courseId]/round-manager.tsx`
- `src/app/dashboard/course/[courseId]/materials/materials-client.tsx`
- `src/app/dashboard/course/[courseId]/round-reports.tsx`
- `src/app/dashboard/course/[courseId]/token-manager.tsx`
- `src/app/dashboard/course/[courseId]/management/page.tsx`
- `src/app/actions/analyze-material.ts`
- `src/app/actions/tokens.ts`
- `src/app/page.tsx`
- `src/app/dashboard/guide/page.tsx`
- `src/lib/demo-ai-fixtures.ts`
- `prisma/enrich-demo-database.ts`
- `V3_VISUAL_REFRESH_LOG.md`

#### Changes

- **Round manager default detail**: opens the active/current round first, then overlapping/pending/recent rounds, instead of always opening the first week.
- **Material metric clarity**: `용어 밀도` renamed/explained as `전문 용어 밀도`; added criteria text explaining that high density means many new terms/abbreviations appear close together and may need a glossary or midpoint summary.
- **Material metric colors**: difficulty, professional-term density, and example sufficiency now use differentiated semantic color cards instead of all-gray/default badges.
- **Example sufficiency copy**: normalized `보완 가능/부족` into `보완 필요` where appropriate, so the label reads as an actionable support cue.
- **Additional feedback visibility**: management's additional-feedback link card now shows recently submitted course-wide additional feedbacks from `roundId: null`.
- **Demo comment diversity**: database demo seeding now uses week-specific positive/difficulty comment pools so Overview comments, Management recent comments, round reports, and AI context sample different student voices.
- **Demo additional feedback data**: seed enrichment creates course-wide additional-feedback rows so the additional feedback area has visible demo data.
