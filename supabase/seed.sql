-- Run after 0001_init.sql and 0002_automobile_pivot.sql. Seeds 3 sedan units
-- sharing the same procedural 3D car model (src/components/CarScene.tsx),
-- with a realistic mix of human/agent-sourced defects at named car zones
-- (see CAR_ZONES in src/lib/types.ts) - one clean pass, one fail with a
-- rework flag, one clean pass.

insert into public.products (name, diagram_url, diagram_width, diagram_height, diagram_depth) values
('Sedan Unit #1', 'model:sedan-v1', 4.2, 1.6, 1.9),
('Sedan Unit #2', 'model:sedan-v1', 4.2, 1.6, 1.9),
('Sedan Unit #3', 'model:sedan-v1', 4.2, 1.6, 1.9);

-- Unit #1: one resolved minor scratch (will PASS)
insert into public.defects (product_id, x, y, z, defect_type, severity, note, resolved, source, created_at)
select id, 2.6, 0.65, 1.85, 'scratch', 'low', 'Light scratch on left front door, cosmetic only.', true, 'human', now() - interval '3 hours'
from public.products where name = 'Sedan Unit #1';

-- Unit #2: mixed defects, one unresolved high severity (will FAIL)
insert into public.defects (product_id, x, y, z, defect_type, severity, note, resolved, source, created_at)
select id, 2.9, 1.05, 0.0, 'missing_part', 'high', 'Right side mirror housing missing entirely.', false, 'agent', now() - interval '2 hours 10 minutes'
from public.products where name = 'Sedan Unit #2';
insert into public.defects (product_id, x, y, z, defect_type, severity, note, resolved, source, created_at)
select id, 4.1, 0.5, 0.95, 'dent', 'med', 'Shallow dent on front bumper, buffed out.', true, 'agent', now() - interval '2 hours 5 minutes'
from public.products where name = 'Sedan Unit #2';
insert into public.defects (product_id, x, y, z, defect_type, severity, note, resolved, source, created_at)
select id, 3.2, 0.75, 0.95, 'crack', 'low', 'Hairline crack near hood edge, cosmetic only.', true, 'human', now() - interval '1 hour 50 minutes'
from public.products where name = 'Sedan Unit #2';
insert into public.defects (product_id, x, y, z, defect_type, severity, note, resolved, source, created_at)
select id, 1.6, 0.65, 1.85, 'dent', 'high', 'Significant dent on left rear door, affects closing.', false, 'human', now() - interval '1 hour 40 minutes'
from public.products where name = 'Sedan Unit #2';

-- Unit #2 flagged for rework given the unresolved high-severity defects
insert into public.reports (scope_type, product_id, summary, pass_fail, created_at)
select 'product', id, '{"rework": true, "reason": "Missing right mirror and a rear door dent affecting closure."}', 'fail', now() - interval '1 hour 30 minutes'
from public.products where name = 'Sedan Unit #2';

-- Unit #3: clean pass, all resolved, low severity only
insert into public.defects (product_id, x, y, z, defect_type, severity, note, resolved, source, created_at)
select id, 3.2, 0.75, 0.95, 'paint_defect', 'low', 'Minor paint blemish on hood, within tolerance.', true, 'human', now() - interval '40 minutes'
from public.products where name = 'Sedan Unit #3';
