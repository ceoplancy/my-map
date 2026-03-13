# Clean Architecture & Code Quality Standards

## 원칙 (Principles)

### 1. Clean Architecture 계층 분리

모든 기능은 명확한 계층 구조를 따라야 합니다:

```
┌─────────────────────────────────────────────┐
│  Presentation Layer (UI Components)         │
│  - React Components, Hooks                  │
│  - UI State Management only                 │
├─────────────────────────────────────────────┤
│  Application Layer (Use Cases)              │
│  - Business Logic Orchestration             │
│  - GetXxxUseCase, CreateXxxUseCase          │
├─────────────────────────────────────────────┤
│  Domain Layer (Business Logic)              │
│  - Entities, Value Objects                  │
│  - Business Rules & Validation              │
│  - Domain Errors                            │
├─────────────────────────────────────────────┤
│  Infrastructure Layer (External)            │
│  - Repositories (DB access)                 │
│  - External APIs                            │
│  - Mappers (DTO ↔ Entity)                   │
└─────────────────────────────────────────────┘
```

**의존성 규칙**: 바깥 계층은 안쪽 계층에 의존하지만, 안쪽 계층은 바깥 계층을 알지 못합니다.

### 2. SOLID 원칙 준수

#### Single Responsibility (단일 책임)

- 각 클래스/함수는 하나의 책임만 가져야 함
- God Object 안티패턴 금지
- 함수는 200 라인, 클래스는 500 라인 이하 권장

#### Open/Closed (개방/폐쇄)

- 확장에는 열려있고, 수정에는 닫혀있어야 함
- 인터페이스/추상 클래스 활용

#### Liskov Substitution (리스코프 치환)

- 하위 타입은 상위 타입을 대체 가능해야 함

#### Interface Segregation (인터페이스 분리)

- 클라이언트는 사용하지 않는 인터페이스에 의존하지 않아야 함

#### Dependency Inversion (의존성 역전)

- 구체화가 아닌 추상화에 의존해야 함
- Repository 패턴 활용

### 3. 코드 품질 지표

#### 필수 준수 사항

- TypeScript Coverage: 100% (any 타입 금지)
- ESLint Errors: 0
- Test Coverage: 80%+ (Domain, Use Cases)
- Cyclomatic Complexity: < 10
- Code Duplication: < 5%

#### 성능 지표

- Lighthouse Performance: 90+
- First Load JS: < 300 KB
- Time to Interactive: < 3s

---

## 구현 가이드라인

### 1. Domain Layer 구현

#### Entity (엔티티)

```typescript
// ✅ Good: Validation in constructor
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    private password: string,
  ) {
    this.validate()
  }

  private validate(): void {
    if (!this.email.includes("@")) {
      throw new InvalidEmailError(this.email)
    }
  }

  // Business logic
  changePassword(newPassword: string): void {
    if (newPassword.length < 8) {
      throw new WeakPasswordError()
    }
    this.password = newPassword
  }
}
```

#### Value Object (값 객체)

```typescript
// ✅ Good: Immutable, self-validating
export class Email {
  private readonly value: string

  constructor(email: string) {
    if (!email.includes("@")) {
      throw new InvalidEmailError(email)
    }
    this.value = email
  }

  toString(): string {
    return this.value
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }
}
```

#### Custom Errors

```typescript
// ✅ Good: Semantic error hierarchy
export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true,
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class UserNotFoundError extends DomainError {
  constructor(userId: string) {
    super(`User not found: ${userId}`, "USER_NOT_FOUND", false)
  }
}
```

### 2. Application Layer 구현

#### Use Case

```typescript
// ✅ Good: Single responsibility, testable
export class GetUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly cache: ICache,
  ) {}

  async execute(userId: string): Promise<User> {
    // 1. Check cache
    const cached = await this.cache.get<User>(`user:${userId}`)
    if (cached) return cached

    // 2. Fetch from repository
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new UserNotFoundError(userId)
    }

    // 3. Cache result
    await this.cache.set(`user:${userId}`, user, 3600)

    return user
  }
}
```

### 3. Infrastructure Layer 구현

#### Repository

```typescript
// ✅ Good: Interface in Application, Implementation in Infrastructure
export interface IUserRepository {
  findById(id: string): Promise<User | null>
  save(user: User): Promise<void>
}

export class SupabaseUserRepository implements IUserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") return null
      throw new RepositoryError(error.message)
    }

    return UserMapper.toDomain(data)
  }
}
```

#### Mapper

```typescript
// ✅ Good: Separates DTO from Domain
export class UserMapper {
  static toDomain(dto: UserDTO): User {
    return new User(dto.id, dto.email, dto.password_hash)
  }

  static toDTO(user: User): UserDTO {
    return {
      id: user.id,
      email: user.email,
      password_hash: user.getPasswordHash(),
    }
  }
}
```

### 4. Presentation Layer 구현

#### Hook (UI State Only)

```typescript
// ✅ Good: Delegates to Use Cases
export function useUser(userId: string) {
  const [state, setState] = useState<UserState>({
    user: null,
    loading: true,
    error: null,
  })

  const { getUserUseCase } = useContext(AppContext)

  useEffect(() => {
    const loadUser = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true }))
        const user = await getUserUseCase.execute(userId)
        setState({ user, loading: false, error: null })
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }))
      }
    }

    loadUser()
  }, [userId])

  return state
}
```

---

## 테스트 전략

### 1. Test-Driven Development (TDD)

#### Red-Green-Refactor Cycle

1. **Red**: 실패하는 테스트 작성
2. **Green**: 테스트를 통과하는 최소 코드 작성
3. **Refactor**: 코드 개선 (테스트는 여전히 통과)

#### 구현 순서

```
1. Domain Layer Tests → Domain Implementation
2. Use Case Tests → Use Case Implementation
3. Repository Tests (with mocks) → Repository Implementation
4. Integration Tests → Full flow verification
```

### 2. 테스트 커버리지 목표

#### Unit Tests (80%+)

- Domain Entities: 100%
- Value Objects: 100%
- Use Cases: 90%+
- Mappers: 80%+

#### Integration Tests (60%+)

- Repositories: 70%+
- API Routes: 60%+

#### E2E Tests (Critical Flows)

- User Registration & Login
- Core Feature Flows
- Error Scenarios

### 3. 테스트 작성 예시

#### Domain Entity Test (TDD)

```typescript
// ❶ RED: Write failing test first
describe("User Entity", () => {
  it("should throw error for invalid email", () => {
    expect(() => {
      new User("123", "invalid-email", "password123")
    }).toThrow(InvalidEmailError)
  })

  it("should create valid user", () => {
    const user = new User("123", "test@example.com", "password123")
    expect(user.email).toBe("test@example.com")
  })

  it("should not allow weak password", () => {
    const user = new User("123", "test@example.com", "password123")
    expect(() => user.changePassword("weak")).toThrow(WeakPasswordError)
  })
})

// ❷ GREEN: Implement User class to pass tests
// ❸ REFACTOR: Improve code quality
```

#### Use Case Test (with Mocks)

```typescript
describe("GetUserUseCase", () => {
  let useCase: GetUserUseCase
  let mockRepository: jest.Mocked<IUserRepository>
  let mockCache: jest.Mocked<ICache>

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    }
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    }
    useCase = new GetUserUseCase(mockRepository, mockCache)
  })

  it("should return cached user if available", async () => {
    const cachedUser = new User("123", "test@example.com", "hash")
    mockCache.get.mockResolvedValue(cachedUser)

    const result = await useCase.execute("123")

    expect(result).toBe(cachedUser)
    expect(mockRepository.findById).not.toHaveBeenCalled()
  })

  it("should fetch from repository if not cached", async () => {
    const user = new User("123", "test@example.com", "hash")
    mockCache.get.mockResolvedValue(null)
    mockRepository.findById.mockResolvedValue(user)

    const result = await useCase.execute("123")

    expect(result).toBe(user)
    expect(mockCache.set).toHaveBeenCalledWith("user:123", user, 3600)
  })

  it("should throw error if user not found", async () => {
    mockCache.get.mockResolvedValue(null)
    mockRepository.findById.mockResolvedValue(null)

    await expect(useCase.execute("123")).rejects.toThrow(UserNotFoundError)
  })
})
```

---

## 에러 처리 전략

### 1. Custom Error Hierarchy

```typescript
// Base Error
export abstract class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly recoverable: boolean = true,
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

// Domain Errors (4xx)
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400, false)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND", 404, true)
  }
}

// Infrastructure Errors (5xx)
export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, "DATABASE_ERROR", 500, false)
  }
}
```

### 2. Error Monitoring Integration

```typescript
// Centralized error reporter
export class ErrorReporter {
  static report(error: Error, context?: Record<string, unknown>): void {
    console.error("[ErrorReporter]", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    })

    if (process.env.NODE_ENV === "production") {
      // Sentry.captureException(error, { extra: context })
    }
  }
}
```

---

## 코드 리뷰 체크리스트

### Before Committing

- [ ] 모든 테스트 통과 (`pnpm test`)
- [ ] TypeScript 에러 없음 (`pnpm tsc --noEmit`)
- [ ] ESLint 에러 없음 (`pnpm lint`)
- [ ] 빌드 성공 (`pnpm build`)
- [ ] 테스트 커버리지 80%+ 유지

### Architecture Review

- [ ] 계층 분리가 명확한가?
- [ ] 의존성 방향이 올바른가? (안쪽 → 바깥쪽)
- [ ] SRP를 준수하는가?
- [ ] God Object가 없는가?

### Code Quality

- [ ] 함수/클래스 크기가 적절한가?
- [ ] Cyclomatic Complexity < 10
- [ ] 중복 코드 없음
- [ ] 네이밍이 명확하고 일관적인가?

### Testing

- [ ] TDD 순서로 작성되었는가?
- [ ] 모든 엣지 케이스가 테스트되었는가?
- [ ] 모의 객체(Mock)가 적절히 사용되었는가?
- [ ] Integration test가 있는가?

---

## 참고 자료

### Books

- **Clean Architecture** - Robert C. Martin
- **Domain-Driven Design** - Eric Evans
- **Test Driven Development** - Kent Beck

### Code Examples

- [bulletproof-react](https://github.com/alan2207/bulletproof-react)
- [nestjs/nest](https://github.com/nestjs/nest)

### Tools

- **Jest/Vitest**: Unit/Integration Testing
- **Playwright**: E2E Testing
- **Storybook**: Component Documentation
- **SonarQube**: Code Quality Analysis
