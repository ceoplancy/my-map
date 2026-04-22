-- 주주 핸드폰 번호 (메모와 분리)
alter table public.shareholders
  add column if not exists phone text;

comment on column public.shareholders.phone is '휴대폰·연락처 (메모와 별도)';
