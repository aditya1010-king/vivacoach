-- Copy this file, fill it in for your real lab, and run it in Supabase SQL Editor.
-- IDs: use short lowercase codes: <university>-<branch>-<semester>-<lab>, e.g. 'sppu-comp-3-dsl'.

insert into public.labs (id, university, branch, semester, name) values
  ('UNI-BRANCH-SEM-LAB', 'University name', 'Computer Engineering', 3, 'Lab name as on the timetable');

insert into public.experiments (id, lab_id, position, title) values
  ('UNI-BRANCH-SEM-LAB-e1', 'UNI-BRANCH-SEM-LAB', 1, 'Experiment 1 title from the lab manual'),
  ('UNI-BRANCH-SEM-LAB-e2', 'UNI-BRANCH-SEM-LAB', 2, 'Experiment 2 title');

-- Aim for 8-12 questions per experiment. Ask seniors which ones examiners really ask.
-- model_answer: what a good ~1-minute spoken answer says (3-5 sentences).
-- key_points: 3-6 short points the examiner listens for. The AI grades against these.
-- difficulty: 1 easy, 2 medium, 3 hard. Use '' (two single quotes) for an apostrophe inside text.
insert into public.questions (experiment_id, position, question, model_answer, key_points, difficulty) values
('UNI-BRANCH-SEM-LAB-e1', 1,
 'Question text exactly as an examiner would ask it?',
 'Model answer in 3-5 plain sentences.',
 array['key point 1', 'key point 2', 'key point 3'], 1),
('UNI-BRANCH-SEM-LAB-e1', 2,
 'Next question?',
 'Model answer.',
 array['key point 1', 'key point 2'], 2);

-- To hide the sample lab once your real lab is live:
-- update public.labs set is_active = false where id = 'sample-ce-3-dsl';
