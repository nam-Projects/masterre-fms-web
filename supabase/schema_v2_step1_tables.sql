-- ============================================================
-- STEP 1: 테이블 생성 및 제약조건 변경
-- Supabase SQL Editor에서 먼저 실행하세요
-- ============================================================

-- 1. jobs stage 제약조건 변경 (report_writing 제거)
-- 먼저 기존 데이터를 마이그레이션한 후 제약조건 변경
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_stage_check;
UPDATE jobs SET stage = 'estimate' WHERE stage = 'report_writing';
ALTER TABLE jobs ADD CONSTRAINT jobs_stage_check CHECK (stage IN (
  'new_site', 'site_survey', 'estimate',
  'restoration', 'completed', 'claiming', 'closed'
));

-- 2. jobs 금액 컬럼 추가
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimate_amount numeric(15,0) NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposit_amount numeric(15,0) NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deposit_date date;

-- 3. code_items 트리 테이블 생성
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

-- 4. RLS
ALTER TABLE code_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'code_items' AND policyname = 'code_items_select') THEN
    CREATE POLICY "code_items_select" ON code_items FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'code_items' AND policyname = 'code_items_insert') THEN
    CREATE POLICY "code_items_insert" ON code_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'code_items' AND policyname = 'code_items_update') THEN
    CREATE POLICY "code_items_update" ON code_items FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'code_items' AND policyname = 'code_items_delete') THEN
    CREATE POLICY "code_items_delete" ON code_items FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 5. stage_summary 뷰 갱신
CREATE OR REPLACE VIEW stage_summary AS
SELECT stage, count(*) AS job_count, min(created_at) AS earliest, max(updated_at) AS latest
FROM jobs GROUP BY stage;
