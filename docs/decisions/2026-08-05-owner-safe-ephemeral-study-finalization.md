---
decision_title: "답안길 안전한 일회성 교재 학습 운영 최종 Owner 결정"
status: "owner-decision/proposed-final-for-merge"
dated: "2026-08-05 KST"
repository: "chachathecat/inverge"
owner_scope: "Dabangil Appraiser Second and all future Professional Exam Reasoning OS source-capture flows"
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v11-2026-08-05.md"
machine_contract: "config/dabangil-ephemeral-source-safety-contract-v1.json"
supersedes_for_exact_scope:
  - "docs/decisions/2026-08-05-owner-ephemeral-source-copyright-firewall.md"
  - "any earlier Owner strategy that permits persistent server retention, answer-cache reuse, RAG, embedding, training, evaluation or cross-user reuse of unlicensed third-party source expression"
does_not_authorize:
  - "runtime, API, UI, schema, migration, RLS, Storage, provider, dependency or deployment changes"
  - "processing real unlicensed third-party copyrighted source"
  - "external learner activation, payment, entitlement, public launch or Production"
  - "Ready transition, merge or auto-merge"
execution_rule: "Implementation begins only through later exact-scope Works after live-state reconciliation. Real third-party source processing additionally requires current provider-contract verification, hostile synthetic acceptance, written Korean copyright/privacy review and separate Owner authority."
---

# Owner 결정 — 안전한 일회성 교재 학습 운영 최종화

## 1. 결정

답안길은 사용자가 적법하게 보유·접근한 한 문제를 촬영해 AI 설명, 답안
첨삭, 계산 검산, 학습법, biggest gap, D+1·D+7과 Review Queue를 받는 핵심
기능을 유지한다.

동시에 권리가 정리되지 않은 상업 교재의 원문·OCR·표·해설·답지 또는
문제별 전체 AI 풀이를 답안길의 persistent server asset, 개인 cloud raw
vault, shared cache, 문제은행, RAG, embedding, training/evaluation data나 다른
사용자의 답변으로 축적하지 않는다.

이 결정은 법적 면책을 선언하지 않는다. 비저장만으로 자동 합법이 되지
않으며, 사용자의 촬영, 플랫폼의 일시 처리, AI 결과의 표현과 시장대체
효과가 각각 문제될 수 있다는 전제에서 가장 보수적인 제품·기술·운영
경계를 고정한다.

## 2. 단일 마스터플랜

`docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v11-2026-08-05.md`
를 active strategy entry point로 채택한다.

- v8과 v9는 non-conflicting learning/momentum detail을 제공하는 annex다.
- 기존 v10 addendum과 이 결정 이전의 덜 엄격한 source-retention 문구는
  active authority가 아니다.
- machine-readable enforcement는
  `config/dabangil-ephemeral-source-safety-contract-v1.json`에 mirror한다.
- implementation은 이 문서들의 merge만으로 시작되지 않는다.

## 3. 최상위 불변식

`SourceRightsModeV1=transient_personal_study`인 제3자 자료에는 다음을 모두
적용한다.

1. 기본 입력은 한 문제·한 페이지·한 사용자·한 세션·비공개다.
2. 같은 한 문항이 불가피하게 두 페이지에 걸친 경우에만 exact 2-page
   exception을 허용한다.
3. PDF, ZIP, 전체 책, 연속 페이지, 답지·출판사 해설, 불법 스캔과 여러
   계정의 분할 재구성을 차단한다.
4. crop, 개인정보 마스킹과 가능한 OCR은 사용자 기기에서 먼저 수행한다.
5. 가능한 과목에서는 원본 사진·OCR 전문 대신 사용자가 확인한 문제유형,
   요구사항, 변수·수치·단위, 관계식, 자기 답안과 질문만 전송한다.
6. 원문 전체 remote processing은 exact provider organization, project,
   endpoint, model, capability와 계약에 대해 zero-content-retention route가
   확인되고 written counsel approval가 있을 때만 허용한다.
7. provider 상태가 unknown, stale, retained 또는 human-review-possible이면
   full source를 보내지 않는다.
8. raw source는 DB, Storage, Blob, object store, durable cache, queue, DLQ,
   log, trace, APM, replay, analytics, backup, snapshot, CI artifact, support,
   training/eval, vector store 또는 RAG에 쓰지 않는다.
9. raw processor에는 persistent-store credential을 주지 않는다.
10. raw processing은 synchronous request 하나에서만 수행하며 background,
    batch, webhook, polling object와 automatic retry를 사용하지 않는다.
11. 문제별 full AI output도 server에 저장하거나 다른 사용자에게 재사용하지
    않는다. 필요한 경우 client memory 또는 user-controlled local encrypted
    vault에서만 보관한다.
12. server에는 scrub된 사용자 답안과 source를 복원할 수 없는 closed
    concept/error/rubric/assistance/exposure/next-action evidence만 남긴다.
13. AI output은 원문 문제, 표, 고유한 사례 순서, 오탈자, 출판사 답지의
    목차·문체·암기문구를 재현하지 않는다.
14. transient source에서 생성한 변형문제·해설을 shared bank, verified
    held-out 또는 mastery evidence로 자동 승격하지 않는다.
15. 하나라도 기술적으로 증명할 수 없으면 해당 route는 `blocked`다.

## 4. 직접 테스트 방어

권리자가 자기 문제집으로 가입하고 촬영부터 결과까지 녹화하는 상황을
기본 acceptance로 본다.

다음이 화면과 network record에서 확인돼야 한다.

```text
원문 cloud history 없음
원문·표·답지 표현의 장문 재현 없음
다른 이용자의 기존 답변 호출 없음
책·문제번호 기반 answer lookup 없음
시장 대체형 해설집 기능 없음
사용자의 답안·간극·다음 행동 중심
```

“server에 증거가 없으니 안전하다”가 아니라 “권리자가 직접 시험해도
침해 주장에 유리한 결과를 제품이 만들지 않는다”를 목표로 한다.

## 5. 권리모드

```ts
type SourceRightsModeV1 =
  | "owned_full"
  | "licensed_full"
  | "open_or_public_domain"
  | "official_link_only"
  | "transient_personal_study"
  | "blocked";
```

- persistent/shared/search/RAG 기능은 active exact RightsManifest가 있는
  source에서만 연다.
- 일반 상업 교재와 unknown source는 자동으로 owned/licensed/open이 되지
  않는다.
- 사용자의 구매 진술은 답안길의 저장·재사용 권한이 아니다.
- transient upload를 권리 정리된 corpus로 자동 promotion하지 않는다.

## 6. 저장과 output

### Persistent server에 남길 수 없는 것

```text
원본·crop·thumbnail
OCR 전문·문제 지문·선택지
표·그림·도식·출판사 해설
원문 복원 가능한 structured derivative
prompt와 provider request/response
문제별 전체 AI 풀이와 answer cache
source fingerprint·embedding·RAG
training/evaluation artifact
```

### 남길 수 있는 것

```text
source-expression scrub을 통과한 사용자 답안·수정문
과목·task·concept closed IDs
오류·rubric·biggest-gap codes
assistance/exposure/qualification
repair와 next-action code
D+1·D+7 일정
bodyless rights/provider/deletion receipt
```

### output 원칙

허용:

```text
평가 능력
일반 개념·공식·법리
사용자 답안의 간극
최소 힌트·자기설명 질문
독자적 계산·논증
다음 무도움 확인
```

금지:

```text
원문 전체 재출력
동일 표의 복원
고유 사례·수치·오탈자 순서의 불필요한 재현
출판사 답안 목차·문체 모방
연속 세션을 합친 해설집
```

## 7. 신고·중단·반복 침해

공개 또는 외부 사용 전에 다음을 구현한다.

- 저작권 신고 이메일·form과 지정 수령인
- validly specific notice의 즉시 automated hold
- 권리자와 업로더 통지
- counter-notice·controlled resume
- repeat-infringer warning/suspension/termination
- 권리자 제공 publisher/item fingerprint blocklist
- publisher/source-class block
- 전체 OCR/AI global kill switch
- bodyless 처리시간·결정·재개 audit

사용자 약관에 책임을 전가하는 문구는 이 절차를 대체하지 않는다.

## 8. 운영주체와 감독

개인사업자나 법인 여부와 무관하게 Owner·대표자·실행자의 직접 관여가
문제될 수 있다. 다음을 실제 운영 evidence로 남긴다.

- named Copyright & Rights Owner
- Privacy/CPO 책임자
- provider data-control 책임자
- takedown operator
- high-risk change independent reviewer
- 직원·외주자 교육
- actual sample output audit
- no raw source in issue/PR/support/chat
- provider·law periodic recheck
- incident and kill-switch rehearsal

## 9. 법률·provider checkpoint

- 2026-08-11 시행 예정 저작권법과 시행령을 실제 beta/판매 직전에 다시
  검토한다.
- 고의 침해의 강화된 손해배상, 민사 중지, 형사·양벌, 게시중단 절차를
  counsel memo에 포함한다.
- OpenAI, Gemini 또는 다른 provider는 current official terms, exact
  org/project setting, endpoint/model/capability, file/image exception,
  prompt cache, background mode, subprocessors와 processing region까지 확인한다.
- `not used for training`을 `not retained`와 동일시하지 않는다.
- contract or setting drift가 있으면 full-source route를 자동 차단한다.

## 10. 출시 전 법률 패킷

국내 저작권·개인정보 전문 변호사에게 다음 실제 자료를 제출한다.

```text
실제 업로드·결과 UI
actual end-to-end data flow
모든 persistent sink inventory
provider 계약·DPA·subprocessors·account settings
output sample 20~30개와 source-side comparison
synthetic canary residue scan
zero-write/deletion receipt
notice/counter-notice/repeat-infringer runbook
terms/privacy/AI notice/marketing copy
kill-switch rehearsal
```

blocking issue가 있으면 real third-party source를 처리하지 않는다.

## 11. 단계적 실행

```text
final docs and machine contract
→ live sink inventory
→ D0~D6 type enforcement
→ on-device capture/OCR/minimization
→ Rights Router
→ isolated no-credential processor
→ provider retention firewall
→ output copyright firewall
→ closed learning projection
→ notice/abuse operations
→ hostile synthetic acceptance
→ written legal/privacy review
→ rights-cleared Owner-private activation
→ separate authorization for bounded transient third-party pilot
```

외부 learner, 결제와 Production은 기존 external-commercial gates를 그대로
요구한다.

## 12. 자동 중단

다음 중 하나라도 발견하면 feature 또는 route를 즉시 hold한다.

- raw/OCR/prompt/provider output persistent residue
- source-bound full output cloud history
- provider retention unknown/stale
- cross-user reuse, RAG, embedding, training/eval
- 원문·표·답지 장문 재현
- valid notice 이후 처리 지속
- PDF/answer-key/sequential/multi-account 방어 우회
- privacy/marketing copy와 실제 flow 불일치
- legal blocker

## 13. 최종 불변식

> **답안길은 남의 문제를 소유·축적·재판매하는 서비스가 아니라, 한 번의
> 개인 학습 세션에서 필요한 최소한만 처리한 뒤 원문을 버리고 사용자의
> 사고·오류·교정·복습 evidence만 남기는 튜터로 운영한다. 권리자가 직접
> 테스트해도 원문의 창작적 표현과 출판사 답지가 결과에 재현되지 않아야
> 한다.**
