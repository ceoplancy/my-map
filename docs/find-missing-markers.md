# 사라진 마커 찾기 및 복구 가이드

## 문제 상황
"선택하세요" 옵션을 선택하고 저장하면 `status`가 빈 문자열(`""`)로 저장되어 마커가 지도에서 사라집니다.

## 사라진 마커 찾기

### Supabase SQL Editor에서 실행

```sql
-- status가 빈 문자열이거나 null인 레코드 찾기
SELECT 
  id,
  name,
  address,
  status,
  company,
  memo,
  stocks
FROM excel
WHERE status = '' OR status IS NULL
ORDER BY id DESC;
```

### 특정 조건으로 필터링

```sql
-- 특정 회사명의 사라진 마커 찾기
SELECT 
  id,
  name,
  address,
  status,
  company,
  memo
FROM excel
WHERE (status = '' OR status IS NULL)
  AND company = '<회사명>'
ORDER BY id DESC;
```

```sql
-- 특정 이름으로 검색
SELECT 
  id,
  name,
  address,
  status,
  company,
  memo
FROM excel
WHERE (status = '' OR status IS NULL)
  AND name LIKE '%<이름>%'
ORDER BY id DESC;
```

## 마커 복구

### 방법 1: 일괄 복구 (모든 사라진 마커를 "미방문"으로)

```sql
-- status가 빈 문자열이거나 null인 모든 레코드를 "미방문"으로 복구
UPDATE excel
SET status = '미방문'
WHERE status = '' OR status IS NULL;
```

### 방법 2: 특정 마커만 복구

```sql
-- 특정 ID의 마커 복구
UPDATE excel
SET status = '미방문'
WHERE id = <마커_ID>;
```

### 방법 3: 조건부 복구 (회사명 등으로 필터링)

```sql
-- 특정 회사명의 사라진 마커만 복구
UPDATE excel
SET status = '미방문'
WHERE (status = '' OR status IS NULL)
  AND company = '<회사명>';
```

## 확인

복구 후 다음 쿼리로 확인:

```sql
-- 복구된 마커 확인 (status가 "미방문"인 레코드)
SELECT 
  id,
  name,
  status,
  company,
  address
FROM excel
WHERE status = '미방문'
ORDER BY id DESC
LIMIT 100;
```

```sql
-- 사라진 마커가 모두 복구되었는지 확인 (0건이어야 함)
SELECT COUNT(*) as missing_count
FROM excel
WHERE status = '' OR status IS NULL;
```

## 예방

이제 코드가 수정되어 "선택하세요" 옵션이 제거되었고, 빈 문자열이 선택되면 자동으로 "미방문"으로 처리됩니다.
