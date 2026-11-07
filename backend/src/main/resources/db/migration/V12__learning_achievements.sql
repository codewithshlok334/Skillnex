ALTER TABLE aptitude_mocks ADD COLUMN awards_json TEXT NOT NULL DEFAULT '[]';
INSERT INTO badges(id,name,description) VALUES
 ('learning-first','First Finish','Solve 1 CodeLab problem, or finish an aptitude mock with at least 10 answered questions.'),
 ('learning-sharp','Sharp Thinker','Solve 5 distinct Medium/Hard CodeLab problems, or score at least 70% in an aptitude mock of 20+ questions.'),
 ('learning-high','High Scorer','Solve 10 distinct CodeLab problems, or score at least 85% in an aptitude mock of 20+ questions.'),
 ('learning-perfect','Perfect Round','Solve 5 CodeLab problems on their first judged submission, or score 100% in an aptitude mock of 20+ questions.'),
 ('learning-hard','Hard Mode Hero','Solve 1 Hard CodeLab problem, or score at least 85% in an all-Hard aptitude mock of 20+ questions.');
