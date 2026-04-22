-- 현장요원 업무·비밀유지 동의문 (워크스페이스 단위) + 멤버별 동의 시각
-- 적용 후 앱에서 현장요원은 동의 전까지 지도 등 업무 화면 사용 불가

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS field_agent_agreement_body text,
  ADD COLUMN IF NOT EXISTS field_agent_agreement_updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN workspaces.field_agent_agreement_body IS
  '현장요원 동의문 본문. NULL이면 앱 기본 문구 사용.';
COMMENT ON COLUMN workspaces.field_agent_agreement_updated_at IS
  '동의문 본문 또는 정책 갱신 시각. 현장요원 accepted_at이 이보다 이전이면 재동의 필요.';

ALTER TABLE workspace_members
  ADD COLUMN IF NOT EXISTS field_agent_agreement_accepted_at timestamptz;

COMMENT ON COLUMN workspace_members.field_agent_agreement_accepted_at IS
  '현장요원이 마지막으로 동의한 시각. 워크스페이스 agreement_updated_at보다 이전이면 재동의.';
