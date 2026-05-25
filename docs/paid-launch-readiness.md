# Paid Launch Readiness Gate v1

이 문서는 **유료 출시 준비도 하드 게이트**입니다. 목적은 Inverge가 제품·개인정보·과금·AI 품질·신뢰성·고객지원 기준을 충족하기 전에는 유료 출시 준비 완료로 간주되지 않도록 막는 것입니다.

## 핵심 원칙

- 이 체크리스트는 **CI 통과와 별개**입니다.
- 즉, 테스트/빌드가 통과해도 아래 유료 출시 게이트를 통과하지 못하면 유료 출시 준비 완료가 아닙니다.
- 게이트 판정의 기준값은 `config/paid-launch-readiness.json` 입니다.
- 자동 검증은 `npm run check:paid-launch-readiness` 로 수행합니다.

## Launch Checklist

아래 항목은 유료 출시 전 필수 점검 대상입니다.

### Product flow

- [ ] Auth/session works
- [ ] Onboarding works
- [ ] Today Plan works
- [ ] Review Queue works
- [ ] Capture save works
- [ ] Answer Review works

### Privacy

- [ ] Privacy copy exists
- [ ] Delete/export flow exists or is explicitly disabled for paid launch

### Billing & entitlement

- [ ] Billing/entitlement enforcement exists
- [ ] Usage limits are enforced

### AI quality & safety

- [ ] AI forbidden claims are blocked
- [ ] OCR uncertainty copy exists

### Support, policy, reliability

- [ ] Support contact exists
- [ ] Refund/cancellation copy exists
- [ ] Error monitoring is configured
- [ ] Cost guardrails exist
- [ ] Staging smoke passes

## Machine-readable gates

자동 판정 게이트 키:

- `billingConfigured`
- `entitlementEnforced`
- `privacyExportImplemented`
- `privacyDeleteImplemented`
- `supportContactVisible`
- `refundPolicyVisible`
- `aiQualityEvalPassing`
- `learnerLoopHealthPassing`
- `stagingSmokeConfigured`
- `costGuardrailsConfigured`

모든 필수 게이트가 `true` 일 때만 paid launch readiness check가 통과됩니다.
