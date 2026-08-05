---
decision_title: "답안길 무라이선스 교재 일회성 처리·비보관 저작권 방화벽 Owner 결정"
status: "owner-decision/proposed-for-merge"
dated: "2026-08-05 KST"
repository: "chachathecat/inverge"
owner_scope: "Dabangil Appraiser Second and future Professional Exam Reasoning OS source capture"
strategy_addendum:
  - "docs/strategy/dabangil-copyright-safe-ephemeral-source-pipeline-master-plan-v10-2026-08-05.md"
supersedes_for_exact_scope:
  - "any strategy text that permits persistent server storage of unlicensed third-party textbook, workbook, question, answer-key or commentary source expression"
does_not_authorize:
  - "runtime, API, schema, migration, RLS, storage, provider, dependency, deployment or Production changes"
  - "real copyrighted source processing"
  - "external learner activation, payment, entitlement or public launch"
  - "model training, evaluation-corpus creation, RAG, embeddings or shared problem-bank construction"
execution_rule: "Implement only through later exact-scope Works after live-state reconciliation, provider-contract verification and written legal review."
---

# Owner 결정 — 무라이선스 교재 일회성 처리·비보관 저작권 방화벽

## 1. 결정의 목적

답안길은 사용자가 적법하게 보유하거나 접근한 문제를 촬영하여 다음 기능을
제공하는 개인 학습 튜터를 목표로 한다.

- 문제 요구와 조건 파악
- 사용자의 선행 답안·목차·계산 검토
- 최소 힌트, 독자적 풀이, 답안 교정과 개념 설명
- biggest gap, D+1/D+7, Review Queue와 다음 학습 행동

이 기능은 유지한다. 다만 출판사 또는 권리자로부터 별도 이용허락을 받지
않은 상업 교재의 표현을 답안길의 서버 자산, 공용 문제은행, 검색 자료,
모델 학습자료 또는 장기 개인 보관물로 축적하는 방식은 사용하지 않는다.

이 결정은 법적 면책이나 무조건적 적법성을 선언하지 않는다. 법률상 판단은
구체적 사실과 관할에 따라 달라질 수 있다. 이 결정은 서비스가 권리자의
시장과 표현을 불필요하게 대체하지 않고, 사용자의 제한된 개인 학습을 돕는
도구에 최대한 가까워지도록 제품·기술·운영 경계를 더 엄격하게 고정한다.

## 2. 최상위 불변식

권리상태가 `transient_personal_study`인 제3자 자료에 대해서는 다음을 모두
지킨다.

1. 원본 사진, crop, thumbnail, OCR 원문, 문제 지문, 출판사 해설, 원문을
   복원할 수 있는 구조화 자료, 원문 포함 prompt, provider request/response,
   원문 embedding과 source-derived cache를 답안길의 영속 서버 계층에 쓰지
   않는다.
2. 영속 서버 계층은 PostgreSQL, Supabase Storage, Vercel Blob, object
   storage, Redis durable value, queue, job payload, analytics, APM, crash
   report, log, trace, session replay, backup, snapshot, CI artifact, support
   attachment와 관리자 화면을 모두 포함한다.
3. 원문 처리는 기본적으로 사용자 기기에서 수행한다. 원격 모델이 필요한
   경우에는 별도 승인된 `zero_content_retention` 처리 경로에서 한 요청의
   동기식 수명 안에서만 처리한다.
4. `zero_content_retention`이 계약·제품 설정·사용 endpoint·model에 대해
   확인되지 않거나 drift가 있으면 무라이선스 원문을 원격 provider로 보내지
   않는다. 더 낮은 품질의 retained provider로 몰래 fallback하지 않는다.
5. 처리 완료 뒤 서버에 남길 수 있는 것은 원문을 복원할 수 없는 closed
   metadata, 권리모드, 정책버전, 처리·삭제 receipt, 사용자가 직접 작성한
   답안 중 source-expression scrub을 통과한 부분, 오류 유형, concept tag,
   assistance/exposure, next action과 학습 evidence뿐이다.
6. AI가 생성한 전체 풀이도 무라이선스 문제와 1:1로 결속된 공용·서버
   answer cache로 저장하지 않는다. 필요한 경우 사용자 기기의 명시적 local
   vault에만 저장한다.
7. PDF, ZIP, 다중 페이지, 책 전체, 연속 페이지 추출, 출판사 답지·해설지,
   불법 스캔본과 여러 계정에 의한 분할 재구성은 처리하지 않는다.
8. 답안길은 책 제목·문제번호만으로 무라이선스 문제나 정답을 호출하는 검색
   서비스를 제공하지 않는다.
9. 무라이선스 원문을 model training, fine-tuning, evaluation, prompt
   optimization, RAG, vector store, shared cache, dedup corpus 또는 다른
   사용자의 답변에 사용하지 않는다.
10. 위 불변식 중 하나라도 기술적으로 증명할 수 없으면 해당 처리경로는
    `blocked`다.

## 3. 권리모드별 처리 결정

```ts
type SourceRightsModeV1 =
  | "licensed_full"
  | "user_authored"
  | "open_or_public_domain"
  | "official_link_only"
  | "transient_personal_study"
  | "blocked";
```

| 권리모드 | 원문 서버 영속 저장 | 원격 AI | 검색·RAG | 출력 보관 |
| --- | --- | --- | --- | --- |
| `licensed_full` | exact license 범위에서만 | 계약 범위에서 가능 | 허용된 범위에서만 | 허용된 범위에서만 |
| `user_authored` | 사용자 선택·privacy 계약 범위 | approved business route | private only가 기본 | private only가 기본 |
| `open_or_public_domain` | exact license·출처표시 범위 | approved route | rights manifest 범위 | rights manifest 범위 |
| `official_link_only` | 원문 복제 없이 공식 URL·metadata만 | 원문 fetch 금지, 별도 허락 시만 | link/metadata only | 독자적 학습 metadata만 |
| `transient_personal_study` | **금지** | on-device 또는 approved zero-content-retention synchronous route | **금지** | server full-answer cache 금지; local-only 선택 가능 |
| `blocked` | 금지 | 금지 | 금지 | 금지 |

권리상태가 확인되지 않은 일반 상업 교재는 자동으로
`transient_personal_study`보다 강한 권리를 얻지 않는다. 사용자의 “책을
구매했다”는 진술은 서비스의 장기 복제·공유·RAG 권한으로 승격되지 않는다.

## 4. `Personal Raw Vault`의 정확한 교정

기존 전략의 `Personal Raw Vault`는 다음 자료에만 적용할 수 있다.

- 사용자가 직접 창작한 자료
- exact license가 서버 보관을 허용한 자료
- 보호기간 만료 또는 적용 가능한 공개 라이선스가 확인된 자료
- 별도의 법적 검토와 권리 manifest가 허용한 자료

`transient_personal_study` 자료의 원본 사진, OCR, 문제 표현, 답지 표현과
그것을 복원할 수 있는 파생물은 Personal Raw Vault에 들어갈 수 없다.
기존 마스터플랜의 `immutable source asset → editable OCR/problem revision`
계보는 이 권리모드에서는 다음처럼 교체한다.

```text
client-held source
→ ephemeral processing session
→ non-persisted OCR/source interpretation
→ learner attempt + source-scrubbed learning evidence
→ Review Queue / mastery projections
```

## 5. 사용자 경험은 유지한다

사용자는 한 화면에서 다음 흐름을 계속 사용할 수 있다.

```text
촬영
→ 기기 내 crop·개인정보 마스킹·가능하면 OCR
→ 내 답·목차·계산 먼저 제출
→ AI의 독자적 풀이·첨삭·개념 설명
→ 가장 큰 간극 하나 교정
→ D+1/D+7·다음 행동 저장
```

다만 무라이선스 자료에서는 다음 차이가 있다.

- 원문과 OCR의 cloud history가 없다.
- 앱을 닫은 뒤 원문을 다시 보려면 사용자가 책을 다시 열거나 기기의 local
  vault를 선택해야 한다.
- 서버는 문제 원문이 아니라 학습상태와 사용자가 만든 evidence를 기억한다.
- provider의 무보관 자격이 닫히지 않으면 원격 전체풀이가 차단되고 기기 내
  OCR·구조화 또는 manual fact entry로 전환한다.

## 6. 출력 방화벽

`transient_personal_study`의 learner-facing 출력은 다음 원칙을 지킨다.

- 문제 지문을 답변 첫머리에 다시 전재하지 않는다.
- 출판사 해설의 문체·목차·암기문구·예시를 모방하지 않는다.
- “○○출판사 답지처럼”, “원문 해설 그대로”, “책 없이 전 문항 정답” 요청을
  거부한다.
- 정답·공식·법리·사실이 같을 수 있어도 설명 표현은 답안길 고유 구조로
  독자적으로 작성한다.
- 입력과 생성 출력의 비정상적 장문 중복을 탐지해 재생성하거나 block한다.
- similarity threshold는 법적 안전선이라고 광고하지 않고 보수적 제품
  guardrail로만 사용한다.

## 7. 운영·약관 결정

공개 출시 전에 다음을 갖춘다.

1. 적법하게 보유·접근한 자료의 개인 학습만 허용하는 이용약관
2. 전체 스캔, 답지, 불법복제물, 분할 업로드와 재판매 금지
3. 권리자 신고 수령인, 중단·재개 절차와 반복 침해 계정 정책
4. 실제 provider와 endpoint별 데이터 보관·학습 조건을 명시한 개인정보
   처리방침
5. “완전 무저장”, “법적으로 100% 안전” 같은 절대 표현 금지
6. 실제 구현과 일치하는 정확한 사용자 고지
7. 출판사 license/Companion Pass 협상 경로
8. exact data-flow diagram과 provider 계약을 포함한 한국 저작권 전문
   변호사의 서면 검토
9. 한국저작권위원회 AI 특화 상담을 통한 추가 확인

권장 사용자 고지는 실제 경로가 증명된 경우에만 다음처럼 사용한다.

> 답안길은 이 문제의 원본 이미지와 OCR 원문을 서비스 데이터베이스,
> 문제은행 또는 모델 학습자료로 저장하지 않습니다. 원문은 표시된 일회성
> 처리 경로에서만 사용되며, 학습기록에는 사용자의 답안·오류 유형·개념과
> 다음 행동만 남습니다.

`원문이 어떤 컴퓨터의 RAM에도 존재하지 않는다`, `어떤 법적 책임도 없다`,
`물리적 비트가 즉시 완전 삭제된다`고 주장하지 않는다.

## 8. Provider 결정

- 소비자용 ChatGPT/Gemini 계정을 답안길 backend로 자동 조작하지 않는다.
- 무료 Gemini API처럼 입력·출력이 제품 개선 또는 사람 검토에 이용될 수
  있는 경로에는 무라이선스 원문을 보내지 않는다.
- 단순히 “학습에 사용하지 않음”만으로 무보관으로 간주하지 않는다.
- OpenAI API를 사용한다면 조직·project가 실제 ZDR 승인을 받았는지,
  endpoint/model/capability가 ZDR eligible인지, `store=false`가 강제되는지,
  background mode·Files·Assistants·Threads·Vector Store·persistent
  conversation·retained prompt cache가 배제됐는지 deployment gate에서 다시
  확인한다.
- Gemini 또는 다른 provider의 유료 API도 limited safety logging이 남을 수
  있으므로, `transient_personal_study`에는 별도 계약상 zero-content-
  retention이 확인되기 전까지 사용하지 않는다.
- provider 정책 drift가 감지되면 route를 자동 hold하고 이미 승인된 retained
  route로 fallback하지 않는다.

## 9. 개발 순서

이 결정의 병합만으로 runtime을 변경하지 않는다. 이후 작업은 최소한 다음
순서로 분리한다.

```text
CPF-0 source/rights and legal design freeze
→ CPF-1 data-classification contract
→ CPF-2 on-device capture/redaction/OCR baseline
→ CPF-3 memory-only synchronous ingress
→ CPF-4 provider zero-retention registry and route gate
→ CPF-5 output/source-expression firewall
→ CPF-6 bodyless ledger and deletion receipts
→ CPF-7 log/cache/queue/storage hostile audit
→ CPF-8 Owner-private synthetic acceptance
→ CPF-9 written legal review and exact real-source pilot decision
```

`CPF-9` 전에는 실제 제3자 교재 원문을 처리하지 않는다. 외부 learner와
상업화는 기존 마스터플랜의 별도 commercial gate를 그대로 요구한다.

## 10. 자동 중단 기준

다음 중 하나라도 발견되면 해당 기능을 즉시 hold한다.

- 원문·OCR·prompt·response가 DB, Storage, cache, queue, log, trace, replay,
  backup 또는 support tool에 남음
- provider route의 retention 또는 training 상태가 `unknown`
- 무라이선스 source로 embedding/RAG/shared cache 생성
- 다른 사용자에게 동일 문제의 과거 답변 재사용
- PDF/다중 페이지/답지/연속 추출 방어 우회
- 출력이 입력 또는 출판사 해설을 장문 재현
- 삭제 receipt 없이 성공 응답
- privacy 또는 copyright notice가 실제 데이터 흐름과 불일치
- 법적 검토에서 blocking issue 발생

## 11. 법적 기준과 설계 관계

이 결정은 다음 법적 특성을 고려한 보수적 제품정책이다.

- 저작권법 제30조는 비영리 개인 이용의 경우 “그 이용자”의 복제를
  규정하므로, 무라이선스 원문 전처리를 사용자 기기에 가깝게 둔다.
- 제35조의2의 일시적 복제는 원래 이용 자체가 침해인 경우 적용되지 않으므로
  단순 TTL이나 삭제시간만을 면책으로 취급하지 않는다.
- 제35조의5 공정이용은 목적·성격, 저작물의 종류·용도, 사용량과 중요성,
  현재·잠재 시장 영향을 종합하므로 한 문항, 개인 비공개, 독자적 교육적
  변환, 비축적, 답지시장 비대체와 사용자의 선행 시도를 제품 전체에서
  강화한다.
- 온라인서비스제공자 책임 제한은 자동 면책이 아니므로 중립 저장소 주장을
  유일한 방어로 사용하지 않고, 적극 가공 서비스로서 직접적인 예방통제를
  설계한다.

## 12. 최종 불변식

> **무라이선스 제3자 문제의 표현은 답안길의 자산이 되지 않는다. 답안길은
> 원문을 장기 보유하는 문제은행이 아니라, 한 번의 개인 학습 세션에서
> 사용자의 사고를 돕고 원문을 버린 뒤 사용자의 학습 증거만 남기는
> 튜터로 구현한다.**

이 불변식은 품질, 속도, 비용, debugging 편의와 growth보다 우선한다.
