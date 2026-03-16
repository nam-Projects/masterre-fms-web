-- ============================================================
-- MASTER:RE FMS - Schema V2: 코드 관리 + 금액 컬럼 + 단계 변경
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- ============================================================
-- 1. jobs 테이블 stage CHECK 제약조건 변경 (report_writing 제거)
-- ============================================================
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_stage_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_stage_check CHECK (stage IN (
  'new_site', 'site_survey', 'estimate',
  'restoration', 'completed', 'claiming', 'closed'
));

-- 기존 report_writing 상태인 데이터가 있으면 estimate로 변경
UPDATE jobs SET stage = 'estimate' WHERE stage = 'report_writing';

-- ============================================================
-- 2. jobs 테이블 금액 관련 컬럼 추가
-- ============================================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimate_amount numeric(15,0) NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposit_amount numeric(15,0) NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposit_date date;

-- ============================================================
-- 3. 코드 관리 테이블 (self-referential 트리 구조)
-- ============================================================
CREATE TABLE IF NOT EXISTS code_items (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_type   text NOT NULL CHECK (code_type IN ('area', 'labor', 'material')),
  parent_id   uuid REFERENCES code_items(id) ON DELETE CASCADE,
  name        text NOT NULL,
  rate        numeric(12,0),
  unit        text NOT NULL DEFAULT '',
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_code_items_parent ON code_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_code_items_type ON code_items(code_type);

ALTER TABLE code_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "code_items_select" ON code_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "code_items_insert" ON code_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "code_items_update" ON code_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "code_items_delete" ON code_items FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- 4. stage_summary 뷰 업데이트 (report_writing 제거 반영)
-- ============================================================
CREATE OR REPLACE VIEW stage_summary AS
SELECT
  stage,
  count(*) AS job_count,
  min(created_at) AS earliest,
  max(updated_at) AS latest
FROM jobs
GROUP BY stage;

-- ============================================================
-- 5. 시드 데이터 - 산출표 코드 (area)
--    구조: 대분류(구분) → 중분류(범위) → 소분류(구조)
-- ============================================================

-- 전실
WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '전실', 1) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '천장', 1 FROM cat RETURNING id)
, s2 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '벽체', 2 FROM cat RETURNING id)
, s3 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '바닥', 3 FROM cat RETURNING id)
, s4 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '기타', 4 FROM cat RETURNING id)
, t1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('석고보드',1),('합판',2),('MDF 등박스',3),('텍스',4),('도배(실크지)',5),('도배(합지)',6),('몰딩',7),('도장',8),('기타',9)) AS v(name,ord) RETURNING id)
, t2 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s2.id, v.name, v.ord FROM s2, (VALUES ('석고보드',1),('합판',2),('도배(실크지)',3),('도배(합지)',4),('기타',5)) AS v(name,ord) RETURNING id)
, t3 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s3.id, v.name, v.ord FROM s3, (VALUES ('걸레받이',1),('원목마루',2),('강마루',3),('강화마루',4),('장판',5),('기타',6)) AS v(name,ord) RETURNING id)
SELECT count(*) FROM (SELECT id FROM t1 UNION ALL SELECT id FROM t2 UNION ALL SELECT id FROM t3 UNION ALL INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s4.id, '기타', 1 FROM s4 RETURNING id) x;

-- 거실 (천장만 - 벽체/바닥은 전실과 공유되는 구조)
WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '거실', 2) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '천장', 1 FROM cat RETURNING id)
SELECT count(*) FROM (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('석고보드',1),('합판',2),('MDF 등박스',3),('텍스',4),('도배(실크지)',5),('도배(합지)',6),('몰딩',7),('도장',8),('기타',9)) AS v(name,ord) RETURNING id) x;

-- 주방
WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '주방', 3) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '천장', 1 FROM cat RETURNING id)
SELECT count(*) FROM (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('석고보드',1),('합판',2),('MDF 등박스',3),('텍스',4),('도배(실크지)',5),('도배(합지)',6),('몰딩',7),('도장',8),('기타',9)) AS v(name,ord) RETURNING id) x;

-- 복도
WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '복도', 4) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '천장', 1 FROM cat RETURNING id)
SELECT count(*) FROM (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('석고보드',1),('합판',2),('텍스',3),('도배(실크지)',4),('도배(합지)',5),('몰딩',6),('도장',7),('기타',8)) AS v(name,ord) RETURNING id) x;

-- 안방
WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '안방', 5) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '천장', 1 FROM cat RETURNING id)
SELECT count(*) FROM (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('석고보드',1),('합판',2),('텍스',3),('도배(실크지)',4),('도배(합지)',5),('몰딩',6),('도장',7),('기타',8)) AS v(name,ord) RETURNING id) x;

-- 작은방1~4
WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '작은방1', 6) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '천장', 1 FROM cat RETURNING id)
SELECT count(*) FROM (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('석고보드',1),('합판',2),('도배(실크지)',3),('도배(합지)',4),('몰딩',5),('도장',6),('기타',7)) AS v(name,ord) RETURNING id) x;

WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '작은방2', 7) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '천장', 1 FROM cat RETURNING id)
SELECT count(*) FROM (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('석고보드',1),('합판',2),('도배(실크지)',3),('도배(합지)',4),('몰딩',5),('도장',6),('기타',7)) AS v(name,ord) RETURNING id) x;

WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '작은방3', 8) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '천장', 1 FROM cat RETURNING id)
SELECT count(*) FROM (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('석고보드',1),('합판',2),('도배(실크지)',3),('도배(합지)',4),('몰딩',5),('도장',6),('기타',7)) AS v(name,ord) RETURNING id) x;

WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '작은방4', 9) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '천장', 1 FROM cat RETURNING id)
SELECT count(*) FROM (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('석고보드',1),('합판',2),('도배(실크지)',3),('도배(합지)',4),('몰딩',5),('도장',6),('기타',7)) AS v(name,ord) RETURNING id) x;

-- 욕실1~3
WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '욕실1', 10) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '천장', 1 FROM cat RETURNING id)
, s2 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '벽체', 2 FROM cat RETURNING id)
, s3 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '바닥', 3 FROM cat RETURNING id)
, s4 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '기타', 4 FROM cat RETURNING id)
, t1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('SMC천장',1),('리빙보드',2),('합판',3),('기타',4)) AS v(name,ord) RETURNING id)
, t2 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s2.id, '타일', 1 FROM s2 RETURNING id)
, t3 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s3.id, v.name, v.ord FROM s3, (VALUES ('타일',1),('기타',2)) AS v(name,ord) RETURNING id)
SELECT count(*) FROM (SELECT id FROM t1 UNION ALL SELECT id FROM t2 UNION ALL SELECT id FROM t3 UNION ALL INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s4.id, '기타', 1 FROM s4 RETURNING id) x;

WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '욕실2', 11) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '천장', 1 FROM cat RETURNING id)
, s2 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '벽체', 2 FROM cat RETURNING id)
, s3 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '바닥', 3 FROM cat RETURNING id)
, t1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('SMC천장',1),('리빙보드',2),('합판',3),('기타',4)) AS v(name,ord) RETURNING id)
, t2 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s2.id, '타일', 1 FROM s2 RETURNING id)
SELECT count(*) FROM (SELECT id FROM t1 UNION ALL SELECT id FROM t2 UNION ALL INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s3.id, v.name, v.ord FROM s3, (VALUES ('타일',1),('기타',2)) AS v(name,ord) RETURNING id) x;

WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '욕실3', 12) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '천장', 1 FROM cat RETURNING id)
, s2 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '벽체', 2 FROM cat RETURNING id)
, s3 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '바닥', 3 FROM cat RETURNING id)
, t1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('SMC천장',1),('리빙보드',2),('합판',3),('기타',4)) AS v(name,ord) RETURNING id)
, t2 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s2.id, '타일', 1 FROM s2 RETURNING id)
SELECT count(*) FROM (SELECT id FROM t1 UNION ALL SELECT id FROM t2 UNION ALL INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s3.id, v.name, v.ord FROM s3, (VALUES ('타일',1),('기타',2)) AS v(name,ord) RETURNING id) x;

-- 전면발코니1~3
WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '전면발코니1', 13) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '도장', 1 FROM cat RETURNING id)
SELECT count(*) FROM (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('수성페인트',1),('무늬코트',2),('탄성페인트',3)) AS v(name,ord) RETURNING id) x;

WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '전면발코니2', 14) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '도장', 1 FROM cat RETURNING id)
SELECT count(*) FROM (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('수성페인트',1),('무늬코트',2),('탄성페인트',3)) AS v(name,ord) RETURNING id) x;

WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '전면발코니3', 15) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '도장', 1 FROM cat RETURNING id)
SELECT count(*) FROM (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('수성페인트',1),('무늬코트',2),('탄성페인트',3)) AS v(name,ord) RETURNING id) x;

-- 후면발코니1~3
WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '후면발코니1', 16) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '도장', 1 FROM cat RETURNING id)
SELECT count(*) FROM (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('수성페인트',1),('무늬코트',2),('탄성페인트',3)) AS v(name,ord) RETURNING id) x;

WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '후면발코니2', 17) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '도장', 1 FROM cat RETURNING id)
SELECT count(*) FROM (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('수성페인트',1),('무늬코트',2),('탄성페인트',3)) AS v(name,ord) RETURNING id) x;

WITH cat AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '후면발코니3', 18) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', cat.id, '도장', 1 FROM cat RETURNING id)
SELECT count(*) FROM (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'area', s1.id, v.name, v.ord FROM s1, (VALUES ('수성페인트',1),('무늬코트',2),('탄성페인트',3)) AS v(name,ord) RETURNING id) x;

-- ============================================================
-- 6. 시드 데이터 - 손방공사 인건비 코드 (labor)
--    구조: 손방 → 누수탐지/손방공사 → 방수공사/코킹공사/... → 소분류 → 인력코드(rate)
-- ============================================================

WITH r AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', null, '손방', 1) RETURNING id)
-- 누수탐지
, n1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', r.id, '누수탐지', 1 FROM r RETURNING id)
, n1a AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', n1.id, '종합검사', 1 FROM n1 RETURNING id)
, n1a1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', n1a.id, '누수탐지', 1 FROM n1a RETURNING id)
, n1leaf AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', n1a1.id, '누수탐지', 300000, 1 FROM n1a1 RETURNING id)
-- 손방공사
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', r.id, '손방공사', 2 FROM r RETURNING id)
-- 방수공사
, s1a AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', s1.id, '방수공사', 1 FROM s1 RETURNING id)
, s1a1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', s1a.id, '방수', 1 FROM s1a RETURNING id)
, s1a1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', s1a1.id, v.name, v.rate, v.ord FROM s1a1, (VALUES ('방수공',228286,1),('보통인부',172068,2)) AS v(name,rate,ord) RETURNING id)
, s1a2 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', s1a.id, '철거', 2 FROM s1a RETURNING id)
, s1a2_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', s1a2.id, '철거공', 172068, 1 FROM s1a2 RETURNING id)
-- 코킹공사
, s1b AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', s1.id, '코킹공사', 2 FROM s1 RETURNING id)
, s1b1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', s1b.id, '코킹', 1 FROM s1b RETURNING id)
, s1b1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', s1b1.id, v.name, v.rate, v.ord FROM s1b1, (VALUES ('코킹공',209313,1),('보통인부',172068,2),('스카이차량',0,3)) AS v(name,rate,ord) RETURNING id)
-- 배관공사
, s1c AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', s1.id, '배관공사', 3 FROM s1 RETURNING id)
, s1c1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', s1c.id, '배관', 1 FROM s1c RETURNING id)
, s1c1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', s1c1.id, v.name, v.rate, v.ord FROM s1c1, (VALUES ('배관공',247897,1),('보통인부',169804,2)) AS v(name,rate,ord) RETURNING id)
-- 철거공사
, s1d AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', s1.id, '철거공사', 4 FROM s1 RETURNING id)
, s1d1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', s1d.id, '철거', 1 FROM s1d RETURNING id)
, s1d1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', s1d1.id, v.name, v.rate, v.ord FROM s1d1, (VALUES ('철거공',266743,1),('보통인부',172068,2)) AS v(name,rate,ord) RETURNING id)
-- 기타공사
, s1e AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', s1.id, '기타공사', 5 FROM s1 RETURNING id)
, s1e1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', s1e.id, '기타', 1 FROM s1e RETURNING id)
SELECT count(*) FROM (SELECT id FROM n1leaf UNION ALL SELECT id FROM s1a1_l UNION ALL SELECT id FROM s1a2_l UNION ALL SELECT id FROM s1b1_l UNION ALL SELECT id FROM s1c1_l UNION ALL SELECT id FROM s1d1_l UNION ALL SELECT id FROM s1e1) x;

-- ============================================================
-- 7. 시드 데이터 - 대물공사 인건비 코드 (labor)
-- ============================================================

WITH r AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', null, '대물', 2) RETURNING id)
, d1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', r.id, '대물공사', 1 FROM r RETURNING id)
-- 목공사
, d1a AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1.id, '목공사', 1 FROM d1 RETURNING id)
, d1a1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1a.id, '목공사', 1 FROM d1a RETURNING id)
, d1a1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', d1a1.id, v.name, v.rate, v.ord FROM d1a1, (VALUES ('내장공',256883,1),('건축목공',277642,2),('보통인부',172068,3)) AS v(name,rate,ord) RETURNING id)
-- 수장공사
, d1b AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1.id, '수장공사', 2 FROM d1 RETURNING id)
, d1b1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1b.id, '수장공사', 1 FROM d1b RETURNING id)
, d1b1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', d1b1.id, v.name, v.rate, v.ord FROM d1b1, (VALUES ('도배공',227614,1),('내장공',256883,2),('보통인부',172068,3)) AS v(name,rate,ord) RETURNING id)
-- 도장공사
, d1c AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1.id, '도장공사', 3 FROM d1 RETURNING id)
, d1c1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1c.id, '도장공사', 1 FROM d1c RETURNING id)
, d1c1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', d1c1.id, v.name, v.rate, v.ord FROM d1c1, (VALUES ('도장공',263017,1),('보통인부',172068,2)) AS v(name,rate,ord) RETURNING id)
-- 전기공사
, d1d AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1.id, '전기공사', 4 FROM d1 RETURNING id)
, d1d1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1d.id, '전기공사', 1 FROM d1d RETURNING id)
, d1d1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', d1d1.id, v.name, v.rate, v.ord FROM d1d1, (VALUES ('내선전공',268915,1),('보통인부',172068,2)) AS v(name,rate,ord) RETURNING id)
-- 타일공사
, d1e AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1.id, '타일공사', 5 FROM d1 RETURNING id)
, d1e1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1e.id, '타일공사', 1 FROM d1e RETURNING id)
, d1e1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', d1e1.id, v.name, v.rate, v.ord FROM d1e1, (VALUES ('타일공',290939,1),('보통인부',172068,2)) AS v(name,rate,ord) RETURNING id)
-- 창호공사
, d1f AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1.id, '창호공사', 6 FROM d1 RETURNING id)
, d1f1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1f.id, '창호공사', 1 FROM d1f RETURNING id)
, d1f1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', d1f1.id, v.name, v.rate, v.ord FROM d1f1, (VALUES ('내장공',256883,1),('보통인부',172068,2)) AS v(name,rate,ord) RETURNING id)
-- 욕실공사
, d1g AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1.id, '욕실공사', 7 FROM d1 RETURNING id)
, d1g1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1g.id, '욕실공사', 1 FROM d1g RETURNING id)
, d1g1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', d1g1.id, v.name, v.rate, v.ord FROM d1g1, (VALUES ('내장공',256883,1),('보통인부',172068,2)) AS v(name,rate,ord) RETURNING id)
-- 가구공사
, d1h AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1.id, '가구공사', 8 FROM d1 RETURNING id)
, d1h1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1h.id, '가구공사', 1 FROM d1h RETURNING id)
, d1h1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', d1h1.id, v.name, v.rate, v.ord FROM d1h1, (VALUES ('내장공',256883,1),('보통인부',172068,2)) AS v(name,rate,ord) RETURNING id)
-- 철거공사
, d1i AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1.id, '철거공사', 9 FROM d1 RETURNING id)
, d1i1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'labor', d1i.id, '철거공사', 1 FROM d1i RETURNING id)
, d1i1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'labor', d1i1.id, '보통인부', 172068, 1 FROM d1i1 RETURNING id)
SELECT count(*) FROM (SELECT id FROM d1a1_l UNION ALL SELECT id FROM d1b1_l UNION ALL SELECT id FROM d1c1_l UNION ALL SELECT id FROM d1d1_l UNION ALL SELECT id FROM d1e1_l UNION ALL SELECT id FROM d1f1_l UNION ALL SELECT id FROM d1g1_l UNION ALL SELECT id FROM d1h1_l UNION ALL SELECT id FROM d1i1_l) x;

-- ============================================================
-- 8. 시드 데이터 - 손방공사 자재비 코드 (material)
-- ============================================================

WITH r AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', null, '손방', 1) RETURNING id)
, s1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', r.id, '손방공사', 1 FROM r RETURNING id)
-- 방수공사
, s1a AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', s1.id, '방수공사', 1 FROM s1 RETURNING id)
, s1a1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', s1a.id, '방수', 1 FROM s1a RETURNING id)
, s1a1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'material', s1a1.id, v.name, v.rate, v.ord FROM s1a1, (VALUES ('방수액',5000,1),('가사리(20L)',0,2),('고뫄스',0,3),('기타 부자재',0,4)) AS v(name,rate,ord) RETURNING id)
-- 배관공사
, s1b AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', s1.id, '배관공사', 2 FROM s1 RETURNING id)
, s1b1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', s1b.id, '배관', 1 FROM s1b RETURNING id)
, s1b1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'material', s1b1.id, v.name, v.rate, v.ord FROM s1b1, (VALUES ('PVC 배관',0,1),('PB배관',0,2),('기타 부자재',0,3)) AS v(name,rate,ord) RETURNING id)
-- 코킹공사
, s1c AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', s1.id, '코킹공사', 3 FROM s1 RETURNING id)
, s1c1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', s1c.id, '코킹', 1 FROM s1c RETURNING id)
, s1c1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'material', s1c1.id, '코킹재 : 실란트', 7500, 1 FROM s1c1 RETURNING id)
SELECT count(*) FROM (SELECT id FROM s1a1_l UNION ALL SELECT id FROM s1b1_l UNION ALL SELECT id FROM s1c1_l) x;

-- ============================================================
-- 9. 시드 데이터 - 대물공사 자재비 코드 (material)
-- ============================================================

WITH r AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', null, '대물', 2) RETURNING id)
, d1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', r.id, '대물공사', 1 FROM r RETURNING id)
-- 가설공사
, d1z AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1.id, '가설공사', 0 FROM d1 RETURNING id)
, d1z1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1z.id, '현장정리', 1 FROM d1z RETURNING id)
, d1z1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'material', d1z1.id, '보양재', 7000, 1 FROM d1z1 RETURNING id)
-- 목공사
, d1a AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1.id, '목공사', 1 FROM d1 RETURNING id)
, d1a1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1a.id, '목공', 1 FROM d1a RETURNING id)
, d1a1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'material', d1a1.id, v.name, v.rate, v.ord FROM d1a1, (VALUES ('석고보드 : 9.5*900*1800',5500,1),('합판 : 2.7*910*1820',8000,2),('몰딩 : 70*12*2440',6000,3),('각재 : 30*30*3600',3000,4),('걸레받이 : 80*9*2440',6000,5),('몰딩 : 기타',0,6),('걸레받이 : 기타',0,7),('기타',0,8)) AS v(name,rate,ord) RETURNING id)
-- 수장공사
, d1b AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1.id, '수장공사', 2 FROM d1 RETURNING id)
, d1b1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1b.id, '도배', 1 FROM d1b RETURNING id)
, d1b1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'material', d1b1.id, v.name, v.rate, v.ord FROM d1b1, (VALUES ('벽지 : 실크벽지',5000,1),('벽지 : 합지벽지',2000,2),('장판',20000,3),('기타',0,4)) AS v(name,rate,ord) RETURNING id)
-- 도장공사
, d1c AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1.id, '도장공사', 3 FROM d1 RETURNING id)
, d1c1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1c.id, '도장공사', 1 FROM d1c RETURNING id)
, d1c1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'material', d1c1.id, v.name, v.rate, v.ord FROM d1c1, (VALUES ('페인트 : 수성페인트(4L)',30000,1),('페인트 : 아크릴퍼티 / 25KG',28000,2),('페인트 : 콤보 무늬코트',25000,3),('기타',0,4)) AS v(name,rate,ord) RETURNING id)
-- 전기공사
, d1d AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1.id, '전기공사', 4 FROM d1 RETURNING id)
, d1d1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1d.id, '전기공사', 1 FROM d1d RETURNING id)
, d1d1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'material', d1d1.id, v.name, v.rate, v.ord FROM d1d1, (VALUES ('LED등기구',0,1),('다운라이트',0,2),('기타',0,3)) AS v(name,rate,ord) RETURNING id)
-- 타일공사
, d1e AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1.id, '타일공사', 5 FROM d1 RETURNING id)
, d1e1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1e.id, '타일공사', 1 FROM d1e RETURNING id)
, d1e1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'material', d1e1.id, v.name, v.rate, v.ord FROM d1e1, (VALUES ('벽 타일',0,1),('바닥 타일',0,2),('타일 : 타일줄눈용',3000,3)) AS v(name,rate,ord) RETURNING id)
-- 창호공사
, d1f AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1.id, '창호공사', 6 FROM d1 RETURNING id)
, d1f1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1f.id, '창호공사', 1 FROM d1f RETURNING id)
, d1f1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'material', d1f1.id, v.name, v.rate, v.ord FROM d1f1, (VALUES ('-',0,1),('기타',0,2)) AS v(name,rate,ord) RETURNING id)
-- 욕실공사
, d1g AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1.id, '욕실공사', 7 FROM d1 RETURNING id)
, d1g1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1g.id, '욕실공사', 1 FROM d1g RETURNING id)
, d1g1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'material', d1g1.id, v.name, v.rate, v.ord FROM d1g1, (VALUES ('벽 타일',0,1),('바닥 타일',0,2),('SMC천장',0,3),('기타',0,4)) AS v(name,rate,ord) RETURNING id)
-- 가구공사
, d1h AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1.id, '가구공사', 8 FROM d1 RETURNING id)
, d1h1 AS (INSERT INTO code_items (code_type, parent_id, name, sort_order) SELECT 'material', d1h.id, '가구공사', 1 FROM d1h RETURNING id)
, d1h1_l AS (INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) SELECT 'material', d1h1.id, v.name, v.rate, v.ord FROM d1h1, (VALUES ('붇박이장',0,1),('싱크대 상부장',0,2),('싱크대 하부장',0,3),('기타',0,4)) AS v(name,rate,ord) RETURNING id)
SELECT count(*) FROM (SELECT id FROM d1z1_l UNION ALL SELECT id FROM d1a1_l UNION ALL SELECT id FROM d1b1_l UNION ALL SELECT id FROM d1c1_l UNION ALL SELECT id FROM d1d1_l UNION ALL SELECT id FROM d1e1_l UNION ALL SELECT id FROM d1f1_l UNION ALL SELECT id FROM d1g1_l UNION ALL SELECT id FROM d1h1_l) x;
