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

---

## "워크스페이스가 없습니다"가 나올 때

로그인은 되는데 `/workspaces`에서 "워크스페이스가 없습니다"만 보인다면, **해당 사용자가 `workspace_members`에 한 건도 없다**는 뜻입니다.

### 원인

- **프로덕션 Supabase에 시드 미적용**: `20250314000002`(기본 워크스페이스), `20250314000003`(ceo@antre.com → 기본 워크스페이스), `20250314000004`(ceo@antre.com → service_admin)를 **배포용 DB**에서 아직 실행하지 않았을 수 있음.
- **다른 이메일로 로그인**: 시드는 **ceo@antre.com** 한 계정만 기본 워크스페이스/서비스관리자로 넣음. 그 이메일이 아니면 워크스페이스가 비어 있음.
- **사용자 생성 시점**: `20250314000002`는 마이그레이션 실행 시점의 `auth.users` 중 `role`에 admin이 포함된 사람만 멤버로 넣음. 나중에 만든 admin 사용자는 시드에 포함되지 않음.

### 확인 방법

1. **Vercel 로그**: 배포 후 `/workspaces` 접속 시 `[api/me/workspaces] No workspace memberships for user <user_id> <email>` 로그가 보이면, API까지는 정상 호출된 것이고 DB에 멤버십이 없다는 뜻.
2. **Supabase Dashboard**  
   - **Authentication → Users**: 로그인에 쓰는 이메일의 `id`(UUID) 확인.  
   - **Table Editor → workspace_members**: 위 `user_id`로 조회했을 때 행이 있는지 확인.  
   - **Table Editor → workspaces**: 행이 하나 이상 있는지 확인.

### 해결

- **ceo@antre.com**으로 테스트하는 경우: 위 마이그레이션 순서대로 **3, 4, 5번** SQL을 배포용 Supabase SQL Editor에서 실행.  
  - 3: `20250314000002_seed_default_workspace.sql` (기본 워크스페이스 + admin 역할 사용자 멤버 등록)  
  - 4: `20250314000003_seed_ceo_default_workspace.sql` (ceo@antre.com → 기본 워크스페이스 top_admin)  
  - 5: `20250314000004_seed_ceo_service_admin.sql` (ceo@antre.com → service_admin)
- **다른 이메일** 사용자를 기본 워크스페이스에 넣으려면 SQL Editor에서 한 번만 실행:

```sql
-- 기본 워크스페이스가 있다고 가정. YOUR_USER_EMAIL을 실제 이메일로 바꿈.
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, u.id, 'top_admin'
FROM public.workspaces w
CROSS JOIN auth.users u
WHERE w.name = '기본 워크스페이스'
  AND u.email = 'YOUR_USER_EMAIL'
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'top_admin';
```
