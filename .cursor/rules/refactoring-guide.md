# 리팩터링 가이드라인 (Refactoring Guidelines)

**기반 원칙**: 로버트 C. 마틴의 클린 코드 & 보이스카우트 원칙  
**적용 시점**: 모든 코드 변경 작업  
**목표**: 항상 실행 가능한 코드 유지, 유지보수성 향상

---

## 🎯 핵심 원칙

### 1. 보이스카우트 원칙 (Boy Scout Rule)

> "코드를 체크아웃할 때보다 체크인할 때 더 깨끗하게 만들어라."

**적용 방법**:
- 작은 변경이라도 코드 품질을 개선
- 중복 코드 발견 시 즉시 제거
- 의미 없는 이름 발견 시 즉시 개선
- 불필요한 주석 제거

**예시**:
```typescript
// ❌ Bad: 중복된 유틸리티 함수
// lib/utils.ts
export function cn(...inputs: ClassValue[]) { ... }

// lib/utils/tw.ts  
export function cn(...inputs: ClassValue[]) { ... }

// ✅ Good: 통합 후
// lib/utils/tw.ts만 유지
export function cn(...inputs: ClassValue[]) { ... }
```

### 2. 작은 단계로 진행 (Small Steps)

> "리팩터링은 작은 단계로 진행해야 한다. 각 단계는 시스템을 작동 상태로 유지해야 한다."

**적용 방법**:
- 한 번에 하나의 변경만 수행
- 각 변경 후 빌드/테스트 확인
- 커밋 단위를 작게 유지
- 큰 변경은 여러 단계로 분할

**예시**:
```typescript
// ❌ Bad: 한 번에 모든 것 변경
// - 파일 이동 + 이름 변경 + import 경로 변경 + 기능 추가

// ✅ Good: 단계별 진행
// Step 1: 파일 이름 변경만
// Step 2: import 경로 업데이트
// Step 3: 기능 추가 (별도 커밋)
```

### 3. 의미 있는 이름 사용 (Meaningful Names)

> "코드는 작성하는 것보다 읽는 시간이 더 많다. 이름은 의도를 명확히 전달해야 한다."

**적용 방법**:
- 파일명으로 목적이 명확해야 함
- 함수명으로 동작이 예측 가능해야 함
- 변수명으로 의미가 분명해야 함

**예시**:
```typescript
// ❌ Bad: 모호한 이름
// lib/validation/schema-validator.ts (폼 데이터 검증인지 스키마 검증인지 불명확)

// ✅ Good: 명확한 이름
// lib/validation/form-validator.ts (폼 데이터 검증)
// lib/validation/schema-validator.ts (스키마 구조 검증)
```

### 4. 중복 제거 (Remove Duplication)

> "DRY (Don't Repeat Yourself) 원칙: 같은 지식을 여러 곳에 표현하지 말라."

**적용 방법**:
- 동일한 로직이 2곳 이상 있으면 함수로 추출
- 유사한 패턴이 반복되면 공통 유틸리티 생성
- 타입 정의 중복 시 공통 타입 파일로 이동

**예시**:
```typescript
// ❌ Bad: 중복된 타입 정의
// features/auth/types.ts
export interface User { id: string; email: string; }

// features/bizm/types.ts
export interface User { id: string; email: string; }

// ✅ Good: 공통 타입 사용
// features/common/types.ts
export interface User { id: string; email: string; }
```

### 5. 단일 책임 원칙 (Single Responsibility)

> "하나의 함수/클래스/모듈은 하나의 변경 이유만 가져야 한다."

**적용 방법**:
- 함수는 한 가지 일만 수행
- 클래스는 하나의 책임만 가짐
- 모듈은 하나의 목적만 가짐

**예시**:
```typescript
// ❌ Bad: 여러 책임을 가진 함수
function processUser(user: User) {
  validateUser(user)      // 검증
  saveToDatabase(user)    // 저장
  sendEmail(user)         // 이메일 발송
  logActivity(user)       // 로깅
}

// ✅ Good: 단일 책임 분리
function validateUser(user: User): ValidationResult { ... }
function saveUser(user: User): Promise<void> { ... }
function sendWelcomeEmail(user: User): Promise<void> { ... }
function logUserActivity(user: User): void { ... }
```

---

## 📋 리팩터링 체크리스트

### 변경 전 (Before)

- [ ] 현재 코드의 문제점 파악
- [ ] 리팩터링 범위 결정
- [ ] 영향받는 파일 목록 작성
- [ ] 테스트 계획 수립

### 변경 중 (During)

- [ ] 작은 단계로 진행
- [ ] 각 단계마다 빌드 확인
- [ ] 의미 있는 이름 사용
- [ ] 중복 코드 제거
- [ ] 단일 책임 원칙 준수

### 변경 후 (After)

- [ ] 빌드 성공 확인
- [ ] 린트 오류 없음 확인
- [ ] 타입 체크 통과 확인
- [ ] 커밋 메시지 작성
- [ ] 문서 업데이트

---

## 🔄 리팩터링 워크플로우

### 1. VAN 모드: 문제 발견 및 분석

```markdown
1. 코드베이스 스캔
2. 중복/불일치 발견
3. 우선순위 결정
4. 영향도 분석
```

### 2. PLAN 모드: 리팩터링 계획 수립

```markdown
1. 변경 사항 정의
2. 단계별 작업 계획
3. 테스트 계획
4. 롤백 계획
```

### 3. IMPLEMENT 모드: 코드 변경

```markdown
1. 작은 단계로 진행
2. 각 단계마다 빌드 확인
3. 의미 있는 이름 사용
4. 중복 제거
```

### 4. REFLECT 모드: 검토 및 학습

```markdown
1. 변경 사항 검토
2. 개선 사항 기록
3. 패턴 문서화
4. 다음 작업 계획
```

---

## 🎨 프로젝트별 적용 가이드

### Next.js App Router 프로젝트

**디렉토리 구조**:
```
src/
├── app/              # Next.js App Router (라우트)
├── components/       # 재사용 가능한 UI 컴포넌트
├── features/         # 기능별 모듈 (Feature-based)
├── lib/              # 유틸리티 및 헬퍼 함수
├── hooks/            # 커스텀 훅
└── types/            # 공통 타입 정의
```

**리팩터링 우선순위**:
1. **P0**: 중복 코드 제거, 파일 구조 일관성
2. **P1**: 의미 있는 이름 사용, 단일 책임 원칙
3. **P2**: Import 경로 통일, 타입 안정성 향상

### TypeScript 프로젝트

**타입 안정성**:
- `any` 타입 사용 금지
- 명시적 타입 정의
- 타입 가드 활용

**예시**:
```typescript
// ❌ Bad: any 사용
function processData(data: any) { ... }

// ✅ Good: 명시적 타입
function processData(data: UserData | ProjectData) { ... }
```

### React 프로젝트

**컴포넌트 구조**:
- 단일 책임 원칙
- Props 타입 명시
- 커스텀 훅으로 로직 분리

**예시**:
```typescript
// ❌ Bad: 모든 로직이 컴포넌트에
function UserList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  // ... 많은 로직
}

// ✅ Good: 커스텀 훅으로 분리
function useUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  // ... 로직
  return { users, loading }
}

function UserList() {
  const { users, loading } = useUsers()
  // ... 렌더링만
}
```

---

## 🚨 주의사항

### 절대 하지 말아야 할 것

1. **--no-verify(-n) 옵션 사용 금지**
   - Husky, lint-staged, 타입 검사 등 pre-commit 훅은 항상 실행한다. 빌드/훅이 오래 걸려도 정석대로 커밋하고, 필요하면 훅·스크립트를 최적화한다.
   - 리팩터링 중에는 더욱 엄격하게 검증해야 함

2. **한 번에 너무 많은 변경**
   - 작은 단계로 나누어 진행
   - 각 단계마다 커밋

3. **기능 추가와 리팩터링 혼합**
   - 리팩터링은 별도 커밋으로
   - 기능 추가는 별도 커밋으로

### 반드시 해야 할 것

1. **빌드 확인**
   - 변경 후 반드시 빌드 테스트
   - 타입 체크 통과 확인

2. **커밋 메시지 작성**
   - 명확한 변경 사항 설명
   - 관련 이슈/문서 참조

3. **문서 업데이트**
   - 변경 사항을 문서에 반영
   - 패턴을 .cursor/rules에 기록

---

## 📚 참고 자료

### 책
- **Clean Code** - Robert C. Martin
- **Refactoring** - Martin Fowler
- **The Clean Coder** - Robert C. Martin

### 원칙
- **SOLID 원칙**
- **DRY (Don't Repeat Yourself)**
- **KISS (Keep It Simple, Stupid)**
- **YAGNI (You Aren't Gonna Need It)**

---

## 🔗 관련 문서

- [Clean Architecture & Code Quality Standards](./clean-architecture-tdd.md)
- [Memory Bank Integration](./memory-bank-integration.mdc)
- [PRD and ADR Integration](./prd-adr-integration.mdc)

---

**작성일**: 2025-12-04  
**최종 업데이트**: 2025-12-04  
**유지보수**: 리팩터링 작업 시마다 업데이트

