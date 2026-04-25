# 감정평가사 alpha smoke checklist

## 목적

Inverge alpha가 범용 오답 도구가 아니라 감정평가사 1차/2차 Pass Management OS처럼 보이고 동작하는지 확인한다.

## 필수 경로

1. 로그인 후 `/app` 진입
   - `/login`에서 cookie mutation 에러가 없어야 한다.
   - `/app`에서 "감평사 오늘의 운영", "다음 행동 1개" 문맥이 보여야 한다.

2. 1차 흐름
   - `/app/onboarding`에서 `감정평가사 1차`를 선택한다.
   - 과목 preset이 `민법`, `경제학원론`, `회계학`, `부동산학원론`으로 보여야 한다.
   - `/app/capture`에서 민법 오답 1개를 저장한다.
   - 상세 화면에서 정답/근거, 내 답/선택, 오답 교정 포인트가 보여야 한다.
   - `/app/review`에 다시 볼 항목이 생성되어야 한다.
   - `/app/weekly`가 항목 누적 후 감평 학습 정리 문장으로 보여야 한다.

3. 2차 흐름
   - `/app/onboarding`에서 `감정평가사 2차`를 선택한다.
   - 과목 preset이 `감정평가실무`, `감정평가이론`, `감정평가 및 보상법규`로 보여야 한다.
   - `/app/capture`가 "2차 답안 비교" 문맥으로 보여야 한다.
   - 작업 단계 preset이 `답안 작성`, `비교`, `보강`, `교정 노트`로 보여야 한다.
   - 저장 후 상세 화면에서 기준 답안/강평, 내 답안, 교정 노트가 보여야 한다.

4. 운영 확인
   - `/admin/alpha`에서 최근 이벤트와 피드백이 보여야 한다.
   - production에서는 개발 진단 블록이 보이지 않아야 한다.
   - 모바일 폭에서 `/app`, `/app/capture`, `/app/review`의 핵심 CTA가 접히거나 잘리지 않아야 한다.

## 문구 기준

- 사용자-facing 문구에서 `study profile`, `wrong answer item`, `generic review-os` 같은 표현을 쓰지 않는다.
- "점수"보다 "다음 행동 1개", "다시 볼 항목", "보강 포인트", "rewrite"를 우선한다.
- 과장된 동기부여 문장보다 실행 문장을 사용한다.

## 릴리스 전 확인

```bash
npm run lint
npm run build
npm run verify:review-os-schema
```

원격 Supabase에서 `verify:review-os-schema`가 실패하면 Review OS alpha migration 또는 PostgREST schema cache refresh가 완료되지 않은 상태다.
