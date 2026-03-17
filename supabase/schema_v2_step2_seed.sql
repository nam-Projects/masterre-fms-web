-- ============================================================
-- STEP 2: 시드 데이터
-- schema_v2_step1_tables.sql 실행 후 실행하세요
-- ============================================================

-- 기존 시드 데이터 초기화 (재실행 대비)
DELETE FROM code_items;

-- ============================================================
-- 산출표 서식 템플릿 (area) - 3개 템플릿만 정의
-- 방, 욕실, 발코니 각각의 부위→공종 구조
-- ============================================================
DO $$
DECLARE
  v_tmpl uuid;
  v_scope uuid;
BEGIN
  -- ─── 방 템플릿 ───
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '방', 1) RETURNING id INTO v_tmpl;
  -- 천장
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '천장', 1) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '석고보드', 1),('area', v_scope, '합판', 2),('area', v_scope, 'MDF 등박스', 3),('area', v_scope, '텍스', 4),('area', v_scope, '도배(실크지)', 5),('area', v_scope, '도배(합지)', 6),('area', v_scope, '몰딩', 7),('area', v_scope, '도장', 8),('area', v_scope, '기타', 9);
  -- 벽체
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '벽체', 2) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '석고보드', 1),('area', v_scope, '합판', 2),('area', v_scope, '도배(실크지)', 3),('area', v_scope, '도배(합지)', 4),('area', v_scope, '기타', 5);
  -- 바닥
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '바닥', 3) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '걸레받이', 1),('area', v_scope, '원목마루', 2),('area', v_scope, '강마루', 3),('area', v_scope, '강화마루', 4),('area', v_scope, '장판', 5),('area', v_scope, '기타', 6);
  -- 기타
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '기타', 4) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '기타', 1);

  -- ─── 욕실 템플릿 ───
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '욕실', 2) RETURNING id INTO v_tmpl;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '천장', 1) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, 'SMC천장', 1),('area', v_scope, '리빙보드', 2),('area', v_scope, '합판', 3),('area', v_scope, '기타', 4);
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '벽체', 2) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '타일', 1);
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '바닥', 3) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '타일', 1),('area', v_scope, '기타', 2);
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '기타', 4) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '기타', 1);

  -- ─── 발코니 템플릿 ───
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', null, '발코니', 3) RETURNING id INTO v_tmpl;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_tmpl, '도장', 1) RETURNING id INTO v_scope;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area', v_scope, '수성페인트', 1),('area', v_scope, '무늬코트', 2),('area', v_scope, '탄성페인트', 3);
END $$;

-- ============================================================
-- 산출표 장소 목록 (area_room) - 각 장소가 어떤 템플릿을 사용하는지
-- Level 1 = 템플릿 카테고리(방, 욕실, 발코니)와 동일 이름
-- Level 2 = 실제 장소 이름
-- ============================================================
DO $$
DECLARE
  v_cat uuid;
BEGIN
  -- 방 카테고리
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area_room', null, '방', 1) RETURNING id INTO v_cat;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES
    ('area_room', v_cat, '전실', 1),('area_room', v_cat, '거실', 2),('area_room', v_cat, '주방', 3),
    ('area_room', v_cat, '복도', 4),('area_room', v_cat, '안방', 5),('area_room', v_cat, '작은방1', 6),
    ('area_room', v_cat, '작은방2', 7),('area_room', v_cat, '작은방3', 8),('area_room', v_cat, '작은방4', 9);

  -- 욕실 카테고리
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area_room', null, '욕실', 2) RETURNING id INTO v_cat;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES
    ('area_room', v_cat, '욕실1', 1),('area_room', v_cat, '욕실2', 2),('area_room', v_cat, '욕실3', 3);

  -- 발코니 카테고리
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('area_room', null, '발코니', 3) RETURNING id INTO v_cat;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES
    ('area_room', v_cat, '전면발코니1', 1),('area_room', v_cat, '전면발코니2', 2),('area_room', v_cat, '전면발코니3', 3),
    ('area_room', v_cat, '후면발코니1', 4),('area_room', v_cat, '후면발코니2', 5),('area_room', v_cat, '후면발코니3', 6);
END $$;

-- ============================================================
-- 인건비 코드 (labor)
-- ============================================================
DO $$
DECLARE
  v_root uuid; v_l1 uuid; v_l2 uuid; v_l3 uuid;
BEGIN
  -- 손방
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', null, '손방', 1) RETURNING id INTO v_root;

  -- 누수탐지
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_root, '누수탐지', 1) RETURNING id INTO v_l1;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '종합검사', 1) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '누수탐지', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '누수탐지', 300000, 1);

  -- 손방공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_root, '손방공사', 2) RETURNING id INTO v_l1;

  -- 방수공사 > 방수
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '방수공사', 1) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '방수', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '방수공', 228286, 1),('labor', v_l3, '보통인부', 172068, 2);
  -- 방수공사 > 철거
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '철거', 2) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '철거공', 172068, 1);

  -- 코킹공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '코킹공사', 2) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '코킹', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '코킹공', 209313, 1),('labor', v_l3, '보통인부', 172068, 2),('labor', v_l3, '스카이차량', 0, 3);

  -- 배관공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '배관공사', 3) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '배관', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '배관공', 247897, 1),('labor', v_l3, '보통인부', 169804, 2);

  -- 철거공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '철거공사', 4) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '철거', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '철거공', 266743, 1),('labor', v_l3, '보통인부', 172068, 2);

  -- 기타공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '기타공사', 5) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '기타', 1);

  -- 대물
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', null, '대물', 2) RETURNING id INTO v_root;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_root, '대물공사', 1) RETURNING id INTO v_l1;

  -- 목공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '목공사', 1) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '목공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '내장공', 256883, 1),('labor', v_l3, '건축목공', 277642, 2),('labor', v_l3, '보통인부', 172068, 3);
  -- 수장공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '수장공사', 2) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '수장공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '도배공', 227614, 1),('labor', v_l3, '내장공', 256883, 2),('labor', v_l3, '보통인부', 172068, 3);
  -- 도장공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '도장공사', 3) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '도장공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '도장공', 263017, 1),('labor', v_l3, '보통인부', 172068, 2);
  -- 전기공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '전기공사', 4) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '전기공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '내선전공', 268915, 1),('labor', v_l3, '보통인부', 172068, 2);
  -- 타일공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '타일공사', 5) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '타일공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '타일공', 290939, 1),('labor', v_l3, '보통인부', 172068, 2);
  -- 창호공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '창호공사', 6) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '창호공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '내장공', 256883, 1),('labor', v_l3, '보통인부', 172068, 2);
  -- 욕실공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '욕실공사', 7) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '욕실공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '내장공', 256883, 1),('labor', v_l3, '보통인부', 172068, 2);
  -- 가구공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '가구공사', 8) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '가구공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '내장공', 256883, 1),('labor', v_l3, '보통인부', 172068, 2);
  -- 철거공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l1, '철거공사', 9) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('labor', v_l2, '철거공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('labor', v_l3, '보통인부', 172068, 1);
END $$;

-- ============================================================
-- 자재비 코드 (material)
-- ============================================================
DO $$
DECLARE
  v_root uuid; v_l1 uuid; v_l2 uuid; v_l3 uuid;
BEGIN
  -- 손방
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', null, '손방', 1) RETURNING id INTO v_root;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_root, '손방공사', 1) RETURNING id INTO v_l1;
  -- 방수공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l1, '방수공사', 1) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l2, '방수', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('material', v_l3, '방수액', 5000, 1),('material', v_l3, '가사리(20L)', 0, 2),('material', v_l3, '고뫄스', 0, 3),('material', v_l3, '기타 부자재', 0, 4);
  -- 배관공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l1, '배관공사', 2) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l2, '배관', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('material', v_l3, 'PVC 배관', 0, 1),('material', v_l3, 'PB배관', 0, 2),('material', v_l3, '기타 부자재', 0, 3);
  -- 코킹공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l1, '코킹공사', 3) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l2, '코킹', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('material', v_l3, '코킹재 : 실란트', 7500, 1);

  -- 대물
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', null, '대물', 2) RETURNING id INTO v_root;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_root, '대물공사', 1) RETURNING id INTO v_l1;
  -- 가설공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l1, '가설공사', 0) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l2, '현장정리', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('material', v_l3, '보양재', 7000, 1);
  -- 목공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l1, '목공사', 1) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l2, '목공', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('material', v_l3, '석고보드 : 9.5*900*1800', 5500, 1),('material', v_l3, '합판 : 2.7*910*1820', 8000, 2),('material', v_l3, '몰딩 : 70*12*2440', 6000, 3),('material', v_l3, '각재 : 30*30*3600', 3000, 4),('material', v_l3, '걸레받이 : 80*9*2440', 6000, 5),('material', v_l3, '몰딩 : 기타', 0, 6),('material', v_l3, '걸레받이 : 기타', 0, 7),('material', v_l3, '기타', 0, 8);
  -- 수장공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l1, '수장공사', 2) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l2, '도배', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('material', v_l3, '벽지 : 실크벽지', 5000, 1),('material', v_l3, '벽지 : 합지벽지', 2000, 2),('material', v_l3, '장판', 20000, 3),('material', v_l3, '기타', 0, 4);
  -- 도장공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l1, '도장공사', 3) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l2, '도장공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('material', v_l3, '페인트 : 수성페인트(4L)', 30000, 1),('material', v_l3, '페인트 : 아크릴퍼티 / 25KG', 28000, 2),('material', v_l3, '페인트 : 콤보 무늬코트', 25000, 3),('material', v_l3, '기타', 0, 4);
  -- 전기공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l1, '전기공사', 4) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l2, '전기공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('material', v_l3, 'LED등기구', 0, 1),('material', v_l3, '다운라이트', 0, 2),('material', v_l3, '기타', 0, 3);
  -- 타일공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l1, '타일공사', 5) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l2, '타일공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('material', v_l3, '벽 타일', 0, 1),('material', v_l3, '바닥 타일', 0, 2),('material', v_l3, '타일 : 타일줄눈용', 3000, 3);
  -- 창호공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l1, '창호공사', 6) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l2, '창호공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('material', v_l3, '-', 0, 1),('material', v_l3, '기타', 0, 2);
  -- 욕실공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l1, '욕실공사', 7) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l2, '욕실공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('material', v_l3, '벽 타일', 0, 1),('material', v_l3, '바닥 타일', 0, 2),('material', v_l3, 'SMC천장', 0, 3),('material', v_l3, '기타', 0, 4);
  -- 가구공사
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l1, '가구공사', 8) RETURNING id INTO v_l2;
  INSERT INTO code_items (code_type, parent_id, name, sort_order) VALUES ('material', v_l2, '가구공사', 1) RETURNING id INTO v_l3;
  INSERT INTO code_items (code_type, parent_id, name, rate, sort_order) VALUES ('material', v_l3, '붇박이장', 0, 1),('material', v_l3, '싱크대 상부장', 0, 2),('material', v_l3, '싱크대 하부장', 0, 3),('material', v_l3, '기타', 0, 4);
END $$;
