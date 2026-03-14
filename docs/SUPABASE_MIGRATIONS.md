# Supabase 마이그레이션 실행 가이드

`public.workspaces` 테이블이 없다는 500 에러는 **아직 마이그레이션이 Supabase(entre-map)에 적용되지 않았기 때문**입니다.

**`pnpm db:push` 시 "could not translate host name" (DNS 오류)가 나면** → 로컬/회사망에서 Supabase DB 호스트가 막혀 있을 수 있으므로, 아래 **방법 1 (Dashboard SQL Editor)** 로 실행하는 것이 가장 확실합니다.

---

## SQL 파일 위치

| 순서 | 파일 | 내용 |
|------|------|------|
| 1 | `supabase/migrations/20250314000000_platform_schema.sql` | enum, workspaces, workspace_members, shareholder_lists, shareholders, signup_requests 등 |
| 2 | `supabase/migrations/20250314000001_rls.sql` | RLS 활성화 및 정책 |
| 3 | `supabase/migrations/20250314000002_seed_default_workspace.sql` | (선택) 기본 워크스페이스·기본 명부 생성 후 **excel 전체를 shareholders로 복사**. excel 테이블은 읽기만 하고 수정하지 않음. |
| 4 | `supabase/migrations/20250314000003_seed_ceo_default_workspace.sql` | (선택) **ceo@antre.com** 사용자를 기본 워크스페이스의 최고 관리자(top_admin)로 등록. |
| 5 | `supabase/migrations/20250314000004_seed_ceo_service_admin.sql` | (선택) **ceo@antre.com**을 서비스 관리자(service_admin)로 등록 → 가입 승인 API·통합 관리 접근 가능. |

---

## 방법 1: Supabase Dashboard에서 실행 (권장)

1. [Supabase Dashboard](https://supabase.com/dashboard) → **entre-map** 프로젝트 선택.
2. 왼쪽 **SQL Editor** 클릭.
3. **1단계**: `supabase/migrations/20250314000000_platform_schema.sql` 내용 전체 복사 후 붙여넣기 → **Run**.
4. **2단계**: `supabase/migrations/20250314000001_rls.sql` 내용 전체 복사 후 붙여넣기 → **Run**.
5. (선택) **excel → 기본 워크스페이스 이관**: `public.excel` 테이블에 기존 데이터가 있을 때만 실행.  
   - `20250314000002_seed_default_workspace.sql` 내용을 SQL Editor에 붙여넣고 Run.  
   - **기본 워크스페이스**·**기본 명부**가 없으면 생성한 뒤, `excel`의 모든 행을 `shareholders`로 **복사**합니다.  
   - `excel` 테이블 자체는 변경하지 않습니다(읽기만 수행).

실행 후 **워크스페이스 만들기**를 다시 시도하면 500 없이 동작해야 합니다.

---

## 방법 2: 로컬에서 DB URL로 푸시 (psql)

PostgreSQL 클라이언트(`psql`)가 설치되어 있다면, 연결 정보를 환경 변수로 넣고 한 번에 적용할 수 있습니다.

```bash
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xavgmoavznyppbsfqiis.supabase.co:5432/postgres"
pnpm db:push
```

적용 후 타입 재생성:

```bash
pnpm typegen
```

`scripts/db-push.sh`가 `20250314000000_platform_schema.sql` → `20250314000001_rls.sql` 순으로 실행합니다.

## 방법 3: Supabase CLI로 푸시

프로젝트가 이미 `supabase link`로 연결되어 있다면:

```bash
supabase db push
```

---

## 타입 재생성 (선택)

마이그레이션 적용 후 `src/types/db.ts`를 DB 기준으로 다시 만들려면:

```bash
pnpm typegen
# 또는
pnpm supabase:typegen
```

---

## 참고

- API는 **service role**로 DB에 접근하므로 RLS를 우회합니다. 테이블만 생성되면 워크스페이스 생성 API는 동작합니다.
- RLS는 클라이언트가 Supabase 클라이언트로 직접 접근할 때 적용됩니다.

### 3단계 시드(기본 워크스페이스 + excel 이관) 동작 요약

1. **기본 워크스페이스**: 이름이 `'기본 워크스페이스'`인 workspace가 없으면 하나 생성.
2. **기본 명부**: 해당 워크스페이스 아래 `'기본 명부'` shareholder_list가 없으면 생성.
3. **excel → shareholders**: `public.excel`의 **모든 행**을 읽어서, 위에서 만든 기본 명부의 `shareholders`로 **INSERT**만 수행.  
   - `excel` 테이블은 **수정/삭제하지 않음**.  
   - 이미 해당 명부에 주주가 있으면 이관 INSERT는 건너뜀(한 번만 이관됨).
4. **워크스페이스 멤버**: `auth.users` 중 role에 admin이 포함된 사용자를 기본 워크스페이스의 `top_admin`으로 등록(이미 있으면 무시).
