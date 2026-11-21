-- SCUT 工作台在线版 · Supabase 迁移 + RLS + 种子
-- 用法：Supabase Dashboard → SQL Editor → 全选粘贴执行。
-- 说明：演示用户需在 Auth 里先建（如 demo@scut.edu.cn），再把其 uuid 填入下方种子注释处。

create extension if not exists pgcrypto;

-- ============ 触发器函数 ============
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ============ 表 ============
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text, avatar_seed text,
  created_at timestamptz default now()
);

create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('college','class','league_branch','student_union','department','club')),
  parent_id uuid references orgs(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  org_type text, key text, name text not null,
  is_preset boolean not null default false,
  capabilities text[] not null default '{}',
  dashboard jsonb not null default '{}',
  owner_user uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references roles(id),
  title text, status text not null default 'active',
  created_at timestamptz default now(),
  unique (org_id, user_id, role_id)
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references orgs(id) on delete cascade,
  scope text not null default 'personal' check (scope in ('personal','org')),
  title text not null, date date, time text, category text,
  important boolean not null default false, done boolean not null default false,
  version int not null default 1, created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists homework (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course text, title text not null, due timestamptz, note text,
  state text not null default '未提交', version int not null default 1,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, weekday int check (weekday between 1 and 7),
  period_start int, period_end int, teacher text, location text, color text, weeks text,
  version int not null default 1, created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  publisher uuid references auth.users(id),
  title text not null, body text, source text,
  audience jsonb not null default '{}', read boolean not null default false,
  version int not null default 1, created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  user_id uuid references auth.users(id),
  name text not null, start_at timestamptz, location text, kind text,
  version int not null default 1, created_at timestamptz default now()
);

create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  owner_membership uuid references memberships(id),
  title text not null, fields jsonb not null default '[]', due date,
  total int not null default 0, status text not null default 'open',
  version int not null default 1, created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists collection_responses (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections(id) on delete cascade,
  member_id uuid references memberships(id),
  payload jsonb not null default '{}', status text not null default 'submitted',
  created_at timestamptz default now()
);

create table if not exists rosters (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text, members jsonb not null default '[]', created_at timestamptz default now()
);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  kind text, title text not null, applicant text,
  state text not null default '待审批', reviewer uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method text, minutes int, rounds int not null default 1, task_id uuid,
  finished_at timestamptz default now(), created_at timestamptz default now()
);

create table if not exists prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  focus_method text default 'pomodoro', focus_min int default 25,
  music_on boolean default false, playlist_id text, ai_model text,
  data jsonb not null default '{}', updated_at timestamptz default now()
);

-- updated_at 触发器
do $$ declare t text;
begin
  foreach t in array array['todos','homework','schedule','notices','collections']
  loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$s', t);
    execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function touch_updated_at()', t);
  end loop;
end $$;

-- ============ 权限判定函数 ============
create or replace function has_capability(p_org uuid, p_cap text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m join roles r on r.id = m.role_id
    where m.user_id = auth.uid() and m.org_id = p_org and m.status = 'active'
      and p_cap = any(r.capabilities)
  );
$$;

create or replace function in_org(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.user_id = auth.uid() and m.org_id = p_org and m.status = 'active'
  );
$$;

-- ============ RLS ============
alter table profiles enable row level security;
alter table orgs enable row level security;
alter table roles enable row level security;
alter table memberships enable row level security;
alter table todos enable row level security;
alter table homework enable row level security;
alter table schedule enable row level security;
alter table notices enable row level security;
alter table events enable row level security;
alter table collections enable row level security;
alter table collection_responses enable row level security;
alter table rosters enable row level security;
alter table approvals enable row level security;
alter table focus_sessions enable row level security;
alter table prefs enable row level security;

-- profiles / prefs：仅本人
create policy p_profiles_all on profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_prefs_all on prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- homework / schedule / focus_sessions：仅本人
create policy p_hw_all on homework for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_sc_all on schedule for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_fs_all on focus_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- todos：personal 本人；org 成员；删除 org 需 assign 能力
create policy p_todos_read on todos for select using ((scope = 'personal' and user_id = auth.uid()) or (scope = 'org' and in_org(org_id)));
create policy p_todos_ins on todos for insert with check ((scope = 'personal' and user_id = auth.uid()) or (scope = 'org' and in_org(org_id)));
create policy p_todos_upd on todos for update using ((scope = 'personal' and user_id = auth.uid()) or (scope = 'org' and in_org(org_id)));
create policy p_todos_del on todos for delete using ((scope = 'personal' and user_id = auth.uid()) or (scope = 'org' and has_capability(org_id,'assign')));

-- orgs / memberships：成员可读
create policy p_orgs_read on orgs for select using (in_org(id));
create policy p_orgs_write on orgs for all using (in_org(id)) with check (in_org(id));
create policy p_mem_read on memberships for select using (user_id = auth.uid() or in_org(org_id));
create policy p_mem_write on memberships for all using (has_capability(org_id,'roster')) with check (has_capability(org_id,'roster'));

-- roles：preset 全可读；自定义仅 owner
create policy p_roles_read on roles for select using (is_preset = true or owner_user = auth.uid());
create policy p_roles_write on roles for all using (owner_user = auth.uid()) with check (owner_user = auth.uid());

-- notices：成员可读；发布需 notice 能力
create policy p_notices_read on notices for select using (in_org(org_id));
create policy p_notices_ins on notices for insert with check (has_capability(org_id,'notice'));
create policy p_notices_upd on notices for update using (has_capability(org_id,'notice'));

-- events：成员可读；建活动需 publish 或 assign
create policy p_events_read on events for select using (in_org(org_id));
create policy p_events_write on events for all using (has_capability(org_id,'publish') or has_capability(org_id,'assign')) with check (true);

-- collections：成员可读；发起需 collect
create policy p_col_read on collections for select using (in_org(org_id));
create policy p_col_ins on collections for insert with check (has_capability(org_id,'collect'));
create policy p_col_upd on collections for update using (has_capability(org_id,'collect'));

-- collection_responses：本人写自己；owner 读全部
create policy p_cr_read on collection_responses for select using (
  exists (select 1 from collections c where c.id = collection_id and in_org(c.org_id))
);
create policy p_cr_write on collection_responses for insert with check (
  exists (select 1 from memberships m where m.id = member_id and m.user_id = auth.uid())
);

-- rosters：成员可读；写需 roster
create policy p_rosters_read on rosters for select using (in_org(org_id));
create policy p_rosters_write on rosters for all using (has_capability(org_id,'roster')) with check (has_capability(org_id,'roster'));

-- approvals：成员可读；审批需 approve
create policy p_appr_read on approvals for select using (in_org(org_id));
create policy p_appr_upd on approvals for update using (has_capability(org_id,'approve'));
create policy p_appr_ins on approvals for insert with check (has_capability(org_id,'approve'));

-- ============ 种子（幂等）============
insert into orgs (id, name, type) values
  ('11111111-1111-1111-1111-111111111111','2026级计算机类1班','class'),
  ('22222222-2222-2222-2222-222222222222','计算机学院学生会','student_union')
on conflict (id) do nothing;

insert into roles (id, org_type, key, name, is_preset, capabilities) values
  ('aaaaaaaa-0000-0000-0000-000000000001','class','monitor','班长',true,'{own,notice,collect,remind,roster,stats}'),
  ('aaaaaaaa-0000-0000-0000-000000000002','class','league_secretary','团支书',true,'{own,collect,remind,roster,approve,doc}'),
  ('aaaaaaaa-0000-0000-0000-000000000003','student_union','union_minister','学生会部长',true,'{own,assign,collect,stats,doc}')
on conflict (id) do nothing;

-- 绑定演示用户（先到 Authentication 建 demo@scut.edu.cn，把下面的 DEMO_UID 换成其 uuid 再执行）
-- insert into memberships (org_id, user_id, role_id, title) values
--  ('11111111-1111-1111-1111-111111111111','DEMO_UID','aaaaaaaa-0000-0000-0000-000000000001','2026级计算机类1班 班长'),
--  ('11111111-1111-1111-1111-111111111111','DEMO_UID','aaaaaaaa-0000-0000-0000-000000000002','2026级计算机类1班 团支书'),
--  ('22222222-2222-2222-2222-222222222222','DEMO_UID','aaaaaaaa-0000-0000-0000-000000000003','计算机学院学生会 部长');

-- 示例收集任务
insert into collections (id, org_id, title, fields, due, total, status) values
  ('cccccccc-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','学生代表信息收集','["姓名","学号"]','2026-11-24',50,'open')
on conflict (id) do nothing;
