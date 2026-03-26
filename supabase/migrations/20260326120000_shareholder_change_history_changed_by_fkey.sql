-- changed_by: NOT NULL 열에는 ON DELETE SET NULL 을 둘 수 없음(PostgreSQL 제약).
-- 프로덕션에서 제약 이름이 다를 수 있어 IF EXISTS 로 드롭 후 CASCADE 로 재생성한다.
-- auth.users 행 삭제 시 해당 사용자가 남긴 변경 이력 행도 함께 삭제된다.
ALTER TABLE public.shareholder_change_history
  DROP CONSTRAINT IF EXISTS shareholder_change_history_changed_by_fkey;

ALTER TABLE public.shareholder_change_history
  ADD CONSTRAINT shareholder_change_history_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE CASCADE;
