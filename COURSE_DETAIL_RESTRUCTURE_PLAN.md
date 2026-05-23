# Course Detail Restructure Plan

This is the only implementation guide for the course detail restructuring work.

Do not use `Codex_feedback.md` or `Gemini_feedback.md` as implementation specs. Those files are discussion records and may include outdated opinions.

For completed work and audit history, read `COURSE_DETAIL_RESTRUCTURE_LOG.md`.

## Current Active Phase

**Next phase: Phase 3 - Verification And Cleanup**

Do not start implementation until the user explicitly approves Phase 3.

## Non-Negotiable Rules

- Do not delete features.
- Keep tone correction.
- Keep AI improvement roadmap.
- Keep AI class checklist.
- Keep cause analysis / feedback-material connection.
- Keep AI chat.
- Keep benchmark and improvement cases.
- This round targets web/desktop only. Do not optimize mobile.
- Keep `/dashboard/course/[courseId]/materials` working.
- Preserve existing auth, ownership, and demo-account checks.
- Use existing server actions and components where possible.
- Do not modify unrelated files such as `src/app/page.tsx` or `package-lock.json`.

## Fixed Product Decisions

### AI 강의 어시스턴트

- Preserve the existing feature identity: `AI 강의 어시스턴트`.
- Keep the existing right-bottom floating icon/button style.
- `ChatSidePanel` must stay mounted exactly once in `src/app/dashboard/course/[courseId]/layout.tsx`.
- Do not add `ChatSidePanel` to individual page files.
- Do not globally rename it to `학생 의견에 대해 질문하기`.
- Do not use `학생별로 질문하기`; the assistant is course-scoped, not student-scoped.
- The assistant should answer within the current `courseId` context.

### Final Route Structure

```txt
/dashboard/course/[courseId]              -> 현황 요약
/dashboard/course/[courseId]/analysis     -> 지원 인사이트
/dashboard/course/[courseId]/management   -> 관리 및 기록
/dashboard/course/[courseId]/benchmark    -> 비교 참고
/dashboard/course/[courseId]/materials    -> 강의자료 분석
```

## Phase Status

- Phase 0 - Structure audit: complete. See LOG.
- Phase 1 - Route skeleton and course nav: complete. See LOG.
- Phase 2-1 - 관리 및 기록: complete. See LOG.
- Phase 2-2 - 비교 참고: complete. See LOG.
- Phase 2-3 - 지원 인사이트: complete. See LOG.
- Phase 2-4 - 현황 요약 정리: complete. See LOG.
- Phase 3 - Verification And Cleanup: next.

## Current Code State

The route split is complete:

- `/dashboard/course/[courseId]`: KPI, `FeedbackAnalysis`, `TrendAnalysis`, slim status sidebar
- `/dashboard/course/[courseId]/analysis`: `CauseAnalysis`, `ImprovementRoadmapPanel`, management/checklist link
- `/dashboard/course/[courseId]/management`: `RoundManager`, `TokenManager`, `RoundReports`
- `/dashboard/course/[courseId]/benchmark`: `Benchmark`, `ImprovementCases`
- `/dashboard/course/[courseId]/materials`: still works, but has a duplicate local course-title header because the new course layout also renders the course title

Known cleanup candidates:

- `analysis-tabs.tsx` appears unused after overview cleanup.
- `/materials/page.tsx` still renders its own `<h1>{course.name}</h1>`, duplicating the shared course layout header.
- `benchmark.tsx` component and `benchmark/` route folder share a name. This is currently type-safe but mildly confusing. Do not rename it in Phase 3 unless explicitly approved.
- AI/tone copy polish is deferred to a later content pass. Do not do broad wording changes in Phase 3.

## Phase 3 Detailed Instructions - Verification And Cleanup

### Goal

Perform final structural cleanup and validation after the course-detail route split.

This phase should be small and conservative. It should not introduce new UX concepts or move features again.

### Cleanup Scope

Phase 3 may change only these items unless a build/type error requires otherwise:

1. `src/app/dashboard/course/[courseId]/analysis-tabs.tsx`
   - Confirm it has no importers with `rg "analysis-tabs|AnalysisTabs"`.
   - If unused, delete it.
   - Do not delete any other feature component source file.

2. `src/app/dashboard/course/[courseId]/materials/page.tsx`
   - Remove the duplicate local course-name header.
   - Because the shared course layout already renders `course.name`, do not render `<h1>{course.name}</h1>` again inside materials.
   - Keep a materials-specific section heading if useful, such as `강의자료 분석`.
   - Keep existing data fetching, auth, ownership, and demo-account behavior intact.
   - Keep `MaterialsClient` props intact.

3. Documentation/log
   - Update `COURSE_DETAIL_RESTRUCTURE_LOG.md` with what was verified and what was cleaned.

### Validation Scope

Run:

```txt
npm run lint
npx tsc --noEmit
```

Run:

```txt
npm run build
```

`npm run build` is mandatory for Phase 3 completion. Only skip it if a running dev server or environment issue makes it unsafe/impossible. If skipped or failed for environment reasons, record the exact reason in the LOG.

If a dev server is available, manually visit:

- `/dashboard/course/[courseId]`
- `/dashboard/course/[courseId]/analysis`
- `/dashboard/course/[courseId]/management`
- `/dashboard/course/[courseId]/benchmark`
- `/dashboard/course/[courseId]/materials`

During route smoke testing, also check:

- no obvious duplicate vertical scrollbars
- browser/page title behavior is acceptable or recorded as a follow-up
- route-level auth/ownership guards are still present at code level (`getOwnedCourse` or the existing materials auth pattern)
- unauthorized/direct access behavior is not weakened

If manual browser verification is not possible, do code-level route checks and record that runtime smoke testing was not performed.

### Must Not Do

- Do not rename `benchmark.tsx` in Phase 3 unless explicitly approved.
- Do not perform broad tone/copy polish in Phase 3.
- Do not change `ChatSidePanel`, `AIChat`, or `use-ai-chat`.
- Do not move `ChatSidePanel` out of layout.
- Do not add another chat mount.
- Do not delete feature component files other than confirmed-unused `analysis-tabs.tsx`.
- Do not refactor materials auth/data fetching beyond removing the duplicate visual header.
- Do not change `/analysis`, `/management`, `/benchmark`, or overview behavior unless a build/type error requires it.
- Do not add a metadata/title system in Phase 3 unless required by a build/runtime issue. If titles are all shared, record it as a follow-up instead.
- Do not optimize mobile.
- Do not modify unrelated files such as `src/app/page.tsx` or `package-lock.json`.

### Final Checks

Confirm at code level:

- No importers remain for `analysis-tabs.tsx` before deleting it.
- `/materials/page.tsx` no longer duplicates the course name rendered by layout.
- `ChatSidePanel` appears only in `layout.tsx` as an import and mount.
- Destination routes still exist:
  - `analysis/page.tsx`
  - `management/page.tsx`
  - `benchmark/page.tsx`
  - `materials/page.tsx`
- Overview still renders `FeedbackAnalysis` and `TrendAnalysis`.
- Management still renders `RoundManager`, `TokenManager`, and `RoundReports`.
- Benchmark still renders `Benchmark` and `ImprovementCases`.
- Analysis still renders `CauseAnalysis` and `ImprovementRoadmapPanel` behind the feedback-count gate.
- No stale imports remain after cleanup. Use lint/typecheck to catch this; if an auto-fix command is used, keep it scoped and do not churn unrelated files.
- Each course route still has an ownership guard through `getOwnedCourse` or the existing materials auth/ownership query.

### Log Requirement

At the end of Phase 3, update `COURSE_DETAIL_RESTRUCTURE_LOG.md` with:

- Phase completed
- Files changed
- Dead-code cleanup result
- Materials header cleanup result
- Validation performed
- Build result
- Route smoke-test result or reason not performed
- Metadata/title and scroll observations if checked
- Auth/ownership guard check result
- Remaining optional follow-ups
- Risks / questions

## Post-Phase Optional Follow-Ups

Do not do these during Phase 3 unless separately approved:

- rename `benchmark.tsx` to `benchmark-panel.tsx`
- tone/copy polish for AI-related language
- consider a read-only checklist summary on `/analysis`
- mobile/responsive optimization pass
