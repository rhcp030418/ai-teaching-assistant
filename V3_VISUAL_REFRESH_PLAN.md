# V3 Visual Refresh Plan

## Purpose

Apply the visual mood of `src/reference/V3_02_gpt.jpg`, `src/reference/V3_03_gpt.jpg`, and `src/reference/V3_04_gpt.jpg` to the professor course dashboard.

This is a visual polish pass only. The completed course-detail route restructuring must remain intact.

## Reference Preview

Use this standalone preview as the visual direction sample:

- `course-detail-preview/v3-visual-preview.html`

The preview is not a spec to copy 1:1. It shows the intended mood:

- cool blue-white page background
- navy primary text
- bright blue primary accents
- white cards with pale blue borders
- soft blue-tinted shadows
- clearer active navigation
- polished dashboard feel without turning the professor UI into a mobile student app

## Product Direction

The professor must remain the active decision maker.

- Keep the dashboard calm, professional, and readable.
- Do not make the UI feel like an AI character is evaluating the professor.
- Keep `AI 강의 어시스턴트` as an optional tool, not the visual center of the page.
- Use V3's visual tone, but preserve desktop dashboard density.
- Design keyword: sophisticated authority. The screen should feel polished and trustworthy, not playful.

## Design Guardrails

These guardrails incorporate the Gemini design review.

### Contrast And Readability

- Use deep navy for important titles, metric labels, and primary data.
- Do not let pale blue backgrounds reduce text contrast.
- Prefer weight and contrast for hierarchy before increasing font size.

### Semantic Color

- Blue is the product/accent color.
- Green still means positive/success.
- Amber still means caution/needs attention.
- Red should remain reserved for real errors or destructive states.
- Do not turn every state into blue just to match the reference.

### Desktop Density

- Keep dashboard information compact enough for professor workflows.
- Prefer card padding around `p-4` to `p-6`.
- Avoid mobile-app spacing where every block becomes oversized.
- Preserve scanability across KPI, charts, sidebars, and lists.

### AI Assistant Presence

- The chat entry point may receive V3 styling, but it must stay visually secondary.
- Avoid large glowing AI elements or character-like branding.
- The assistant should read as a course-scoped tool, not the central feature.

## Non-Goals

Do not do these in this visual pass:

- Do not change route structure.
- Do not move components between pages.
- Do not change auth, ownership checks, Prisma queries, server actions, or data logic.
- Do not remove features.
- Do not rename core features.
- Do not start mobile-specific work.
- Do not redesign the landing page, dashboard list, or tone page in Pass 1.
- Do not revive deprecated feedback files as implementation specs.

## Design Tokens

These values are suggested anchors, not mandatory exact values.

### Colors

- Page background: `#F5F8FF`, `#F8FBFF`, `#EFF6FF`
- Primary text: `#10233F`
- Secondary text: `#6B7C93`
- Primary blue: `#1677FF`
- Deep blue: `#0F5FD7`
- Sky accent: `#38BDF8`
- Success accent: `#10B981`
- Caution accent: `#F5B544`
- Card border: `#DBEAFE`, `#BFDBFE`

### Surfaces

Prefer:

- `bg-white` or `bg-white/90`
- `border-blue-100/70` or similar
- soft blue-tinted shadows
- subtle blue-tinted backgrounds for active/important states

Avoid:

- heavy gray-only UI
- dark slate-dominant theme
- purple/indigo AI-app styling
- red warning states unless there is a real error
- oversized mobile-card composition

### Radius And Shadow

The V3 reference uses soft rounded cards. For this desktop dashboard, use moderate softness:

- cards: usually `rounded-xl`
- larger hero/header containers: may use `rounded-2xl`
- buttons/nav pills: usually `rounded-xl`
- avoid `rounded-3xl` unless there is a strong local reason
- avoid making every control look like a large mobile tile

### Theme Variable Strategy

The project uses Tailwind v4 and shadcn CSS variables in `src/app/globals.css`.

- Inspect the existing theme variables before editing visual styles.
- Do not globally recolor `:root` in V1 if that would unexpectedly affect the landing page, dashboard list, or tone page.
- Prefer a course-detail scoped theme approach for V1 if shared tokens are needed.
- Hardcoded Tailwind classes are acceptable for a small pilot, but repeated values should be consolidated if the same style appears across several files.

## Phase V0: Audit

Status: pending

Goal: identify the smallest safe visual change set.

Claude Code should:

1. Read this file.
2. Read `course-detail-preview/v3-visual-preview.html`.
3. Inspect current course detail files:
   - `src/app/globals.css`
   - `src/app/dashboard/course/[courseId]/layout.tsx`
   - `src/app/dashboard/course/[courseId]/course-nav.tsx`
   - `src/app/dashboard/course/[courseId]/page.tsx`
   - `src/app/dashboard/course/[courseId]/chat-side-panel.tsx`
   - `src/app/dashboard/course/[courseId]/feedback-analysis.tsx`
   - `src/app/dashboard/course/[courseId]/trend-analysis.tsx`
   - `src/app/dashboard/course/[courseId]/radar-chart.tsx`
4. Identify repeated visual patterns such as `bg-white`, `border-gray-*`, `text-gray-*`, `shadow-sm`.
5. Check whether chart colors are controlled by Tailwind classes, SVG props, or hardcoded values.
6. Decide whether V1 should use scoped CSS variables, local Tailwind classes, or both.
7. Update `V3_VISUAL_REFRESH_LOG.md` with the intended Pass 1 file list before editing.

No app code changes during V0 except logging.

## Phase V1: Course Overview Pilot

Status: pending

Goal: apply the V3 visual mood to the course detail shell and the overview page first.

Target scope:

- `src/app/dashboard/course/[courseId]/layout.tsx`
- `src/app/dashboard/course/[courseId]/course-nav.tsx`
- `src/app/dashboard/course/[courseId]/page.tsx`
- `src/app/dashboard/course/[courseId]/chat-side-panel.tsx` only if needed for visual consistency
- `src/app/dashboard/course/[courseId]/feedback-analysis.tsx` only if the overview still looks visually mismatched
- `src/app/dashboard/course/[courseId]/trend-analysis.tsx` only if the overview still looks visually mismatched

Expected changes:

1. Course detail background becomes a cool blue-white surface.
2. Course header uses navy text and soft blue surface styling.
3. Course nav active state uses bright blue and pale blue background.
4. Overview cards move away from plain gray borders into pale blue borders and soft shadows.
5. KPI cards use blue/green/amber accent hierarchy similar to the preview.
6. Slim sidebar keeps its current function but visually matches the blue-white system.
7. Floating `AI 강의 어시스턴트` remains a small optional entry point.
8. Chart colors should align with the V3 palette where safe, including radar/trend visuals.

Constraints:

- Do not touch `/analysis`, `/management`, `/benchmark`, or `/materials` yet unless a shared layout change naturally affects them.
- Do not change component behavior.
- Do not change text meaning.
- Do not introduce a new UI library.
- Keep professor dashboard density. Do not enlarge everything just because the reference is mobile.
- Do not globally change shadcn/Tailwind root variables in a way that restyles unrelated pages during V1.
- Do not use `rounded-3xl` or very large padding as the default card style.

Validation:

- `npm run lint`
- `npx tsc --noEmit`
- If the dev server is available, visually check `/dashboard/course/[courseId]`.
- If no real course URL is available, document that runtime visual QA is pending.
- During visual QA, check that text contrast remains strong and the AI assistant entry point is not visually dominant.

## Phase V2: Course Subpage Extension

Status: pending

Only start after the user approves V1 visually.

Goal: extend the same style to the rest of the course detail pages.

Target pages:

- `/dashboard/course/[courseId]/analysis`
- `/dashboard/course/[courseId]/management`
- `/dashboard/course/[courseId]/benchmark`
- `/dashboard/course/[courseId]/materials`

Expected changes:

1. Page titles and descriptions match the V3 navy/blue hierarchy.
2. Cards and sections use the same surface, border, radius, and shadow system.
3. Buttons and links use consistent blue accent styling.
4. Empty states use calm blue/white styling, not gray dead space.
5. Management forms remain practical and readable.

Validation:

- `npm run lint`
- `npx tsc --noEmit`
- Visual QA for all course subpages if dev server is available.

## Phase V3: Optional Wider App Pass

Status: optional

Only consider after V1 and V2 are accepted.

Possible scope:

- `/dashboard`
- `/dashboard/tone`
- landing/home

This is intentionally separate so the course dashboard visual direction can be validated first.

## Logging Rules

Claude Code should update `V3_VISUAL_REFRESH_LOG.md` after every phase with:

- files changed
- visual intent
- validation commands and results
- screenshots or visual QA notes if available
- known follow-ups
