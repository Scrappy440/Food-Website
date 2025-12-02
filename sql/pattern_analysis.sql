-- Full pattern-analysis engine for BiteThat!

PRAGMA foreign_keys = ON;


-- Per-meal nutrient + feelings combined

CREATE VIEW IF NOT EXISTS v_user_meal_features AS
SELECT
    m.id AS meal_id,
    m.user_id,
    m.eaten_at,
    COALESCE(v.kcal, 0)       AS kcal,
    COALESCE(v.protein_g, 0)  AS protein_g,
    COALESCE(v.carbs_g, 0)    AS carbs_g,
    COALESCE(v.fat_g, 0)      AS fat_g,
    COALESCE(v.sugar_g, 0)    AS sugar_g,
    COALESCE(v.fiber_g, 0)    AS fiber_g,
    f.mood,
    f.energy,
    f.bloating,
    f.nausea
FROM meals m
LEFT JOIN v_meal_nutrition v ON v.meal_id = m.id
LEFT JOIN feelings f          ON f.meal_id = m.id;

CREATE VIEW IF NOT EXISTS v_meal_health AS
SELECT
    u.meal_id,
    u.user_id,
    u.eaten_at,
    u.kcal,
    u.protein_g,
    u.carbs_g,
    u.fat_g,
    u.sugar_g,
    u.fiber_g,
    u.mood,
    u.energy,
    u.bloating,
    u.nausea,
    (
        (CASE
            WHEN u.fiber_g IS NULL THEN 0
            WHEN u.fiber_g < 10      THEN u.fiber_g
            ELSE 10
         END) * 1.0
        +
        (CASE
            WHEN u.protein_g IS NULL THEN 0
            WHEN u.protein_g < 20    THEN u.protein_g
            ELSE 20
         END) * 0.8
        -
        (CASE
            WHEN u.sugar_g IS NULL THEN 0
            WHEN u.sugar_g < 20     THEN u.sugar_g
            ELSE 20
         END) * 1.2
        -
        (CASE
            WHEN u.fat_g IS NULL THEN 0
            WHEN u.fat_g < 40      THEN u.fat_g
            ELSE 40
         END) * 0.5
        -
        (CASE
            WHEN u.kcal IS NULL THEN 0
            WHEN u.kcal < 500    THEN u.kcal
            ELSE 500
         END) * 0.04
        +
        COALESCE(u.energy, 5)   * 2.0
        +
        COALESCE(u.mood,   5)   * 2.0
        -
        COALESCE(u.bloating, 0) * 3.0
        -
        COALESCE(u.nausea,   0) * 2.0
    ) AS meal_score
FROM v_user_meal_features u;



--  User-specific food effects (learned behavior)

CREATE VIEW IF NOT EXISTS v_user_food_agg AS
WITH used AS (
    SELECT
        m.user_id,
        mi.food_id,
        COUNT(*)              AS n_meals,
        AVG(h.mood)           AS avg_mood,
        AVG(h.energy)         AS avg_energy,
        AVG(h.bloating)       AS avg_bloating,
        AVG(h.nausea)         AS avg_nausea,
        AVG(h.meal_score)     AS avg_meal_score
    FROM meal_items mi
    JOIN meals m        ON m.id = mi.meal_id
    JOIN v_meal_health h ON h.meal_id = m.id
    GROUP BY m.user_id, mi.food_id
)
SELECT * FROM used;


--  Global fallback (when user has no history)

CREATE VIEW IF NOT EXISTS v_global_food_agg AS
WITH used AS (
    SELECT
        mi.food_id,
        COUNT(*)              AS n_meals,
        AVG(f.mood)           AS avg_mood,
        AVG(f.energy)         AS avg_energy,
        AVG(f.bloating)       AS avg_bloating,
        AVG(f.nausea)         AS avg_nausea
    FROM meal_items mi
    JOIN feelings f ON f.meal_id = mi.meal_id
    GROUP BY mi.food_id
)
SELECT * FROM used;



-- Food pair effects (“broccoli + chicken makes me feel great”)

CREATE VIEW IF NOT EXISTS v_user_pair_agg AS
WITH pairs AS (
    SELECT
        m.user_id,
        -- use MIN/MAX instead of LEAST/GREATEST (better SQLite compatibility)
        MIN(a.food_id, b.food_id)  AS food_a,
        MAX(a.food_id, b.food_id)  AS food_b,
        f.mood,
        f.energy,
        f.bloating
    FROM meals m
    JOIN meal_items a ON a.meal_id = m.id
    JOIN meal_items b ON b.meal_id = m.id AND b.food_id > a.food_id
    JOIN feelings f   ON f.meal_id = m.id
)
SELECT
    user_id,
    food_a,
    food_b,
    COUNT(*)        AS n_meals,
    AVG(mood)       AS avg_mood,
    AVG(energy)     AS avg_energy,
    AVG(bloating)   AS avg_bloating
FROM pairs
GROUP BY user_id, food_a, food_b
HAVING COUNT(*) >= 2;



-- HEALTH SCORING RULES
--    Converts nutrients into a score (0 to 100)
--    Used for “healthy meals”, “healthy foods”, and recommendations


-- Scores are purposely simple so teammates can understand:
-- High fiber: +1.0 per gram (up to +10)
-- High protein: +0.8 per gram (up to +16)
-- Sugar penalty: -1.2 per gram (up to -20)
-- Fat penalty: -0.5 per gram (up to -20)
-- Calories penalty: -0.04 per kcal (up to -20)
-- Feelings adjustment:
--   + energy*2
--   + mood*2
--   - bloating*3


CREATE VIEW IF NOT EXISTS v_food_health_score AS
SELECT
    f.id AS food_id,
    f.name,

    -- Clamp each nutrient into a safe range and turn it into points
    (CASE
        WHEN f.fiber_g IS NULL THEN 0
        WHEN f.fiber_g < 10      THEN f.fiber_g
        ELSE 10
     END) * 1.0 AS fiber_score,

    (CASE
        WHEN f.protein_g IS NULL THEN 0
        WHEN f.protein_g < 20    THEN f.protein_g
        ELSE 20
     END) * 0.8 AS protein_score,

    -(CASE
        WHEN f.sugar_g IS NULL THEN 0
        WHEN f.sugar_g < 20     THEN f.sugar_g
        ELSE 20
     END) * 1.2 AS sugar_penalty,

    -(CASE
        WHEN f.fat_g IS NULL THEN 0
        WHEN f.fat_g < 40      THEN f.fat_g
        ELSE 40
     END) * 0.5 AS fat_penalty,

    -(CASE
        WHEN f.kcal IS NULL THEN 0
        WHEN f.kcal < 500    THEN f.kcal
        ELSE 500
     END) * 0.04 AS calorie_penalty,

    (
        (CASE
            WHEN f.fiber_g IS NULL THEN 0
            WHEN f.fiber_g < 10      THEN f.fiber_g
            ELSE 10
         END) * 1.0
        +
        (CASE
            WHEN f.protein_g IS NULL THEN 0
            WHEN f.protein_g < 20    THEN f.protein_g
            ELSE 20
         END) * 0.8
        -
        (CASE
            WHEN f.sugar_g IS NULL THEN 0
            WHEN f.sugar_g < 20     THEN f.sugar_g
            ELSE 20
         END) * 1.2
        -
        (CASE
            WHEN f.fat_g IS NULL THEN 0
            WHEN f.fat_g < 40      THEN f.fat_g
            ELSE 40
         END) * 0.5
        -
        (CASE
            WHEN f.kcal IS NULL THEN 0
            WHEN f.kcal < 500    THEN f.kcal
            ELSE 500
         END) * 0.04
    ) AS base_health_score
FROM foods f;




-- USER PERSONALIZED FOOD HEALTH SCORE (how the user actually FEELS after eating the food)

CREATE VIEW IF NOT EXISTS v_user_food_health AS
SELECT
    u.user_id,
    u.food_id,
    f.name,
    s.base_health_score,
    u.n_meals,
    (u.avg_energy * 2.0)            AS energy_bonus,
    (u.avg_mood   * 2.0)            AS mood_bonus,
    -(u.avg_bloating * 3.0)         AS bloat_penalty,
    u.avg_meal_score                AS personalized_score
FROM v_user_food_agg u
JOIN v_food_health_score s ON s.food_id = u.food_id
JOIN foods f               ON f.id      = u.food_id;


-- Indexes
CREATE INDEX IF NOT EXISTS idx_meal_items_meal   ON meal_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_food   ON meal_items(food_id);
CREATE INDEX IF NOT EXISTS idx_meals_user_time   ON meals(user_id, eaten_at DESC);
CREATE INDEX IF NOT EXISTS idx_feelings_meal     ON feelings(meal_id);
CREATE INDEX IF NOT EXISTS idx_foods_name_lower  ON foods(LOWER(name));
