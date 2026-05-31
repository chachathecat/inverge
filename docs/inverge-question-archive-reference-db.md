# Inverge Question Archive Reference DB v1

## Purpose

Question Archive v1 is a backend reference layer for 감정평가사 1차 and 감정평가사 2차 learning operations. It is not a learner-facing problem bank, archive dashboard, or official answer service.

The archive supports the existing Inverge loop: input → diagnosis → tracking → prediction → recommendation → execution → retry/rewrite.

## Allowed use

- topic tagging
- issue tagging
- similar question reference hints
- weak-unit mapping
- answer skeleton mapping
- concept-frequency reference
- review recommendation support

Hints must stay optional, small, and secondary to the next retry/rewrite action. Learner UI may show at most two hints by default under collapsed details such as:

- Today Plan task details: `관련 기출 기준 힌트`
- Capture-to-Note item details: `비슷한 기출 기준`
- 2차 rewrite detail: `관련 skeleton / 참고 근거 보기 (선택)`
- 1차 O/X concept detail: `빈출 표현 기준 보기 (선택)`

## Not allowed

- Do not make “20년치 기출 탐색” the main UX.
- Do not create a dense learner archive dashboard from this layer.
- Do not import copyrighted raw problem text without source/rights metadata.
- Do not use third-party problem raw text as a training corpus.
- Do not merge user OCR, user answers, uploaded problems, or handwritten content with archive records.
- Do not expose official answer, grading, pass/fail, or final-judgment claims.
- Do not add payment or paywall logic around this reference layer.

## Data boundary

Question reference metadata is product reference data. User raw artifacts remain user-owned service data.

Safe derived input may include only:

- `examMode`
- `subject`
- `topicCandidate`
- `conceptCandidate`
- `mistakeType`
- `issueTags`
- `skeletonId`
- `derivedTags`
- `safeSkeletonIds`

Forbidden input includes raw OCR text, user answer text, uploaded problem text, raw problem text, rewrite paragraphs, and handwritten content. The service sanitizes reference inputs through the Review OS data-boundary helpers before matching.

Reference hints may be persisted or displayed only as small identifiers and metadata such as `referenceId`, `skeletonId`, rights status, and citation label. Do not store user raw text in question references. Do not store question raw text in user derived metadata.

## v1 record shape

```ts
type QuestionReference = {
  id: string;
  examYear: number;
  examRound?: string;
  examMode: "first" | "second";
  subject: string;
  topicTags: string[];
  issueTags: string[];
  conceptTags: string[];
  skeletonId?: string;
  difficultyBucket?: string;
  sourceRightsStatus: "public_domain" | "licensed" | "internal_curated" | "needs_review";
  rawTextAvailable: boolean;
  rawTextStoragePolicy: "none" | "metadata_only" | "licensed_private_reference" | "public_excerpt";
  citationLabel?: string;
  createdAt: string;
  updatedAt: string;
};
```

For v1, sample entries under `reference_corpus/question_archive/` are metadata-only and use `rawTextAvailable: false` with `rawTextStoragePolicy: "metadata_only"`.

## Service functions

The backend reference layer lives in `lib/review-os/question-reference.ts` and exposes:

- `loadQuestionReferenceIndex()`
- `findQuestionReferencesForLearningItem(input)`
- `mapLearningItemToQuestionReferenceHints(input)`
- `buildWeakUnitMappingFromReferences(input)`
- `getSimilarQuestionReferenceCandidates(input)`

All functions return optional, small hints. They do not return raw problem text or official answers.
