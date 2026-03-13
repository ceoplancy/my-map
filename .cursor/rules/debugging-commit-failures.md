# 커밋 실패 디버깅 가이드

## 원칙

- **`--no-verify` / `-n` 사용 금지.** pre-commit·commit-msg 훅을 건너뛰지 않는다. 커밋이 오래 걸려도 훅을 통과한 뒤 커밋한다.
- 커밋 실패 시 **권한 문제로 즉시 결론 내리지 말 것**. 대부분의 경우 린터/타입/빌드 에러이다.

## 체크리스트 (순서대로)

### 1. 린터 에러 확인 (가장 흔한 원인)

```bash
# 문제가 되는 파일만 확인
pnpm exec next lint --file <파일경로>

# 또는 전체 확인 (시간이 오래 걸릴 수 있음)
pnpm exec next lint
```

**주의사항:**
- husky 실패 메시지 **위에** 실제 에러가 있음
- 파일 경로와 줄 번호를 정확히 확인
- `@typescript-eslint/no-base-to-string` 같은 구체적인 에러 코드 확인

### 2. 타입 에러 확인

```bash
pnpm exec tsc --noEmit
```

### 3. 빌드 에러 확인

```bash
pnpm build
```

### 4. 권한 문제 확인 (드물게 발생)

권한 문제는 보통 다음과 같은 경우에만 발생:
- 파일 시스템 권한 문제
- npm/node_modules 접근 권한 문제
- Git 저장소 권한 문제

## 흔한 린터 에러 패턴

### `@typescript-eslint/no-base-to-string`
**문제:** 객체를 `String()`으로 직접 변환하면 `[object Object]`가 됨

**해결:**
```typescript
// ❌ 나쁜 예
const message = String(error)

// ✅ 좋은 예
const errorToString = (err: unknown): string => {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  if (typeof err === "object" && err !== null) {
    try {
      return JSON.stringify(err)
    } catch {
      return "[Object]"
    }
  }
  return String(err)
}
```

### `@typescript-eslint/no-explicit-any`
**문제:** `any` 타입 사용

**해결:** `unknown` 타입 사용 + 타입 가드

### `react-hooks/exhaustive-deps`
**문제:** React Hook 의존성 배열 누락

**해결:** 의존성 배열에 필요한 값 추가

## 디버깅 전략

1. **에러 메시지를 처음부터 끝까지 읽기**
   - husky 실패 메시지는 결과일 뿐
   - 실제 원인은 그 위에 있음

2. **단계별로 문제 확인**
   - 린터 → 타입 → 빌드 → 권한 순서

3. **구체적인 에러 코드로 검색**
   - `@typescript-eslint/no-base-to-string` 같은 구체적인 코드

4. **린터 자동 수정 시도**
   ```bash
   pnpm exec next lint --fix
   ```

## 예방 조치

1. **커밋 전 자동 체크**
   - IDE에서 ESLint 확장 프로그램 사용
   - 저장 시 자동 린터 실행

2. **CI/CD 설정**
   - 린터 에러가 있으면 빌드 실패하도록 설정

3. **팀 규칙**
   - 커밋 전에 린터 실행하는 습관화

## 관련 문서

- `memory-bank/LESSONS_LEARNED_COMMIT_FAILURE.md`: 상세한 사례 분석

