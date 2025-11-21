-- TESTING
INSERT OR IGNORE INTO users (email, display_name, hashed_password) VALUES
 ('bolu@example.com', 'Boluwatife','dev_only_hash'),
 ('natalia@example.com','Natalia', 'dev_only_hash'),
 ('david@example.com', 'David', 'dev_only_hash');

INSERT OR IGNORE INTO user_prefs (user_id, region, unit_system, dietary_tags) VALUES
 (1, 'US', 'metric', ''); 


INSERT INTO foods (name, brand, serving_size_g, kcal, protein_g, carbs_g, fat_g, sugar_g, fiber_g) VALUES
 ('Grilled Chicken Breast', NULL, 100, 165, 31, 0, 3.6, 0, 0),
 ('Brown Rice (cooked)', NULL, 100, 111, 2.6, 23, 0.9, 0.4, 1.8),
 ('Broccoli (steamed)', NULL, 100, 35, 2.4, 7.2, 0.4, 1.4, 3.3),
 ('Greek Yogurt, plain', NULL, 150, 146, 15, 5.7, 4, 5.5, 0),
 ('Banana', NULL, 118, 105, 1.3, 27, 0.3, 14.4, 3.1),
 ('Eggs, scrambled', NULL, 100, 148, 10, 2, 11, 1.1, 0),
 ('Oats (dry)', NULL, 40, 150, 5, 27, 3, 1, 4),
 ('Almonds', NULL, 28, 164, 6, 6, 14, 1.2, 3.5);

-- Sample meals 
INSERT INTO meals (user_id, eaten_at, title, notes) VALUES
 (1, datetime('now','-2 days','-5 hours'), 'Lunch bowl', 'gym day'),
 (1, datetime('now','-1 days','-2 hours'), 'Breakfast', 'rushed morning'),
 (1, datetime('now','-1 days','-30 minutes'), 'Snack', NULL);

-- Link foods to meals
INSERT INTO meal_items (meal_id, food_id, quantity_servings) VALUES
 (1, 1, 1.2), -- chicken
 (1, 2, 1.5), -- rice
 (1, 3, 1.0), -- broccoli
 (2, 6, 1.0), -- eggs
 (2, 7, 1.0), -- oats
 (2, 4, 1.0), -- yogurt
 (3, 8, 0.5), -- almonds
 (3, 5, 1.0); -- banana

-- Feelings logged after those meals
INSERT INTO feelings (meal_id, user_id, recorded_at, mood, energy, bloating, nausea, notes) VALUES
 (1, 1, datetime('now','-2 days','-4 hours'), 7, 8, 2, 0, 'felt strong'),
 (2, 1, datetime('now','-1 days','-1 hours'), 5, 4, 5, 1, 'a bit bloated'),
 (3, 1, datetime('now','-1 days'), 6, 6, 1, 0, 'fine');
