-- ============================================================================
-- Ledger — starter Exercise Library + equipment (§3.1).
-- Run in the Supabase SQL editor AFTER schema.sql. Re-runnable: rows are skipped
-- if an exercise / equipment tag of the same name already exists.
-- ============================================================================

insert into public.equipment (name)
select v.name from (values
  ('Barbell'), ('Dumbbell'), ('Kettlebell'), ('Bench'), ('Pull-up bar'),
  ('Bodyweight'), ('TRX'), ('Jump rope'), ('Medicine ball'), ('Box'),
  ('Resistance band'), ('Treadmill')
) as v(name)
on conflict (name) do nothing;

-- Starter exercises. is_custom = false marks them as the permanent starter set
-- (no Archive action in the form; §3.1 / manage-library prompt).
insert into public.exercises
  (name, equipment, muscle_groups, type, metric_type, format,
   default_rest_seconds, default_sets, default_reps, default_weight, default_duration,
   is_custom)
select v.* from (values
  ('Barbell Bench Press', '{Barbell,Bench}'::text[], '{chest,arms}'::text[], 'strength', 'weight', 'straight_sets', 120, 3, 8, 135::numeric, null::integer, false),
  ('Back Squat',          '{Barbell}'::text[],       '{legs,glutes}'::text[], 'strength', 'weight', 'straight_sets', 180, 5, 5, 185, null, false),
  ('Front Squat',         '{Barbell}'::text[],       '{legs}'::text[],        'strength', 'weight', 'straight_sets', 150, 4, 6, 135, null, false),
  ('Deadlift',            '{Barbell}'::text[],       '{back,legs,glutes}'::text[], 'strength', 'weight', 'straight_sets', 180, 3, 5, 225, null, false),
  ('Romanian Deadlift',   '{Barbell}'::text[],       '{legs,glutes}'::text[], 'strength', 'weight', 'straight_sets', 120, 3, 8, 155, null, false),
  ('Overhead Press',      '{Barbell}'::text[],       '{shoulders}'::text[],   'strength', 'weight', 'straight_sets', 120, 4, 6, 95, null, false),
  ('Barbell Row',         '{Barbell}'::text[],       '{back}'::text[],        'strength', 'weight', 'straight_sets', 120, 4, 8, 115, null, false),
  ('Dumbbell Shoulder Press', '{Dumbbell}'::text[],  '{shoulders}'::text[],   'strength', 'weight', 'straight_sets', 90, 3, 10, 40, null, false),
  ('Dumbbell Bench Press',    '{Dumbbell,Bench}'::text[], '{chest}'::text[],  'strength', 'weight', 'straight_sets', 90, 3, 10, 50, null, false),
  ('Dumbbell Row',            '{Dumbbell}'::text[],  '{back}'::text[],        'strength', 'weight', 'straight_sets', 90, 3, 10, 55, null, false),
  ('Bulgarian Split Squat',   '{Dumbbell}'::text[],  '{legs,glutes}'::text[], 'strength', 'weight', 'straight_sets', 90, 3, 10, 35, null, false),
  ('Goblet Squat',        '{Kettlebell}'::text[],    '{legs}'::text[],        'strength', 'weight', 'straight_sets', 90, 3, 12, 53, null, false),
  ('Kettlebell Swing',    '{Kettlebell}'::text[],    '{glutes,back}'::text[], 'strength', 'weight', 'straight_sets', 60, 3, 15, 53, null, false),
  ('Kettlebell Halo',     '{Kettlebell}'::text[],    '{shoulders,core}'::text[], 'strength', 'weight', 'straight_sets', 45, 2, 10, 25, null, false),
  ('Turkish Get-Up',      '{Kettlebell}'::text[],    '{full body}'::text[],   'strength', 'weight', 'straight_sets', 90, 3, 5, 35, null, false),
  ('Pull-Up',             '{Pull-up bar}'::text[],   '{back,arms}'::text[],   'strength', 'bodyweight', 'straight_sets', 90, 3, 8, null, null, false),
  ('Chin-Up',             '{Pull-up bar}'::text[],   '{back,arms}'::text[],   'strength', 'bodyweight', 'straight_sets', 90, 3, 8, null, null, false),
  ('Push-Up',             '{Bodyweight}'::text[],    '{chest,arms}'::text[],  'strength', 'bodyweight', 'straight_sets', 60, 3, 15, null, null, false),
  ('Dip',                 '{Bodyweight}'::text[],    '{chest,arms}'::text[],  'strength', 'bodyweight', 'straight_sets', 90, 3, 10, null, null, false),
  ('TRX Row',             '{TRX}'::text[],           '{back}'::text[],        'strength', 'bodyweight', 'straight_sets', 60, 3, 12, null, null, false),
  ('TRX Bicep Curl',      '{TRX}'::text[],           '{arms}'::text[],        'strength', 'bodyweight', 'straight_sets', 60, 3, 12, null, null, false),
  ('Air Squat',           '{Bodyweight}'::text[],    '{legs}'::text[],        'strength', 'bodyweight', 'straight_sets', 45, 3, 20, null, null, false),
  ('Wall Walk',           '{Bodyweight}'::text[],    '{shoulders,core}'::text[], 'strength', 'bodyweight', 'straight_sets', 60, 3, 4, null, null, false),
  ('Burpee',              '{Bodyweight}'::text[],    '{full body}'::text[],   'cardio',   'bodyweight', 'straight_sets', 60, 3, 12, null, null, false),
  ('Box Jump',            '{Box}'::text[],           '{legs}'::text[],        'strength', 'bodyweight', 'straight_sets', 60, 3, 10, null, null, false),
  ('Medicine Ball Slam',  '{Medicine ball}'::text[], '{core}'::text[],        'strength', 'weight', 'straight_sets', 45, 3, 12, 20, null, false),
  ('Plank',               '{Bodyweight}'::text[],    '{core}'::text[],        'mobility', 'time', 'straight_sets', 45, 3, 1, null, 45, false),
  ('Jump Rope',           '{Jump rope}'::text[],     '{}'::text[],            'cardio',   'time', 'straight_sets', 30, 3, 1, null, 120, false),
  ('200m Run',            '{}'::text[],              '{}'::text[],            'cardio',   'time', 'straight_sets', 60, 3, 1, null, 50, false),
  ('400m Run',            '{}'::text[],              '{}'::text[],            'cardio',   'time', 'straight_sets', 90, 3, 1, null, 110, false),
  ('Mile Run',            '{}'::text[],              '{}'::text[],            'cardio',   'time', 'straight_sets', 0, 1, 1, null, 450, false)
) as v(name, equipment, muscle_groups, type, metric_type, format,
       default_rest_seconds, default_sets, default_reps, default_weight, default_duration, is_custom)
where not exists (select 1 from public.exercises e where e.name = v.name);
