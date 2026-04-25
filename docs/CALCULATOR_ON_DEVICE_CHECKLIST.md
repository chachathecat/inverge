# CALCULATOR_ON_DEVICE_CHECKLIST

## 목적
이 문서는 **Calculator Workflow v1**의 실제 기기 검증 체크리스트다.  
목표는 다음 두 가지다.

1. **공통 계산 절차 카드**가 실제 문제 풀이 흐름에 도움이 되는지 확인한다.  
2. **FX-9860GIII 기기별 부록**의 버튼 경로와 세팅 설명이 실제 기기에서 맞는지 검증한다.

이 문서는 **시험 허용 여부를 판단하는 문서가 아니다.**  
시험장 반입 가능 여부, 초기화 필요 여부, 허용 기종 범위는 반드시 **최신 공식 시험 공고/수험자 안내**를 별도로 확인한다.

---

## 현재 검증 범위

### 포함
- 감평 1차 **회계학**
- 감평 2차 **감정평가실무**
- 공통 계산 절차 카드
- FX-9860GIII 기기별 부록(Draft/Beta)

### 제외
- 모든 과목용 계산기 가이드
- 자동 풀이 엔진
- 시험 허용성 단정
- 타 계산기 모델 검증

---

## 검증 원칙

- 공통 workflow core와 기기별 appendix를 **분리해서** 본다.
- 공통 workflow는 실제 문제 풀이 절차에 도움이 되는지 본다.
- FX-9860GIII 버튼 경로는 **실기 검증 전까지 Draft/Beta**로 유지한다.
- 하나라도 불확실하면 **Verified로 승격하지 않는다**.
- “되는 것 같음”이 아니라 **직접 눌러보고 재현**해야 한다.

---

## 검증 메타 정보

- 검증 날짜:
- 검증자:
- 기기 모델:
- 펌웨어/OS 버전(확인 가능 시):
- 검증 장소:
- 검증 목적:
- 참고 자료(문제/강평/정리 노트):

---

## 최종 판정 기준

### Verified
아래를 모두 만족할 때만 Verified로 본다.
- 버튼 경로가 실제 기기와 일치함
- 계산 결과가 기대값과 일치함
- 검산 체크가 실제로 유효함
- 답안에 옮길 값/표현이 문제 풀이 흐름과 맞음
- 과신 표현 없이 안전하게 설명 가능함

### Draft/Beta 유지
아래 중 하나라도 해당하면 Draft/Beta 유지
- 버튼 경로가 모호함
- 설정 경로가 확정되지 않음
- Ans/메모리/이전 결과 재사용이 시험용으로 적절한지 불명확함
- 계산 결과는 맞지만 절차 설명이 비효율적임
- 답안 반영 가이드가 불안정함

---

# 1. 공통 기기 검증

## 1-1. 기본 상태 / 리셋

- [ ] 전원 켜기 경로 확인
- [ ] 리셋 진입 경로 확인
- [ ] 리셋 후 기본 화면으로 정상 복귀하는지 확인
- [ ] 리셋이 시험용 세팅에 어떤 영향을 주는지 확인
- [ ] 리셋 후 저장값/이전 결과/메모리 관련 상태 확인

메모:
- 실제 버튼 경로:
- 주의점:
- 검증 결과: Pass / Fail / Hold

---

## 1-2. 기본 세팅

- [ ] 표시 형식 관련 기본 세팅 경로 확인
- [ ] 소수 표시/반올림 표시 관련 경로 확인
- [ ] 분수/소수 변환이 필요한 경우 흐름 확인
- [ ] 세팅 후 기본 계산 화면으로 돌아가는 경로 확인

메모:
- 실제 버튼 경로:
- 주의점:
- 검증 결과: Pass / Fail / Hold

---

## 1-3. 기본 입력 동작

아래를 실제로 눌러보고 동작 확인:

- [ ] 괄호 입력
- [ ] 삭제
- [ ] 전체 지우기
- [ ] 등호
- [ ] 이전 결과 표시
- [ ] 한 줄 계산 반복 가능 여부
- [ ] 기본 사칙연산 안정성

메모:
- 실제 버튼 경로:
- 주의점:
- 검증 결과: Pass / Fail / Hold

---

## 1-4. 시험용 제외 후보 확인

다음 항목은 알파 가이드에서 제외 유지가 맞는지 확인:

- [ ] Ans 사용
- [ ] Memory 사용
- [ ] 이전 결과 재사용
- [ ] 고급 기능/저장 기능
- [ ] 프로그램/통신 관련 기능

결론:
- [ ] 계속 제외
- [ ] 제한적으로 허용 가능
- [ ] 추가 검토 필요

메모:

---

# 2. 감평 1차 회계학 검증

## 공통 확인 질문
각 문제유형마다 아래를 반드시 확인한다.

- [ ] 이 카드가 **언제 쓰는지** 명확한가
- [ ] **먼저 적을 값**이 적절한가
- [ ] **계산 순서**가 실제로 빠르고 안전한가
- [ ] **버튼 경로**가 실제 기기와 맞는가
- [ ] **흔한 실수**가 현실적인가
- [ ] **검산 체크**가 실제로 도움이 되는가
- [ ] **답안에 옮길 값** 안내가 충분한가

---

## 2-1. 재고자산

### 예제 정보
- 문제 출처:
- 문제 유형:
- 기대 결과:

### 체크
- [ ] when to use 설명 적절
- [ ] values to write first 적절
- [ ] calculation order 적절
- [ ] button path 일치
- [ ] common mistakes 유효
- [ ] verification check 유효
- [ ] what to copy into the answer 유효

### 결과
- 계산 결과 일치: Yes / No
- 검산 통과: Yes / No
- 카드 수정 필요: Yes / No

### 메모
- 잘 된 점:
- 수정할 점:
- 위험한 설명:
- 최종 판정: Verified / Draft / Hold

---

## 2-2. 감가상각

### 예제 정보
- 문제 출처:
- 문제 유형:
- 기대 결과:

### 체크
- [ ] when to use 설명 적절
- [ ] values to write first 적절
- [ ] calculation order 적절
- [ ] button path 일치
- [ ] common mistakes 유효
- [ ] verification check 유효
- [ ] what to copy into the answer 유효

### 결과
- 계산 결과 일치: Yes / No
- 검산 통과: Yes / No
- 카드 수정 필요: Yes / No

### 메모
- 잘 된 점:
- 수정할 점:
- 위험한 설명:
- 최종 판정: Verified / Draft / Hold

---

## 2-3. 현재가치

### 예제 정보
- 문제 출처:
- 문제 유형:
- 기대 결과:

### 체크
- [ ] when to use 설명 적절
- [ ] values to write first 적절
- [ ] calculation order 적절
- [ ] button path 일치
- [ ] common mistakes 유효
- [ ] verification check 유효
- [ ] what to copy into the answer 유효

### 결과
- 계산 결과 일치: Yes / No
- 검산 통과: Yes / No
- 카드 수정 필요: Yes / No

### 메모
- 잘 된 점:
- 수정할 점:
- 위험한 설명:
- 최종 판정: Verified / Draft / Hold

---

# 3. 감평 2차 실무 검증

## 공통 확인 질문
각 문제유형마다 아래를 반드시 확인한다.

- [ ] 이 카드가 **언제 쓰는지** 명확한가
- [ ] **먼저 적을 값**이 적절한가
- [ ] **계산 순서**가 실제 실무 풀이 흐름과 맞는가
- [ ] **버튼 경로**가 실제 기기와 맞는가
- [ ] **흔한 실수**가 현실적인가
- [ ] **검산 체크**가 실제로 도움이 되는가
- [ ] **답안에 옮길 값** 안내가 적절한가

---

## 3-1. 보정 계산

### 예제 정보
- 문제 출처:
- 문제 유형:
- 기대 결과:

### 체크
- [ ] when to use 설명 적절
- [ ] values to write first 적절
- [ ] calculation order 적절
- [ ] button path 일치
- [ ] common mistakes 유효
- [ ] verification check 유효
- [ ] what to copy into the answer 유효

### 결과
- 계산 결과 일치: Yes / No
- 검산 통과: Yes / No
- 카드 수정 필요: Yes / No

### 메모
- 잘 된 점:
- 수정할 점:
- 위험한 설명:
- 최종 판정: Verified / Draft / Hold

---

## 3-2. 수익방식

### 예제 정보
- 문제 출처:
- 문제 유형:
- 기대 결과:

### 체크
- [ ] when to use 설명 적절
- [ ] values to write first 적절
- [ ] calculation order 적절
- [ ] button path 일치
- [ ] common mistakes 유효
- [ ] verification check 유효
- [ ] what to copy into the answer 유효

### 결과
- 계산 결과 일치: Yes / No
- 검산 통과: Yes / No
- 카드 수정 필요: Yes / No

### 메모
- 잘 된 점:
- 수정할 점:
- 위험한 설명:
- 최종 판정: Verified / Draft / Hold

---

## 3-3. 거래사례비교

### 예제 정보
- 문제 출처:
- 문제 유형:
- 기대 결과:

### 체크
- [ ] when to use 설명 적절
- [ ] values to write first 적절
- [ ] calculation order 적절
- [ ] button path 일치
- [ ] common mistakes 유효
- [ ] verification check 유효
- [ ] what to copy into the answer 유효

### 결과
- 계산 결과 일치: Yes / No
- 검산 통과: Yes / No
- 카드 수정 필요: Yes / No

### 메모
- 잘 된 점:
- 수정할 점:
- 위험한 설명:
- 최종 판정: Verified / Draft / Hold

---

# 4. 제품 노출 검증

## 4-1. 노출 위치
- [ ] 회계학 컨텍스트에서만 `계산기 스텝`이 잘 보임
- [ ] 실무 컨텍스트에서만 `계산기 스텝`이 잘 보임
- [ ] 계산 실수 태그 item detail에서 `관련 계산기 스텝 보기`가 보임
- [ ] 전 과목 공통 기능처럼 과하게 노출되지 않음

메모:

---

## 4-2. 문구 안전성
- [ ] 시험 허용 모델처럼 읽히지 않음
- [ ] “정답 보장”, “자동 풀이”, “시험 승인” 같은 표현 없음
- [ ] `Draft/Beta` 표기가 충분히 명확함
- [ ] 공통 workflow core와 device appendix 구분이 명확함

메모:

---

# 5. 검증 결과 요약

## 공통 기기 검증
- 리셋: Pass / Fail / Hold
- 기본 세팅: Pass / Fail / Hold
- 기본 입력 동작: Pass / Fail / Hold
- 제외 항목 정책: 유지 / 수정 필요

## 회계학
- 재고자산: Verified / Draft / Hold
- 감가상각: Verified / Draft / Hold
- 현재가치: Verified / Draft / Hold

## 실무
- 보정 계산: Verified / Draft / Hold
- 수익방식: Verified / Draft / Hold
- 거래사례비교: Verified / Draft / Hold

---

# 6. 최종 조치

## 바로 반영할 수정
- [ ]
- [ ]
- [ ]

## 계속 Draft/Beta로 유지할 항목
- [ ]
- [ ]
- [ ]

## 다음 검증 필요 항목
- [ ]
- [ ]
- [ ]

---

# 7. 최종 서명

- 검증자:
- 최종 판단:
  - [ ] 공통 workflow core는 alpha에 사용 가능
  - [ ] FX-9860GIII appendix 일부 Verified 가능
  - [ ] FX-9860GIII appendix는 전부 Draft/Beta 유지
  - [ ] 사용자 노출 전 추가 검증 필요
- 비고: