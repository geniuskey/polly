-- Seed polls for cold start
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed001', '짜장면 vs 짬뽕, 당신의 선택은?', '["짜장면","짬뽕","볶음밥"]', 'food', 1, datetime('now', '-2 hours'));

INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed002', '여름휴가, 어디로?', '["바다","산","해외여행","집콕"]', 'life', 1, datetime('now', '-1 hours'));

INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed003', '아이폰 vs 갤럭시', '["아이폰","갤럭시"]', 'tech', 1, datetime('now', '-30 minutes'));

INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed004', '민트초코, 어떻게 생각해?', '["맛있다","치약맛이다"]', 'food', 1, datetime('now', '-45 minutes'));

INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed005', '재택근무 vs 출근, 더 좋은 것은?', '["재택근무","출근","하이브리드"]', 'life', 1, datetime('now', '-15 minutes'));

INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed006', '탕수육 소스는?', '["부먹","찍먹","반반"]', 'food', 1, datetime('now', '-3 hours'));

INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed007', '주말에 뭐해?', '["넷플릭스","운동","친구만남","잠"]', 'life', 1, datetime('now', '-20 minutes'));

INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed008', 'AI가 인간의 일자리를 대체할까?', '["대부분 대체","일부만 대체","대체 안됨"]', 'tech', 1, datetime('now', '-10 minutes'));

INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed009', '최고의 치킨은?', '["후라이드","양념","간장","뿌링클"]', 'food', 1, datetime('now', '-5 minutes'));

INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed010', '아침형 인간 vs 저녁형 인간', '["아침형","저녁형","둘 다 아님"]', 'life', 1, datetime('now'));

-- Add tags for seed polls
INSERT OR IGNORE INTO tags (name, poll_count) VALUES ('음식', 4), ('라이프', 4), ('기술', 2), ('논쟁', 3), ('취향', 5);

INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed001', id FROM tags WHERE name = '음식';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed001', id FROM tags WHERE name = '논쟁';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed004', id FROM tags WHERE name = '음식';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed004', id FROM tags WHERE name = '논쟁';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed006', id FROM tags WHERE name = '음식';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed006', id FROM tags WHERE name = '논쟁';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed009', id FROM tags WHERE name = '음식';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed009', id FROM tags WHERE name = '취향';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed002', id FROM tags WHERE name = '라이프';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed002', id FROM tags WHERE name = '취향';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed005', id FROM tags WHERE name = '라이프';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed007', id FROM tags WHERE name = '라이프';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed007', id FROM tags WHERE name = '취향';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed010', id FROM tags WHERE name = '라이프';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed010', id FROM tags WHERE name = '취향';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed003', id FROM tags WHERE name = '기술';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed003', id FROM tags WHERE name = '논쟁';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed008', id FROM tags WHERE name = '기술';
