# Course Detail Restructure Log

This file records what Claude Code actually did during each phase.

Implementation authority is `COURSE_DETAIL_RESTRUCTURE_PLAN.md`.

Do not use `Codex_feedback.md` or `Gemini_feedback.md` as implementation specs.

## Reporting Rules

At the end of every phase, append or update the relevant section with:

- Phase name
- Status
- Files inspected
- Files changed
- Summary of work
- Validation performed
- Remaining work
- Risks / questions

## Phase 0 - Structure Audit And Implementation Plan

Status: Complete (planning only)

### Files Inspected

- `src/app/dashboard/layout.tsx` (global nav + auth redirect)
- `src/app/dashboard/course/[courseId]/page.tsx` (overview/main, 332 lines)
- `src/app/dashboard/course/[courseId]/analysis-tabs.tsx` (3-tab client container)
- `src/app/dashboard/course/[courseId]/feedback-analysis.tsx` (526 lines, AI summary + comments)
- `src/app/dashboard/course/[courseId]/radar-chart.tsx`
- `src/app/dashboard/course/[courseId]/trend-analysis.tsx`
- `src/app/dashboard/course/[courseId]/cause-analysis.tsx`
- `src/app/dashboard/course/[courseId]/improvement-roadmap.tsx`
- `src/app/dashboard/course/[courseId]/benchmark.tsx`
- `src/app/dashboard/course/[courseId]/improvement-cases.tsx`
- `src/app/dashboard/course/[courseId]/round-manager.tsx`
- `src/app/dashboard/course/[courseId]/round-reports.tsx` (638 lines, checklist lives here)
- `src/app/dashboard/course/[courseId]/token-manager.tsx`
- `src/app/dashboard/course/[courseId]/chat-side-panel.tsx`
- `src/app/dashboard/course/[courseId]/ai-chat.tsx`
- `src/app/dashboard/course/[courseId]/use-ai-chat.ts`
- `src/app/dashboard/course/[courseId]/materials/page.tsx`
- `src/lib/feedback-stats.ts`

### Files Changed

- None. Phase 0 is planning only.

### No-Code-Change Confirmation

- Confirmed: no application source files were edited during Phase 0. Only this log file was written.

### Current Course-Detail File Map

Server entry points (Server Components, `dynamic = "force-dynamic"`):

- `page.tsx` — overview/main. Does auth + ownership, computes stats, fires 6 parallel fetches, renders KPI + `AnalysisTabs` (3 tabs) + right sidebar + `ChatSidePanel`.
- `materials/page.tsx` — separate route. Independent auth + ownership + own data fetch + own `<h1>`.

Client components rendered inside the main page:

| File | Role | Where rendered today |
|------|------|----------------------|
| `analysis-tabs.tsx` | 3-tab shell (feedback / deep / compare) | LEFT column |
| `feedback-analysis.tsx` (+ `radar-chart.tsx`) | KPI detail, radar, 3-axis bars, AI 한줄평, comments | Tab1 (feedback) |
| `trend-analysis.tsx` | weekly trend SVG + AI narrative | Tab1 (feedback) |
| `cause-analysis.tsx` | feedback↔material cause analysis (on-demand) | Tab2 (deep) |
| `improvement-roadmap.tsx` | AI improvement roadmap (on-demand) | Tab2 (deep) |
| `benchmark.tsx` | benchmark comparison (prop-driven) | Tab3 (compare) |
| `improvement-cases.tsx` | improvement cases (prop-driven) | Tab3 (compare) |
| `round-manager.tsx` | create/delete rounds | RIGHT sidebar |
| `token-manager.tsx` | issue tokens / stats | RIGHT sidebar |
| `round-reports.tsx` | closed-round reports + **per-round checklist** + note prompt | RIGHT sidebar |
| `chat-side-panel.tsx` (+ `ai-chat.tsx`, `use-ai-chat.ts`) | floating AI chat drawer | page-level floating |

Materials link: a single `<Link href=".../materials">강의자료 분석</Link>` button in the page header (page.tsx:230).

### Current Data-Fetching Map

All fetched in `page.tsx`:

| Data | Source | Consumed by | Needed by future page |
|------|--------|-------------|------------------------|
| `course` (+ feedbacks, professor.name, feedbackRounds.endDate) | `prisma.course.findUnique` | KPI, radar, comments, header, summary trigger | **현황 요약** (header also needed by all via layout) |
| `computeFeedbackCounts(course.feedbacks)` | `src/lib/feedback-stats.ts` | KPI, radar, chat suggestions, myStats | **현황 요약** + **비교 참고** (myStats) |
| `getBenchmark(courseId)` | action | Tab3 benchmark **and** Tab1 radar overlay (`categoryRadarAxes`, `categoryName`) | **비교 참고** (primary) + **현황 요약** (overlay only) ⚠️ |
| `getImprovementCases(courseId)` | action | Tab3 cases | **비교 참고** |
| `lectureMaterial.count(analysis≠null)` | prisma | Tab2 `CauseAnalysis hasMaterials` | **지원 인사이트** |
| `getRounds(courseId)` | action | `RoundManager` **and** `FeedbackAnalysis` round filter | **관리 및 기록** (RoundManager) + **현황 요약** (filter) |
| `getRoundReports(courseId)` | action | `RoundReports` **and** `TrendAnalysis` (`roundReports.rounds`) | **관리 및 기록** (reports) + **현황 요약** (trend, if kept) |
| `getTokenStats(courseId)` | action | `TokenManager` | **관리 및 기록** |
| `triggerSummaryIfNeeded`, `triggerMaterialReanalysisIfNeeded` | action (fire-and-forget) | background pre-compute | **현황 요약** (overview is the natural trigger point) |

Duplicate/expensive fetch flags:

- ⚠️ **`getBenchmark` is shared by two future pages.** Tab1 radar uses only `categoryRadarAxes` + `categoryName` for an optional overlay; 비교 참고 uses the full payload. After split, 현황 요약 either (a) calls `getBenchmark` just for the overlay, or (b) drops the overlay. **Open question — recommend (a) only if overlay is kept, else (b).**
- ⚠️ **`getRounds` and `getRoundReports` each feed two future pages.** Both are cheap relative to value; acceptable to fetch independently per page. No shared-fetch dedupe needed unless we add a layout-level fetch.
- ✅ `computeFeedbackCounts` is pure (no DB) — safe to recompute per page from `course.feedbacks`.

### Component Relocation Plan

| Component | Target page | Notes |
|-----------|-------------|-------|
| `FeedbackAnalysis` (+ `radar-chart`) | 현황 요약 | core of overview |
| `TrendAnalysis` | 현황 요약 | "lightweight trend" per plan; keep if it stays light, else move to 지원 인사이트 (open question) |
| KPI cards (`KpiCard` helper in page.tsx) | 현황 요약 | stays inline or extract |
| `CauseAnalysis` | 지원 인사이트 | on-demand client; needs `materialCount` + feedback≥3 gate |
| `ImprovementRoadmapPanel` | 지원 인사이트 | on-demand client; feedback≥3 gate |
| **current** checklist entry | 지원 인사이트 | ⚠️ checklist currently lives *inside* `round-reports.tsx` per-round. See risk. |
| `ChatSidePanel` | layout-level (recommended) or 지원 인사이트 | see Shared Layout Plan |
| `RoundManager` | 관리 및 기록 | top (operations) |
| `TokenManager` | 관리 및 기록 | top (operations) |
| `RoundReports` (+ **past** checklist records, note prompt) | 관리 및 기록 | bottom (history) |
| `Benchmark` | 비교 참고 | prop-driven; page fetches `getBenchmark` |
| `ImprovementCases` | 비교 참고 | prop-driven; needs `myStats` from `computeFeedbackCounts` |

### Shared Layout Plan

**Recommendation: introduce `src/app/dashboard/course/[courseId]/layout.tsx`.**

It would own:

- Course header (title, professor, semester) — fetched once
- Course-level navigation (현황 요약 / 지원 인사이트 / 관리 및 기록 / 비교 참고) using `usePathname` in a small client nav child for active state
- One ownership/auth check for the whole subtree
- Optionally the single `ChatSidePanel` mount, so chat + its localStorage history is consistent on every course page and never double-mounted

Caveats:

- Next.js fetches `layout.tsx` and `page.tsx` independently. If both query `prisma.course.findUnique`, that is 2 queries. **Wrap the course-by-id fetch in React `cache()`** (e.g. a `getOwnedCourse(courseId, userId)` helper) so layout + page dedupe within a request.
- `materials/` is nested under `[courseId]/`, so it would automatically inherit this layout. That is acceptable and gives materials the same header/nav. In a later phase, `materials/page.tsx` should drop its own `<h1>{course.name}</h1>` to avoid a duplicate header. Materials is not one of the 4 nav items; either show no active item or add a subtle "자료실" shortcut (sidebar plan already wants this).
- `ChatSidePanel` suggestions (`buildChatSuggestions`) depend on stats. If chat is mounted in the layout, the layout needs light stats. Options: compute minimal counts in the layout (cheap), or pass `suggestions` only on 현황 요약 and a generic set elsewhere. **Open question.**

Alternative (lower effort): a shared `CourseHeader` + `CourseNav` component imported by each page instead of a nested layout. Works but repeats the ownership fetch and re-mounts chat per page. **Nested layout is preferred.**

### Sidebar Plan

Keep (slim, status-oriented) — on 현황 요약 only:

- Current active round status (derive from `getRounds` / `round-utils`)
- Response summary (total + response rate, already computed)
- Shortcut to 자료실 (materials)
- "학생 의견에 대해 질문하기" button → opens the chat drawer

Move out of the sidebar:

- `RoundManager` → 관리 및 기록
- `TokenManager` → 관리 및 기록
- `RoundReports` (full) → 관리 및 기록

The current `xl:grid-cols-[1fr_380px]` two-column layout on the overview becomes: main overview content + slim status sidebar (or no sidebar if the status items fit inline). Management page uses the plan's vertical flow (operations on top, history below), not a forced 1fr/380px split.

### Risks / Questions

1. **Dynamic route typing** — pages use `PageProps<"/dashboard/course/[courseId]">` (typed routes). New routes need matching literals: `PageProps<"/dashboard/course/[courseId]/analysis">`, `.../management`, `.../benchmark`. These types are generated by Next typed-routes; the new folders must exist before the types resolve. Low risk, but build/typecheck must run after route creation.
2. **Data duplication** — `getBenchmark`, `getRounds`, `getRoundReports` will be called from more than one page. Acceptable; mitigate header fetch via `cache()`.
3. **Auth / ownership** — every new page must keep `where: { id: courseId, professorId: session.user.id }` + the demo-visibility check (`isDemoUser && !isDemoVisibleCourse`). Recommend a shared helper `getOwnedCourse(courseId)` (auth + ownership + demo check + `notFound()`), reused by layout and all pages. Must NOT weaken checks — helper enforces the same conditions.
4. **Chat drawer feasibility** — `ChatSidePanel` is already a self-contained fixed-position drawer with its own toggle; relocating it (or hoisting to layout) is low risk. Risk: mounting it on two pages simultaneously would create duplicate floating buttons and two histories writing the same localStorage key. Mount it exactly once (layout-level recommended).
5. **Checklist relocation** — ⚠️ highest-friction item. The checklist generator + checked-state currently lives **inside `round-reports.tsx`** (per closed round). The plan splits this: "current checklist entry" → 지원 인사이트, but "past checklist records" + `RoundReports` → 관리 및 기록. This requires either (a) extracting the checklist sub-component so it can be referenced from both pages, or (b) keeping checklist entirely in 관리 및 기록 and putting only a *link* to it from 지원 인사이트. **Open question — recommend (b) for Phase 2 to avoid splitting one component across two routes; revisit if UX requires (a).**
6. **`/materials` route** — must keep working. Inheriting the new layout changes its chrome (gains header/nav). If we prefer materials to stay visually separate, do not place the header rendering in a way that conflicts; reconcile the duplicate `<h1>` in Phase 2. Low risk, cosmetic.
7. **Client state reset after route separation** — switching "tabs" becomes real navigation, so `useState`-only state resets:
   - AI chat history → **safe** (localStorage `ai-chat:{courseId}`); streaming aborts cleanly on unmount.
   - Checklist checked items / notes / dismissed → **safe** (localStorage `checklist-done-*`, `lsKey`).
   - Checklist *generated content* → **lost** on nav (useState only) → regenerates. Acceptable; note to user.
   - Comment AI summary in `FeedbackAnalysis` → **lost** on nav (useState) → re-fetches. On overview (default landing) so impact low.
   - AI radar 한줄평 → server-cached via `aiSummaryCache` (DB) → **safe**, cheap refetch.
   - Token `generatedLinks` → **lost** on nav (useState). Fine because TokenManager will live on its own page; advise copying before leaving.
   - `RoundManager` local `rounds` state → each page refetches server-side, so cross-page staleness actually *improves* (today, creating a round in the sidebar does not refresh the left column until reload). No component uses `router.refresh()`/`revalidatePath` in this subtree; only `token-manager` touches `window.location` (origin string only).
8. **Shared statistics / utility duplication** — `computeFeedbackCounts` / `getStatsForCourses` already centralized in `src/lib/feedback-stats.ts`. Keep KPI/radar math derived from `computeFeedbackCounts` in every page; do **not** re-implement counting inline. The radar-axis assembly and ratio math currently inline in `page.tsx` (lines 168–197) should be extracted to a shared helper (e.g. `src/lib/course-overview-stats.ts`) so 현황 요약 and 비교 참고 (myStats) stay consistent.

### Additional Phase 0 Checks

#### Shared Client State Risks

See Risk #7 above. Summary: localStorage-backed state (chat history, checklist checks/notes) survives navigation; useState-only state (generated checklist body, comment summary, token links, in-flight streaming) resets on navigation and must be re-triggered. No global/shared client store exists across the current tabs — each component owns its own state — so route separation does not break cross-component communication (there is none today).

#### Nested Layout Feasibility

Recommended: add `[courseId]/layout.tsx` owning header + course-level nav + single ChatSidePanel, with a `cache()`-wrapped `getOwnedCourse` to avoid double DB hits. Materials inherits it (reconcile duplicate header in Phase 2). Do not implement in Phase 0.

#### Auth And Ownership Checks

Current pattern (identical in `page.tsx` and `materials/page.tsx`):
`auth()` → `notFound()` if no session → `prisma.course.findUnique({ where: { id, professorId } })` → `notFound()` if missing → demo-visibility guard. Recommend extracting to `getOwnedCourse(courseId, { include })` so all 4 new pages + layout share one enforced check. New pages must each still fetch with the ownership `where` (defense in depth). No weakening.

#### Shared Statistics Utilities

`src/lib/feedback-stats.ts` (`computeFeedbackCounts`, `getStatsForCourses`, `getStatsPerCourse`) stays the source of truth. Extract the inline radar/ratio assembly from `page.tsx` into a shared helper for reuse by 현황 요약 and 비교 참고. Avoid duplicating ratio math.

#### Phase 2 Sequencing Plan

Page-by-page, validate each before next. Updated after Gemini/Codex review: build destination pages first, then clean overview.

1. **관리 및 기록** (new `management/page.tsx`): add `RoundManager`, `TokenManager`, `RoundReports` (vertical flow). Keep the old overview/sidebar copy during this step. *Validate:* page renders, create/delete round works, token issue works, reports render, checklist remains inside `RoundReports`, demo-account write-block still enforced.
2. **비교 참고** (new `benchmark/page.tsx`): add `Benchmark`, `ImprovementCases` with `myStats`. Keep the old comparison tab during this step. *Validate:* benchmark numbers match prior tab, cases render.
3. **지원 인사이트** (new `analysis/page.tsx`): add `CauseAnalysis`, `ImprovementRoadmapPanel`, and if needed link to checklist in 관리 및 기록. Do not extract checklist logic unless explicitly approved. *Validate:* feedback>=3 gate, on-demand actions return, chat remains mounted once.
4. **현황 요약 정리** (reduce existing `page.tsx`): after target pages work, remove the tab shell and duplicate management/sidebar access. Keep KPI + `FeedbackAnalysis` + light `TrendAnalysis`. *Validate:* page renders, KPI/radar/comments correct, no dangling imports, build passes.

Temporary bridging: during each step, leave the component mounted on the old overview until its new page is validated, then remove from overview in the cleanup step — **except `ChatSidePanel`**, which must never be double-mounted.

### Recommended Phase 1 File Changes

Phase 1 = route skeleton + course-level nav only, minimal feature movement. Proposed (NOT yet executed — awaiting approval):

Create:

- `src/app/dashboard/course/[courseId]/layout.tsx` — course header + `<CourseNav/>` + single `ChatSidePanel`; uses `getOwnedCourse`.
- `src/app/dashboard/course/[courseId]/course-nav.tsx` — `"use client"` nav with `usePathname` active state (4 links + optional 자료실).
- `src/app/dashboard/course/[courseId]/analysis/page.tsx` — placeholder shell (ownership + heading).
- `src/app/dashboard/course/[courseId]/management/page.tsx` — placeholder shell.
- `src/app/dashboard/course/[courseId]/benchmark/page.tsx` — placeholder shell.
- `src/lib/course-access.ts` — `getOwnedCourse()` helper (auth + ownership + demo guard), `cache()`-wrapped.

Edit:

- `src/app/dashboard/course/[courseId]/page.tsx` — only to drop the now-duplicated header (moves to layout) and the floating `ChatSidePanel` (moves to layout). No feature relocation yet.
- `materials/page.tsx` — none in Phase 1 (header reconciliation deferred to Phase 2/3).

Do not start Phase 1 until approved.

### Open Questions (for approval before Phase 1)

1. Keep `TrendAnalysis` on 현황 요약 (lightweight) or move to 지원 인사이트?
2. Keep the benchmark radar overlay on 현황 요약 (requires `getBenchmark` on overview) or drop it there?
3. Checklist: link from 지원 인사이트 to the full checklist in 관리 및 기록 (recommended), or extract checklist into a shared component used by both?
4. Mount `ChatSidePanel` in the layout (recommended, single instance everywhere) — confirm acceptable that chat is reachable from all 4 course pages.

### Phase 1 Approval Decisions

Answered before Phase 1:

1. `TrendAnalysis`
   - Keep it on `현황 요약` for now.
   - Place it low on the overview page.
   - If it becomes visually heavy, make it collapsible in a later phase.

2. Benchmark radar overlay
   - Drop benchmark/category overlay from `현황 요약`.
   - Keep overview focused on current-course data.
   - Fetch benchmark data primarily on `비교 참고`.

3. Checklist
   - Do not extract or split checklist logic in Phase 1.
   - Keep checklist body with `RoundReports` for now.
   - `지원 인사이트` may link to `관리 및 기록` for checklist access in a later phase.

4. `ChatSidePanel`
   - Approved to mount once in `[courseId]/layout.tsx`.
   - Do not double-mount chat on individual pages.
   - Full drawer redesign can wait; preserve existing chat functionality first.

## Phase 1 - Route Skeleton And Course-Level Navigation

Status: Complete

### Files Inspected

- `src/app/dashboard/course/[courseId]/page.tsx` (current overview)
- `src/app/dashboard/course/[courseId]/chat-side-panel.tsx` (single-mount target)
- `src/app/dashboard/course/[courseId]/materials/page.tsx` (layout inheritance check)
- `src/app/dashboard/layout.tsx` (parent chrome — confirmed it owns max-w/padding so course layout must not re-add it)
- `src/lib/feedback-stats.ts`, `src/lib/auth-utils.ts`, `src/lib/constants.ts` (helper reuse)

### Files Changed

Created:

- `src/lib/course-access.ts` — `getOwnedCourse(courseId)`: `cache()`-wrapped auth + ownership + demo-visibility guard, returns course with `professor.name`, `feedbacks`, `feedbackRounds.endDate` (matches overview's prior include for dedupe).
- `src/app/dashboard/course/[courseId]/layout.tsx` — nested layout: course header (title/professor/semester) + materials link + `<CourseNav>` + single `<ChatSidePanel>` mount. `buildChatSuggestions` moved here.
- `src/app/dashboard/course/[courseId]/course-nav.tsx` — `"use client"` course-level nav, `usePathname` active state (bold + bottom border), 4 items.
- `src/app/dashboard/course/[courseId]/analysis/page.tsx` — placeholder, ownership-gated.
- `src/app/dashboard/course/[courseId]/management/page.tsx` — placeholder, ownership-gated.
- `src/app/dashboard/course/[courseId]/benchmark/page.tsx` — placeholder, ownership-gated.

Edited:

- `src/app/dashboard/course/[courseId]/page.tsx` — replaced inline auth/findUnique/demo block with `getOwnedCourse`; removed the page header (moved to layout); removed the page-level `ChatSidePanel` + `buildChatSuggestions` (moved to layout); removed the benchmark radar overlay props (`categoryRadarAxes`, `categoryName`) per Decision 2; pruned now-unused imports (`Link`, `Button`, `auth`, `notFound`, `ChatSidePanel`, `isDemoUser`, `isDemoVisibleCourse`, the 3 chat-threshold constants).

NOT changed by Phase 1 (out of scope, left as-is): `RoundManager`, `TokenManager`, `RoundReports`, checklist logic, AI chat UI internals, `materials/`, tone correction.

### Summary of Work

Introduced the route skeleton and a shared course-level shell without relocating features. The nested layout now owns the course header + course-level navigation + a single chat mount, so all four course routes share identical chrome. The overview page kept all its existing content (KPI, 3-tab analysis with Benchmark/Cause/Roadmap/Cases still in place, management sidebar) — only the duplicated header/chat and the radar overlay were removed. Auth/ownership/demo checks are now centralized in `getOwnedCourse` and reused by the layout, overview, and all three placeholders; the overview's call dedupes with the layout's via `cache()`.

Decisions applied: (1) `TrendAnalysis` stays on overview (unchanged, low in feedback tab); (2) benchmark radar overlay removed from overview; (3) checklist NOT extracted (stays in `RoundReports`); (4) `ChatSidePanel` single-mounted in layout.

### Routes Created

- `/dashboard/course/[courseId]` — overview (existing, trimmed)
- `/dashboard/course/[courseId]/analysis` — placeholder (지원 인사이트)
- `/dashboard/course/[courseId]/management` — placeholder (관리 및 기록)
- `/dashboard/course/[courseId]/benchmark` — placeholder (비교 참고)
- `/dashboard/course/[courseId]/materials` — unchanged, still works

### Validation Performed

- `npm run lint` (eslint) → clean, no errors/warnings.
- `npx tsc --noEmit` → exit 0, no type errors (typed routes `PageProps`/layout params resolved).
- `npm run build` was intentionally NOT run: the user's `npm run dev` may be holding `.next`, and a concurrent `next build` risks corrupting it. Lint + full typecheck were run instead per the plan's fallback. Recommend a clean `npm run build` when the dev server is stopped.
- Route presence verified at code level: all 5 `page.tsx`/`layout.tsx` files confirmed via `find`.

### Placeholder Pages

`analysis`, `management`, `benchmark` render a dashed-border card with a short "Phase 2 예정" message. Each calls `getOwnedCourse(courseId)` first so access control is already enforced before any feature lands there.

### Materials / Duplicate Header Notes

- The nested layout wraps `materials/` too, so the materials route now shows the layout's course header + course-nav AND its own `<h1>{course.name}</h1>` ("강의자료 분석"). This is a **known duplicate-header caveat** to reconcile in Phase 2/3 (likely drop the materials page's own `<h1>`). Left intentionally untouched in Phase 1.
- `course-nav` has no item for materials, so on the materials route no nav item is active (overview uses exact-match). Acceptable; a "자료실" shortcut can be added later per the sidebar plan.
- The layout calls `getOwnedCourse` (which includes `feedbacks`) on every course route, including materials, just to build chat suggestions — a minor over-fetch on non-overview routes. Acceptable for Phase 1; can be narrowed in Phase 3 if needed.

### Remaining Work For Phase 2

Page-by-page relocation (validate each before next):

1. 관리 및 기록 — add `RoundManager` + `TokenManager` + `RoundReports` to `/management` first; keep overview/sidebar duplicate until verified.
2. 비교 참고 — add `Benchmark` + `ImprovementCases` to `/benchmark`; keep old comparison tab until verified.
3. 지원 인사이트 — add `CauseAnalysis` + `ImprovementRoadmapPanel`; link to checklist in 관리 및 기록 if needed.
4. 현황 요약 정리 — strip the 3-tab shell + duplicate management sidebar from overview after target pages work.

During each step, keep the component on the overview until its new home validates, then remove during the cleanup step — chat is already non-duplicated (layout-mounted).

### Risks / Questions

- **Out-of-scope working-tree changes (pre-existing, NOT from Phase 1):** `src/app/page.tsx` (landing redesign from an earlier task) and `package-lock.json` (engines field from an earlier `npm install`) show as modified. Phase 1 did not touch either. Flagging so they are not attributed to this phase.
- `next build` not executed (see Validation). Low risk given lint + tsc are clean, but a full build is the definitive check.
- Duplicate header on materials route (see above) — cosmetic, deferred.
- No functional/runtime smoke test performed (dev server not driven by this phase). Recommend manually visiting the 5 routes once dev is up.

## Phase 2 - Feature Relocation

Status: Not started

### Phase 2-1 - 관리 및 기록

Status: Complete

#### Files Changed

- `src/app/dashboard/course/[courseId]/management/page.tsx` — replaced the Phase 1 placeholder with a real 관리 및 기록 page.
- No other files changed. Overview (`page.tsx`), layout, and all component sources untouched.

#### Summary of Management Page Implementation

`/dashboard/course/[courseId]/management` now renders a real management page. Flow is vertical with two sections:

- **운영 도구 (top)** — `RoundManager` + `TokenManager` in a `grid-cols-1 xl:grid-cols-2` (2-column only on wide screens, `items-start`).
- **주차별 기록 (bottom)** — `RoundReports` rendered full width (not placed in a narrow side column, per plan).

Each section has a short heading + caption. Ownership is gated by `getOwnedCourse(courseId)` before any data fetch (dedupes with the layout's call via `cache()`). Component props mirror the overview exactly: `RoundManager initialRounds`, `TokenManager initialStats`, `RoundReports data`.

#### Components Added To Management Page

- `RoundManager` (from `../round-manager`)
- `TokenManager` (from `../token-manager`)
- `RoundReports` (from `../round-reports`) — checklist NOT extracted; it stays inside `RoundReports` as required.

#### Data Fetches Added To Management Page

- `getRounds(courseId)`
- `getTokenStats(courseId)`
- `getRoundReports(courseId)`

Fetched together in one `Promise.all`. Each action carries its own auth/ownership check internally; the page also runs `getOwnedCourse` first.

#### Overview Access Preservation

- Overview (`/dashboard/course/[courseId]`) was NOT modified this phase. It still renders `RoundManager`, `TokenManager`, and `RoundReports` in its right sidebar (verified: 8 references remain in `page.tsx`). Existing access path is fully preserved.

#### Duplicate-Access Note

- `RoundManager` / `TokenManager` / `RoundReports` now appear in **two** places: the overview sidebar AND the new management page. This duplication is **intentional and temporary** — it lets us validate the management page without breaking the existing entry point. Cleanup (removing them from the overview sidebar) is deferred to a later phase, after all Phase 2 pages are validated.

#### Validation Performed

- `npm run lint` (eslint) → clean.
- `npx tsc --noEmit` → exit 0, no type errors.
- `npm run build` NOT run (dev server may hold `.next`; lint + tsc used per plan).
- Code-level checks:
  - `/management` route renders the real page with all 3 components (grep-confirmed lines 36/37/49).
  - Overview retains the 3 management components (grep-confirmed).
  - `ChatSidePanel` single-mounted in layout only (layout has it, `page.tsx` has 0).
  - Component source files intact (`round-manager`, `token-manager`, `round-reports`, `materials/page` all present).
  - `materials` route untouched and accessible.
  - AI chat label unchanged ("AI 강의 어시스턴트"); no forbidden renames ("학생 의견에 대해 질문하기" / "학생별로 질문하기") present.

#### Remaining Work For Phase 2-2 - 비교 참고

- Implement `/dashboard/course/[courseId]/benchmark` as the real 비교 참고 page.
- Place `Benchmark` + `ImprovementCases`; fetch `getBenchmark(courseId)` + `getImprovementCases(courseId)`.
- `ImprovementCases` needs `myStats` (communicationAvg / speedModerateRatio / comprehensionHighRatio) derived from `computeFeedbackCounts(course.feedbacks)` — `course` already available via `getOwnedCourse`.
- Keep overview's compare tab in place (same intentional-duplication approach until validated).

#### Risks / Questions

- Management page over-fetch: layout already calls `getOwnedCourse` (with feedbacks) for chat suggestions; the management page does not need feedbacks but the cached course carries them. Negligible cost; no action.
- Duplicate management UI live in two routes until cleanup phase — if a demo walkthrough touches both, behavior is identical (same components/actions), so no functional risk, only redundancy.
- `next build` still not exercised this phase; recommend one clean build before final submission.
- No runtime smoke test driven by this phase; recommend manually visiting `/management` once dev is up to confirm round create/delete, token issue, and report rendering.

### Phase 2-2 - 비교 참고

Status: Complete

#### Files Changed

- `src/app/dashboard/course/[courseId]/benchmark/page.tsx` — replaced the Phase 1 placeholder with a real 비교 참고 page.
- No other files changed. Overview, management, layout, and all component sources untouched.

#### Summary of Benchmark Page Implementation

`/dashboard/course/[courseId]/benchmark` now renders a real 비교 참고 page in a vertical flow:

1. Title `비교 참고` + description `유사 강의 경향과 익명 사례를 참고용으로 확인합니다.`
2. `Benchmark` (full width)
3. `ImprovementCases` (full width)

Section spacing is `space-y-10` (generous, per plan). `Benchmark` and `ImprovementCases` are NOT forced into 2 columns — both need full width for their comparison/detail content. Ownership is gated by `getOwnedCourse(courseId)` first (dedupes with layout via `cache()`).

#### Components Added To Benchmark Page

- `Benchmark` (from `../benchmark`) — note: `[courseId]/benchmark.tsx` (component) and `[courseId]/benchmark/` (route dir) share a name; `../benchmark` resolves to the component file (file-before-directory resolution), confirmed by `tsc --noEmit` exit 0.
- `ImprovementCases` (from `../improvement-cases`)

Props preserved exactly as in overview: `Benchmark data={benchmarkData}`, `ImprovementCases cases={improvementCases} myStats={...}`.

#### Data Fetches Added To Benchmark Page

- `getOwnedCourse(courseId)` — gate + `course.feedbacks` for myStats
- `getBenchmark(courseId)` — `Promise.all`
- `getImprovementCases(courseId)` — `Promise.all`

#### MyStats Calculation Summary

Computed from `computeFeedbackCounts(course.feedbacks)`, identical formula to overview `page.tsx` (total === 0 → each value 0):

- `communicationAvg = total > 0 ? Math.round((commSum / total) * 10) / 10 : 0`
- `speedModerateRatio = total > 0 ? Math.round((speedCounts.moderate / total) * 100) : 0`
- `comprehensionHighRatio = total > 0 ? Math.round((compCounts.high / total) * 100) : 0`

#### Overview Comparison-Tab Preservation

- Overview (`page.tsx`) NOT modified. Its `compareTab` still renders `Benchmark` + `ImprovementCases` (grep-confirmed lines 220/221), `AnalysisTabs` still present (2 references). `getBenchmark`/`getImprovementCases` still fetched in the overview's `Promise.all`. Existing access path fully preserved.

#### Duplicate-Access Note

- `Benchmark` and `ImprovementCases` now appear in **two** places: the overview compare tab AND the new benchmark page. This duplication is **intentional and temporary**, mirroring Phase 2-1. Cleanup (removing the compare tab / trimming `AnalysisTabs` on the overview) is deferred to a later phase after all Phase 2 pages validate.

#### Validation Performed

- `npm run lint` (eslint) → clean.
- `npx tsc --noEmit` → exit 0, no type errors (also confirms the `../benchmark` name-collision resolves to the component).
- `npm run build` NOT run (dev server may hold `.next`; lint + tsc used per plan).
- Code-level checks:
  - `/benchmark` renders real content: `Benchmark` (line 40), `ImprovementCases` (line 42), `myStats` from `computeFeedbackCounts` (lines 24–25). No longer a placeholder.
  - Overview compare tab intact; `AnalysisTabs` still present (2 refs).
  - `ChatSidePanel` single-mounted in layout only (layout 2 refs = import+mount; not added to benchmark page).
  - Management page intact; `materials` route intact; `benchmark.tsx` / `improvement-cases.tsx` sources intact.
  - Right-bottom floating chat button form unchanged (chat-side-panel.tsx untouched).

#### Remaining Work For Phase 2-3 - 지원 인사이트

- Implement `/dashboard/course/[courseId]/analysis` as the real 지원 인사이트 page.
- Place `CauseAnalysis` + `ImprovementRoadmapPanel` (both on-demand client components).
- `CauseAnalysis` needs `hasMaterials` → fetch `prisma.lectureMaterial.count({ where: { courseId, analysis: { not: null } } })`.
- Apply the feedback ≥ 3 gate (mirror overview's `deepTab`): if `totalFeedbacks < 3`, show the same guidance message instead of the panels. `totalFeedbacks` from `computeFeedbackCounts(course.feedbacks)`.
- Checklist: do NOT extract; provide an entry that links to 관리 및 기록 (`/management`) per Phase 1 Decision 3.
- Do not re-mount chat; it is already reachable via the layout (course-scoped helper text only, no rename).
- Keep overview's deep tab in place (same intentional-duplication approach until validated).

#### Risks / Questions

- Name collision `benchmark.tsx` vs `benchmark/` is resolved correctly today, but is a readability footgun. Optional future cleanup: rename the component (e.g. `benchmark-panel.tsx`) — out of scope for this phase.
- Duplicate compare UI lives in two routes until cleanup phase — identical components/actions, so no functional risk, only redundancy.
- `next build` still not exercised; recommend one clean build before final submission.
- No runtime smoke test this phase; recommend visiting `/benchmark` once dev is up to confirm benchmark numbers match the overview compare tab.

### Phase 2-3 - 지원 인사이트

Status: Complete

#### Files Changed

- `src/app/dashboard/course/[courseId]/analysis/page.tsx` — replaced the Phase 1 placeholder with a real 지원 인사이트 page.
- No other files changed. Overview, management, benchmark, layout, and all component sources untouched.

#### Summary of Analysis Page Implementation

`/dashboard/course/[courseId]/analysis` now renders a real 지원 인사이트 page in vertical flow (`space-y-10`):

1. Title `지원 인사이트` + description `필요할 때 열어보는 선택적 분석 도구입니다.`
2. Checklist / management link card → `/management` (placed near the top per PLAN/Gemini agreement).
3. Feedback-gated analysis block (see gate behavior).

Ownership gated by `getOwnedCourse(courseId)` first (dedupes with layout via `cache()`).

> Phase 2-3 correction: the link card was moved above the feedback-gate block (was previously below it), and its copy was aligned to the PLAN wording — title `수업 운영 참고 포인트`, description `회차별 리포트와 체크리스트는 관리 및 기록에서 확인합니다.`. Link target unchanged (`/dashboard/course/${courseId}/management`). Re-validated: `npm run lint` clean, `npx tsc --noEmit` exit 0. Checklist logic still NOT extracted; no other page touched.

#### Components Added To Analysis Page

- `CauseAnalysis` (from `../cause-analysis`) — `hasMaterials={materialCount > 0}`, same prop as overview.
- `ImprovementRoadmapPanel` (from `../improvement-roadmap`).

Both are on-demand client components (buttons trigger their own server actions); the page only mounts them.

#### Data Fetches Added To Analysis Page

- `getOwnedCourse(courseId)` — gate + `course.feedbacks`.
- `computeFeedbackCounts(course.feedbacks)` → `totalFeedbacks` (pure, no DB).
- `prisma.lectureMaterial.count({ where: { courseId, analysis: { not: null } } })` → `materialCount`.

#### Feedback Gate Behavior

- `totalFeedbacks >= 3` → renders `CauseAnalysis` + `ImprovementRoadmapPanel` (identical to overview `deepTab`).
- `totalFeedbacks < 3` → renders an empty-state card (dashed border, white bg) with the same guidance message used on the overview: "피드백이 3건 이상 쌓이면 원인 분석과 개선 로드맵을 확인할 수 있습니다." (overview used a bare `<p>`; here it is upgraded to a block/card per plan).

#### Checklist Link / No-Extraction Confirmation

- Checklist logic was NOT extracted. The checklist body stays inside `RoundReports` (관리 및 기록). The analysis page provides only a link card pointing to `/dashboard/course/${courseId}/management`, per Phase 1 Decision 3.

#### Temporary Checklist UX Debt Note

- "현재 체크리스트(지원 인사이트) vs 과거 기록(관리 및 기록)" split from the original plan is currently realized as a single destination: both current and past checklists live in `RoundReports` on 관리 및 기록, and 지원 인사이트 links there. This is the agreed Phase-1 decision; if later UX wants the checklist generator surfaced directly on 지원 인사이트, that requires extracting the checklist sub-component (deferred, not in scope).

#### Overview Deep-Tab Preservation

- Overview (`page.tsx`) NOT modified. Its `deepTab` still renders `CauseAnalysis` + `ImprovementRoadmapPanel` with the same `>= 3` gate (grep-confirmed lines 206/209/210); `AnalysisTabs` still present (2 references). Existing access path fully preserved.

#### Duplicate-Access Note

- `CauseAnalysis` and `ImprovementRoadmapPanel` now appear in **two** places: the overview deep tab AND the new analysis page. Intentional and temporary, mirroring 2-1/2-2. Cleanup deferred to the overview-trim phase.

#### Validation Performed

- `npm run lint` (eslint) → clean.
- `npx tsc --noEmit` → exit 0, no type errors (also confirms `../cause-analysis`, `../improvement-roadmap` resolve correctly).
- `npm run build` NOT run (dev server may hold `.next`; lint + tsc used per plan).
- Code-level checks:
  - `/analysis` renders real content: gate `totalFeedbacks >= 3` (line 33), `CauseAnalysis` (35), `ImprovementRoadmapPanel` (36), `materialCount` via `lectureMaterial.count` (19), checklist link to `/management` (49). No longer a placeholder.
  - Overview deep tab + `AnalysisTabs` intact.
  - `ChatSidePanel` NOT added to analysis page (0 refs); single layout mount preserved. Chat name/floating button untouched.
  - Component sources intact (`cause-analysis`, `improvement-roadmap`, `round-reports`); management/benchmark/materials pages intact.
- Runtime button states (`원인 분석 실행`, `로드맵 생성` loading/result): NOT driven by this phase (no smoke test executed). Recommend manual check once dev is up — components are unchanged from the working overview, so behavior is expected identical.

#### Remaining Work For Phase 2-4 - 현황 요약 정리

- Trim the overview (`page.tsx`) to be 현황 요약 only: remove the `AnalysisTabs` shell (deep tab → now on /analysis, compare tab → /benchmark) and the right management sidebar (now on /management).
- Keep on overview: KPI cards, `FeedbackAnalysis` (feedback tab content), and lightweight `TrendAnalysis` (Phase 1 Decision 1).
- Introduce the slim status-oriented sidebar per the plan (active round status, response summary, materials shortcut, "학생 의견..." chat entry — without renaming the chat).
- This is the step that finally removes all the intentional duplications from 2-1/2-2/2-3. Validate overview still renders and all moved features remain reachable on their new routes before removing.

#### Risks / Questions

- Duplicate deep-analysis UI lives in two routes until the 2-4 trim — identical components/actions, no functional risk, only redundancy.
- Empty-state copy is duplicated as a string in both overview `deepTab` and the analysis page. Once 2-4 removes the overview deep tab, only the analysis page copy remains; no action needed now.
- `next build` still not exercised; recommend one clean build before final submission.
- No runtime smoke test this phase (see Validation).

### Phase 2-4 - 현황 요약 정리

Status: Complete

#### Files Changed

- `src/app/dashboard/course/[courseId]/page.tsx` — trimmed to a true 현황 요약 page (rewritten).
- No other files changed. `/analysis`, `/management`, `/benchmark`, `/materials`, layout, and all component sources untouched.

#### Summary of Overview Cleanup

The overview is now 현황 요약 only. Removed the `AnalysisTabs` shell and renders `FeedbackAnalysis` + `TrendAnalysis` directly in a `space-y-8` left column. The heavy management sidebar (full forms + long reports) was replaced with a slim status-oriented sidebar. All intentional duplications introduced in Phases 2-1/2-2/2-3 are now resolved — those features live only on their dedicated routes.

Layout: KPI cards (top, full width) → `xl:grid-cols-[1fr_320px]` with LEFT = `FeedbackAnalysis` + `TrendAnalysis`, RIGHT = slim sidebar.

#### Components Removed From Overview

- `AnalysisTabs` (tab shell)
- `CauseAnalysis`, `ImprovementRoadmapPanel` (now on `/analysis`)
- `Benchmark`, `ImprovementCases` (now on `/benchmark`)
- `RoundManager`, `TokenManager`, sidebar `RoundReports` (now on `/management`)

Verified via grep: each of the above resolves to 0 references in `page.tsx` (note: "RoundReports" substring still appears only inside `getRoundReports`, which is retained for `TrendAnalysis`).

#### Data Fetches Removed From Overview

- `getBenchmark`
- `getImprovementCases`
- `getTokenStats`
- `prisma.lectureMaterial.count(...)` (and the `prisma` import — no longer used in overview)

#### Data Fetches Intentionally Retained

- `getRounds` — `FeedbackAnalysis` round filter + slim sidebar active-round status
- `getRoundReports` — `TrendAnalysis` (`roundReports.rounds`)
- `triggerSummaryIfNeeded`, `triggerMaterialReanalysisIfNeeded` — background pre-compute (overview is the natural trigger point)
- `computeFeedbackCounts(course.feedbacks)` — KPI + radar + sidebar response summary

#### Sidebar / Status Area Decision

Replaced the heavy management sidebar with a slim status sidebar (`space-y-4`) containing only:

- **평가 상태** — active round (`rounds.find(r => r.status === "active")`): green dot + "{label} 진행 중" + 마감 datetime; otherwise "진행 중인 평가가 없습니다."
- **응답 요약** — total responses + 수강생/응답률 (reuses `responseRate`).
- **바로가기 링크** — 강의자료 분석 (`/materials`) and 지원 인사이트 (`/analysis`).

No full management forms or long report lists remain on the overview, per plan. Chat entry remains the single layout-mounted floating button (not renamed, not re-added here).

> Phase 2-4 correction (slim sidebar detail): the 평가 상태 card now also shows, when a round is active, `피드백 {activeRound.feedbackCount}건 · 제출 {activeRound.submissionCount}건` (both fields already returned by `getRounds`). When no round is active, the card shows a small inline link `관리 및 기록에서 라운드 설정하기 →` to `/management`. This management link lives ONLY inside the 평가 상태 card (no-active-round case); the general shortcut list still contains only `materials` and `analysis` — management/benchmark are NOT added as general shortcuts. Re-validated: `npm run lint` clean, `npx tsc --noEmit` exit 0. Only `page.tsx` changed.

#### Destination Route Preservation Check

- `/analysis`, `/management`, `/benchmark`, `/materials` pages NOT modified; all source files present.
- All moved feature components' source files intact (`round-manager`, `token-manager`, `round-reports`, `benchmark`, `improvement-cases`, `cause-analysis`, `improvement-roadmap`). Nothing deleted.
- `FeedbackAnalysis`, `TrendAnalysis` retained on overview (2 refs each = import + usage).
- `ChatSidePanel` still single-mounted in layout only (0 refs in overview).

#### Validation Performed

- `npm run lint` (eslint) → clean.
- `npx tsc --noEmit` → exit 0, no type errors.
- `npm run build` NOT run (dev server may hold `.next`; lint + tsc used per plan).
- Code-level grep checks (removals = 0, retentions ≥ 1) all pass as listed above.
- Recommended manual route walk once dev is up: `/dashboard/course/[courseId]` (overview slim), `/analysis`, `/management`, `/benchmark`, `/materials`.

#### Remaining Work For Phase 3 - Verification And Cleanup

- Run a clean `npm run build` with the dev server stopped (definitive check; not yet exercised across Phase 2).
- Manual runtime walk of all 5 routes + chat drawer + round/token mutations on `/management`.
- Optional cleanups (out of scope until approved): rename `benchmark.tsx` component to avoid the `benchmark/` directory name collision; reconcile the duplicate course header on `/materials` (layout header + materials' own `<h1>`); consider whether `analysis-tabs.tsx` is now dead code (no longer imported anywhere) and can be removed.
- Tone/copy polish pass (explicitly deferred from Phase 2).

#### Risks / Questions

- `analysis-tabs.tsx` is now likely unused (the only consumer was the overview). Flag for Phase 3 dead-code check before deleting (confirm no other importer).
- `/materials` still shows a duplicate course title (layout header + its own `<h1>`) — cosmetic, deferred to Phase 3.
- `next build` still not exercised; recommend one clean build before final submission.
- No runtime smoke test driven by this phase.

## Phase 3 - Verification And Cleanup

Status: Complete

### Files Changed

- Deleted `src/app/dashboard/course/[courseId]/analysis-tabs.tsx` (dead code).
- Edited `src/app/dashboard/course/[courseId]/materials/page.tsx` — removed the duplicate course-name header only.
- No other files changed.

### Dead-Code Cleanup Result

- `rg "analysis-tabs|AnalysisTabs"` over `src/` returned no external importers (only the file itself). Confirmed unused since Phase 2-4 removed the overview's tab shell.
- Deleted `analysis-tabs.tsx`. Re-grep after deletion: 0 references anywhere. No other feature component file was deleted.

### Materials Header Cleanup Result

- Removed the duplicate `<h1>{course.name}</h1>` from `materials/page.tsx` (the shared course layout already renders `course.name`).
- Kept the materials-specific section title, promoted to `<h2 className="text-lg font-semibold text-gray-900">강의자료 분석</h2>` (consistent with the other sub-pages' section headings).
- NOT touched: auth, ownership check, demo guard (line 45 still references `course.name` only inside the demo-visibility guard), data fetch, and `MaterialsClient` props.

### Validation Performed

- `npm run lint` (eslint) → clean.
- `npx tsc --noEmit` → exit 0, no type errors.
- `npm run build` → see Build Result.

### Build Result

- `npm run build` **succeeded** (Next.js 16.2.2 / Turbopack): "Compiled successfully", TypeScript finished, 9/9 static pages generated, page optimization finalized. No errors/warnings.
- To run it, the dev server holding `.next` on :3000 was stopped first (build-verification scope only, per user instruction), then `rm -rf .next && npm run build`. Dev server was left stopped (no restart, per instruction).
- All course-detail routes present in the build output (all `ƒ` dynamic, as expected with `force-dynamic` + auth):
  - `/dashboard/course/[courseId]`
  - `/dashboard/course/[courseId]/analysis`
  - `/dashboard/course/[courseId]/benchmark`
  - `/dashboard/course/[courseId]/management`
  - `/dashboard/course/[courseId]/materials`

### Route Smoke-Test Result

- No live runtime smoke test performed: the dev server was intentionally stopped for the clean build and not restarted (per user instruction "build 후 dev 서버를 다시 켤 필요는 없습니다"). The production build's page-data collection and static-generation steps passed for every route, which exercises each route's module/import graph at build time.
- Recommendation (follow-up, when convenient): start `npm run dev` and visually walk the 5 routes + chat drawer + a round/token mutation on `/management`.

### Metadata / Scroll Observation

- Metadata/title: the app has no per-page `metadata`/`<title>` system for course sub-pages; the browser tab title is whatever the root/layout provides. This is pre-existing and unchanged by the route split. Per the plan, NOT introducing a metadata/title system — flagged here as an optional follow-up only.
- Scroll: the shared layout renders the course header + course-nav once, and the overview now has a slim sidebar instead of the heavy management column, so no nested/duplicate scroll containers were introduced. No double-scroll expected. (Not verified at runtime — see Route Smoke-Test.)

### Auth / Ownership Guard Check Result

- No guards weakened. All four course pages call `getOwnedCourse(courseId)` (auth + ownership `where: { id, professorId }` + demo-visibility + `notFound()`), and the layout calls it too. `materials/page.tsx` retains its own independent `auth()` + ownership `findUnique` + demo guard (untouched this phase). Server actions used by the pages keep their internal auth/ownership checks. Build passed with these intact.

### Remaining Optional Follow-Ups

- Rename `benchmark.tsx` component to avoid the `benchmark/` directory name collision (explicitly out of scope for Phase 3; resolves correctly today).
- Add a proper per-page metadata/title system if browser-tab titles matter for the demo (deferred; not built per plan).
- Tone/copy polish pass across the relocated pages (explicitly deferred from Phase 2/3).
- Live runtime smoke test of all 5 routes once dev is restarted.

### Risks / Questions

- None blocking. The route split is structurally complete and verified by a clean production build + lint + tsc.
- Working-tree note (unchanged from earlier phases, not introduced by Phase 3): `src/app/page.tsx` (landing redesign) and `package-lock.json` (engines field) still show as modified from earlier tasks — not part of this restructuring.
