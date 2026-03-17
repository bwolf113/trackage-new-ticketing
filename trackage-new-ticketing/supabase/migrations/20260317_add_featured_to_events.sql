-- Add featured event columns for homepage hero carousel
alter table events add column if not exists is_featured boolean not null default false;
alter table events add column if not exists featured_order integer not null default 0;

-- Index for quick featured lookup
create index if not exists events_is_featured_idx on events(is_featured) where is_featured = true;
