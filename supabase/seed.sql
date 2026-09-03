-- Run after the migrations in supabase/migrations/. Seeds 3 empty sedan
-- units sharing the same 3D car model - no defects. The whole point of the
-- demo is watching pins appear live (a human click, or an agent from a note
-- or a real photo), so the units start clean rather than pre-populated.

insert into public.products (name, diagram_url, diagram_width, diagram_height, diagram_depth) values
('Sedan Unit #1', 'model:sedan-v1', 4.2, 1.6, 1.9),
('Sedan Unit #2', 'model:sedan-v1', 4.2, 1.6, 1.9),
('Sedan Unit #3', 'model:sedan-v1', 4.2, 1.6, 1.9);
