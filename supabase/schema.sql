-- ============================================================
-- MASTER:RE FMS - Supabase Schema
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (auth.users와 연결)
-- ============================================================
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role         text not null default 'user' check (role in ('admin', 'user', 'viewer')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 신규 가입 시 자동으로 profiles 행 생성
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (NEW.id, coalesce(NEW.raw_user_meta_data->>'display_name', NEW.email));
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- JOBS (메인 테이블)
-- ============================================================
create table jobs (
  id              uuid primary key default uuid_generate_v4(),
  received_date   date not null,
  insurer         text not null,
  accident_no     text not null default '',
  policy_no       text not null default '',
  claim_type      text not null default 'both' check (claim_type in ('injury', 'property', 'both')),
  reviewer        text not null default '',
  reviewer_phone  text not null default '',
  adjuster        text not null default '',
  adjuster_phone  text not null default '',
  insured         text not null,
  insured_phone   text not null default '',
  address         text not null,
  notes           text not null default '',
  stage           text not null default 'new_site' check (stage in (
    'new_site', 'site_survey', 'report_writing', 'estimate',
    'restoration', 'completed', 'claiming', 'closed'
  )),
  daily_checked   boolean not null default false,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_jobs_stage on jobs(stage);
create index idx_jobs_insurer on jobs(insurer);
create index idx_jobs_created_at on jobs(created_at);

-- ============================================================
-- VICTIMS (피해자 - jobs 1:N)
-- ============================================================
create table victims (
  id         uuid primary key default uuid_generate_v4(),
  job_id     uuid not null references jobs(id) on delete cascade,
  name       text not null,
  phone      text not null default '',
  sort_order int not null default 0
);

create index idx_victims_job_id on victims(job_id);

-- ============================================================
-- COMMENTS (코멘트 - jobs 1:N)
-- ============================================================
create table comments (
  id          uuid primary key default uuid_generate_v4(),
  job_id      uuid not null references jobs(id) on delete cascade,
  author      text not null default '운영자',
  text        text not null,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

create index idx_comments_job_id on comments(job_id);
create index idx_comments_created_at on comments(created_at);

-- ============================================================
-- PHOTOS (사진 - jobs 1:N, Supabase Storage 연동)
-- ============================================================
create table photos (
  id            uuid primary key default uuid_generate_v4(),
  job_id        uuid not null references jobs(id) on delete cascade,
  folder        text not null default 'etc' check (folder in (
    'before', 'during', 'after', 'insurance_docs', 'etc'
  )),
  name          text not null,
  storage_path  text not null,
  uploaded_by   text not null default '',
  uploaded_at   timestamptz not null default now()
);

create index idx_photos_job_id on photos(job_id);
create index idx_photos_folder on photos(job_id, folder);

-- ============================================================
-- DOCUMENTS (문서 - jobs 1:N, Supabase Storage 연동)
-- ============================================================
create table documents (
  id            uuid primary key default uuid_generate_v4(),
  job_id        uuid not null references jobs(id) on delete cascade,
  doc_type      text not null default 'etc' check (doc_type in (
    'area_calc', 'floor_plan', 'estimate_doc', 'etc'
  )),
  name          text not null,
  storage_path  text not null,
  uploaded_at   timestamptz not null default now()
);

create index idx_documents_job_id on documents(job_id);

-- ============================================================
-- AREA CALCULATIONS (면적 산출 - jobs 1:N)
-- ============================================================
create table area_calculations (
  id              uuid primary key default uuid_generate_v4(),
  job_id          uuid not null references jobs(id) on delete cascade,
  room            text not null default '',
  scope           text not null default '',
  work_type       text not null default '',
  damage_width    numeric(10,2) not null default 0,
  damage_height   numeric(10,2) not null default 0,
  damage_area     numeric(10,2) not null default 0,
  restore_width   numeric(10,2) not null default 0,
  restore_height  numeric(10,2) not null default 0,
  restore_area    numeric(10,2) not null default 0,
  note            text not null default '',
  sort_order      int not null default 0
);

create index idx_area_calc_job_id on area_calculations(job_id);

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger trg_jobs_updated_at
  before update on jobs
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table profiles enable row level security;
alter table jobs enable row level security;
alter table victims enable row level security;
alter table comments enable row level security;
alter table photos enable row level security;
alter table documents enable row level security;
alter table area_calculations enable row level security;

-- Profiles
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Jobs: 인증된 사용자 CRUD
create policy "jobs_select" on jobs for select using (auth.role() = 'authenticated');
create policy "jobs_insert" on jobs for insert with check (auth.role() = 'authenticated');
create policy "jobs_update" on jobs for update using (auth.role() = 'authenticated');
create policy "jobs_delete" on jobs for delete using (auth.role() = 'authenticated');

-- Victims
create policy "victims_select" on victims for select using (auth.role() = 'authenticated');
create policy "victims_insert" on victims for insert with check (auth.role() = 'authenticated');
create policy "victims_update" on victims for update using (auth.role() = 'authenticated');
create policy "victims_delete" on victims for delete using (auth.role() = 'authenticated');

-- Comments
create policy "comments_select" on comments for select using (auth.role() = 'authenticated');
create policy "comments_insert" on comments for insert with check (auth.role() = 'authenticated');

-- Photos
create policy "photos_select" on photos for select using (auth.role() = 'authenticated');
create policy "photos_insert" on photos for insert with check (auth.role() = 'authenticated');
create policy "photos_delete" on photos for delete using (auth.role() = 'authenticated');

-- Documents
create policy "documents_select" on documents for select using (auth.role() = 'authenticated');
create policy "documents_insert" on documents for insert with check (auth.role() = 'authenticated');
create policy "documents_delete" on documents for delete using (auth.role() = 'authenticated');

-- Area calculations
create policy "area_calc_select" on area_calculations for select using (auth.role() = 'authenticated');
create policy "area_calc_insert" on area_calculations for insert with check (auth.role() = 'authenticated');
create policy "area_calc_update" on area_calculations for update using (auth.role() = 'authenticated');
create policy "area_calc_delete" on area_calculations for delete using (auth.role() = 'authenticated');

-- ============================================================
-- 집계 뷰 (SQL로 간편하게 통계 조회)
-- ============================================================
create or replace view stage_summary as
select
  stage,
  count(*) as job_count,
  min(created_at) as earliest,
  max(updated_at) as latest
from jobs
group by stage;

create or replace view insurer_summary as
select
  insurer,
  count(*) as job_count,
  count(*) filter (where stage not in ('completed', 'closed')) as active_count
from jobs
group by insurer;

-- ============================================================
-- Storage 버킷 설정 (Supabase Dashboard에서 수동 생성 필요)
--
-- 1. "job-photos" 버킷 (Private)
--    - 경로: {job_id}/{folder}/{filename}
--    - 허용 MIME: image/jpeg, image/png, image/webp
--    - 최대 크기: 10MB
--
-- 2. "job-documents" 버킷 (Private)
--    - 경로: {job_id}/{doc_type}/{filename}
--    - 허용 MIME: application/pdf, image/jpeg, image/png
--    - 최대 크기: 20MB
-- ============================================================
