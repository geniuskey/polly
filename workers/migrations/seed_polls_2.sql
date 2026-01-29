-- More seed polls
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed011', '피자 vs 치킨, 배달음식 1위는?', '["피자","치킨"]', 'food', 1, datetime('now', '-4 hours'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed012', '코카콜라 vs 펩시', '["코카콜라","펩시","둘 다 맛있다"]', 'food', 1, datetime('now', '-3 hours'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed013', '강아지 vs 고양이', '["강아지","고양이","둘 다","동물 안 좋아함"]', 'life', 1, datetime('now', '-2 hours'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed014', '현금 vs 카드, 주로 쓰는 결제수단은?', '["현금","카드","간편결제"]', 'life', 1, datetime('now', '-1 hours'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed015', '넷플릭스 vs 유튜브 프리미엄', '["넷플릭스","유튜브 프리미엄","둘 다","둘 다 안 씀"]', 'entertainment', 1, datetime('now', '-50 minutes'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed016', '라면은 봉지 vs 컵라면', '["봉지라면","컵라면"]', 'food', 1, datetime('now', '-40 minutes'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed017', '해외여행 vs 국내여행', '["해외여행","국내여행"]', 'life', 1, datetime('now', '-35 minutes'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed018', '결혼은 필수? 선택?', '["필수","선택","잘 모르겠다"]', 'society', 1, datetime('now', '-25 minutes'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed019', '짧은 머리 vs 긴 머리', '["짧은 머리","긴 머리","상관없음"]', 'life', 1, datetime('now', '-18 minutes'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed020', '여름 vs 겨울, 더 좋은 계절은?', '["여름","겨울","봄/가을"]', 'life', 1, datetime('now', '-12 minutes'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed021', '맥북 vs 윈도우 노트북', '["맥북","윈도우"]', 'tech', 1, datetime('now', '-8 minutes'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed022', '소주 vs 맥주', '["소주","맥주","폭탄주","안 마심"]', 'food', 1, datetime('now', '-6 minutes'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed023', '아메리카노 vs 라떼', '["아메리카노","라떼","커피 안 마심"]', 'food', 1, datetime('now', '-4 minutes'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed024', '새벽 배송 써봤어?', '["자주 씀","가끔 씀","안 써봄"]', 'life', 1, datetime('now', '-3 minutes'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed025', '운동은 아침 vs 저녁?', '["아침","저녁","운동 안 함"]', 'life', 1, datetime('now', '-2 minutes'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed026', '영화관 vs OTT', '["영화관","OTT","둘 다"]', 'entertainment', 1, datetime('now', '-1 minutes'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed027', '대중교통 vs 자가용', '["대중교통","자가용","자전거/킥보드"]', 'life', 1, datetime('now'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed028', '떡볶이 vs 순대', '["떡볶이","순대","떡순이"]', 'food', 1, datetime('now', '-55 minutes'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed029', '삼겹살 vs 목살', '["삼겹살","목살"]', 'food', 1, datetime('now', '-48 minutes'));
INSERT INTO polls (id, question, options, category, is_active, created_at) VALUES
('seed030', '당근마켓 써봤어?', '["자주 씀","가끔 씀","안 써봄"]', 'life', 1, datetime('now', '-42 minutes'));

-- Add tags
INSERT OR IGNORE INTO tags (name, poll_count) VALUES ('배달', 2), ('음료', 3), ('동물', 1), ('결제', 1), ('구독', 1), ('계절', 1), ('술', 1), ('커피', 1), ('교통', 1);

-- Update existing tag counts
UPDATE tags SET poll_count = poll_count + 8 WHERE name = '음식';
UPDATE tags SET poll_count = poll_count + 8 WHERE name = '라이프';
UPDATE tags SET poll_count = poll_count + 1 WHERE name = '기술';
UPDATE tags SET poll_count = poll_count + 6 WHERE name = '취향';
UPDATE tags SET poll_count = poll_count + 4 WHERE name = '논쟁';

-- Link polls to tags
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed011', id FROM tags WHERE name = '음식';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed011', id FROM tags WHERE name = '배달';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed011', id FROM tags WHERE name = '논쟁';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed012', id FROM tags WHERE name = '음료';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed012', id FROM tags WHERE name = '논쟁';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed013', id FROM tags WHERE name = '동물';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed013', id FROM tags WHERE name = '논쟁';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed014', id FROM tags WHERE name = '결제';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed014', id FROM tags WHERE name = '라이프';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed015', id FROM tags WHERE name = '구독';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed015', id FROM tags WHERE name = '취향';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed016', id FROM tags WHERE name = '음식';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed016', id FROM tags WHERE name = '취향';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed017', id FROM tags WHERE name = '라이프';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed017', id FROM tags WHERE name = '취향';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed018', id FROM tags WHERE name = '라이프';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed018', id FROM tags WHERE name = '논쟁';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed019', id FROM tags WHERE name = '취향';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed020', id FROM tags WHERE name = '계절';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed020', id FROM tags WHERE name = '취향';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed021', id FROM tags WHERE name = '기술';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed021', id FROM tags WHERE name = '논쟁';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed022', id FROM tags WHERE name = '술';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed022', id FROM tags WHERE name = '음식';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed023', id FROM tags WHERE name = '커피';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed023', id FROM tags WHERE name = '음식';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed024', id FROM tags WHERE name = '라이프';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed025', id FROM tags WHERE name = '라이프';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed025', id FROM tags WHERE name = '취향';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed026', id FROM tags WHERE name = '취향';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed027', id FROM tags WHERE name = '교통';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed027', id FROM tags WHERE name = '라이프';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed028', id FROM tags WHERE name = '음식';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed029', id FROM tags WHERE name = '음식';
INSERT INTO poll_tags (poll_id, tag_id) SELECT 'seed030', id FROM tags WHERE name = '라이프';
