-- note: run this in the supabase sql editor (dashboard > sql editor > new query)
-- create books table
create table books (
  -- bigint generated always as identity automatically assigns each new row the next whole num starting from 1
  id           bigint generated always as identity primary key,
  -- can only be projects, certificates, experience or about
  section      text not null check (section in ('projects', 'certificates', 'experience', 'about')),
  sort_order   integer not null default 0,
  type         text check (type in ('cert', 'award') or type is null),
  slug         text not null,
  title        text not null,
  meta         text default '',
  description  text default '',
  -- jsonb is a data type for storing structured data like lists or objs
  tags         jsonb default '[]'::jsonb,
  links        jsonb default '[]'::jsonb,
  bullets      jsonb,
  schools      jsonb,
  related      jsonb,
  image        text,
  -- timestamp is automatically recorded when a row is created
  created_at   timestamptz not null default now()
);

-- ensures no two rows have the same section and slug
create unique index books_section_slug_idx on books (section, slug);
create index books_section_sort_idx on books (section, sort_order); -- speeds up the sorting

-- allow reading only
alter table books enable row level security;

create policy "Public can read books"
  on books for select
  using (true);