-- Pivot from PCB (2D, pixel-space) to automobile (3D holographic display,
-- meter-space world coordinates). Run after 0001_init.sql.

-- Clear the old PCB seed data first so the new CHECK constraints validate cleanly.
delete from public.reports;
delete from public.defects;
delete from public.products;

alter table public.defects add column z double precision not null default 0;

-- Bounding-box dims must be in the same unit scale as the actual Three.js
-- mesh (meters), not pixels - integer was fine for PCB pixel dimensions,
-- not for a meter-scale 3D model.
alter table public.products add column diagram_depth double precision not null default 1.9 check (diagram_depth > 0);
alter table public.products alter column diagram_width type double precision;
alter table public.products alter column diagram_height type double precision;

alter table public.defects drop constraint defects_defect_type_check;
alter table public.defects add constraint defects_defect_type_check check (defect_type in (
  'scratch','dent','paint_defect','misalignment','crack','missing_part','unknown'
));
alter table public.defects drop constraint defects_suggested_defect_type_check;
alter table public.defects add constraint defects_suggested_defect_type_check check (suggested_defect_type in (
  'scratch','dent','paint_defect','misalignment','crack','missing_part','unknown'
));
