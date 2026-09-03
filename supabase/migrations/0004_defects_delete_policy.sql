-- Deleting a mis-clicked defect is a human-only UI action (never exposed as
-- a WebMCP tool - an agent shouldn't get to delete unilaterally), but it
-- still needs RLS permission like every other write, or it silently
-- deletes zero rows instead of erroring.
create policy "public delete defects" on public.defects for delete using (true);
