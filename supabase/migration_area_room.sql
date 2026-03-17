-- ============================================================
-- 마이그레이션: area 코드를 템플릿+장소 구조로 전환
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. code_type CHECK 제약조건 업데이트 (area_room 추가)
ALTER TABLE code_items DROP CONSTRAINT IF EXISTS code_items_code_type_check;
ALTER TABLE code_items ADD CONSTRAINT code_items_code_type_check
  CHECK (code_type IN ('area', 'area_room', 'labor', 'material'));

-- 2. 기존 area 코드 삭제 (labor, material은 유지)
DELETE FROM code_items WHERE code_type = 'area';

-- 3. 새 구조로 area 서식 템플릿 + area_room 장소 삽입
-- (schema_v2_step2_seed.sql 의 area/area_room 부분을 실행)

-- ─── area 서식 템플릿 ───
DO $$
DECLARE
  v_tmpl uuid;
  v_scope uuid;
BEGIN
  -- 방 템플릿
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '방', 1) RETURNING id INTO v_tmpl;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '천장', 1) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '석고보드', 1),('area', v_scope, '합판', 2),('area', v_scope, 'MDF 등박스', 3),('area', v_scope, '텍스', 4),('area', v_scope, '도배(실크지)', 5),('area', v_scope, '도배(합지)', 6),('area', v_scope, '몰딩', 7),('area', v_scope, '도장', 8),('area', v_scope, '기타', 9);
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '벽체', 2) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '석고보드', 1),('area', v_scope, '합판', 2),('area', v_scope, '도배(실크지)', 3),('area', v_scope, '도배(합지)', 4),('area', v_scope, '기타', 5);
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '바닥', 3) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '걸레받이', 1),('area', v_scope, '원목마루', 2),('area', v_scope, '강마루', 3),('area', v_scope, '강화마루', 4),('area', v_scope, '장판', 5),('area', v_scope, '기타', 6);
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '기타', 4) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '기타', 1);

  -- 욕실 템플릿
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '욕실', 2) RETURNING id INTO v_tmpl;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '천장', 1) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, 'SMC천장', 1),('area', v_scope, '리빙보드', 2),('area', v_scope, '합판', 3),('area', v_scope, '기타', 4);
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '벽체', 2) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '타일', 1);
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '바닥', 3) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '타일', 1),('area', v_scope, '기타', 2);
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '기타', 4) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '기타', 1);

  -- 발코니 템플릿
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '발코니', 3) RETURNING id INTO v_tmpl;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '도장', 1) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '수성페인트', 1),('area', v_scope, '무늬코트', 2),('area', v_scope, '탄성페인트', 3);
END $$;

-- ─── area_room 장소 목록 ───
DO $$
DECLARE
  v_cat uuid;
BEGIN
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area_room', null, '방', 1) RETURNING id INTO v_cat;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES
    ('area_room', v_cat, '전실', 1),('area_room', v_cat, '거실', 2),('area_room', v_cat, '주방', 3),
    ('area_room', v_cat, '복도', 4),('area_room', v_cat, '안방', 5),('area_room', v_cat, '작은방1', 6),
    ('area_room', v_cat, '작은방2', 7),('area_room', v_cat, '작은방3', 8),('area_room', v_cat, '작은방4', 9);

  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area_room', null, '욕실', 2) RETURNING id INTO v_cat;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES
    ('area_room', v_cat, '욕실1', 1),('area_room', v_cat, '욕실2', 2),('area_room', v_cat, '욕실3', 3);

  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area_room', null, '발코니', 3) RETURNING id INTO v_cat;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES
    ('area_room', v_cat, '전면발코니1', 1),('area_room', v_cat, '전면발코니2', 2),('area_room', v_cat, '전면발코니3', 3),
    ('area_room', v_cat, '후면발코니1', 4),('area_room', v_cat, '후면발코니2', 5),('area_room', v_cat, '후면발코니3', 6);
END $$;

-- 4. RLS 정책 (기존과 동일, area_room도 자동 적용됨 — 테이블 단위 정책)
-- 이미 적용되어 있으므로 추가 작업 불필요
