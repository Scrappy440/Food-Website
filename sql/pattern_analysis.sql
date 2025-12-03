-- Full pattern-analysis engine for BiteThat!
--  - Attach how you FEEL to each whole meal (breakfast/lunch/dinner/snacks)
--  - From those meals, learn which individual foods and food pairs
--    tend to make you feel good or bad.

PRAGMA foreign_keys = ON;

---------------------------------------------------------------------------
--  MEAL-LEVEL FEATURES: nutrients + feelings for each meal
---------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS v_user_meal_features AS
SELECT
    m.id         AS meal_id,
    m.user_id,
    m.eaten_at,

    -- summed nutrients for the whole meal (from v_meal_nutrition)
    COALESCE(v.kcal,      0) AS kcal,
    COALESCE(v.protein_g, 0) AS protein_g,
    COALESCE(v.carbs_g,   0) AS carbs_g,
    COALESCE(v.fat_g,     0) AS fat_g,
    COALESCE(v.sugar_g,   0) AS sugar_g,
    COALESCE(v.fiber_g,   0) AS fiber_g,

    -- feelings for this meal (if there is more than one feeling row,
    -- average them so we still get exactly one row per meal)
    AVG(f.mood)     AS mood,
    AVG(f.energy)   AS energy,
    AVG(f.bloating) AS bloating,
    AVG(f.nausea)   AS nausea

FROM meals m
LEFT JOIN v_meal_nutrition v ON v.meal_id = m.id
LEFT JOIN feelings f          ON f.meal_id = m.id
GROUP BY m.id, m.user_id, m.eaten_at;

---------------------------------------------------------------------------
-- USER-SPECIFIC FOOD EFFECTS
--    "How do I *usually* feel when I eat this food, across all my meals?"
---------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS v_user_food_agg AS
WITH used AS (
    SELECT
        m.user_id,
        mi.food_id,

        COUNT(*)          AS n_meals,      -- how many meals this user ate this food in

        AVG(f.mood)       AS avg_mood,
        AVG(f.energy)     AS avg_energy,
        AVG(f.bloating)   AS avg_bloating,
        AVG(f.nausea)     AS avg_nausea

    FROM meal_items mi
    JOIN meals    m ON m.id = mi.meal_id
    JOIN feelings f ON f.meal_id = mi.meal_id

    -- one row here = "this meal contained this food and we have a feeling recorded"
    GROUP BY m.user_id, mi.food_id
)
SELECT * FROM used;

---------------------------------------------------------------------------
-- GLOBAL FOOD EFFECTS (fallback when user has no history)
---------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS v_global_food_agg AS
WITH used AS (
    SELECT
        mi.food_id,
        COUNT(*)          AS n_meals,
        AVG(f.mood)       AS avg_mood,
        AVG(f.energy)     AS avg_energy,
        AVG(f.bloating)   AS avg_bloating,
        AVG(f.nausea)     AS avg_nausea
    FROM meal_items mi
    JOIN feelings f ON f.meal_id = mi.meal_id
    GROUP BY mi.food_id
)
SELECT * FROM used;

---------------------------------------------------------------------------
--  FOOD PAIR EFFECTS
--    "Broccoli + chicken makes me feel great" / "Cheeseburger + fries wreck me"
---------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS v_user_pair_agg AS
WITH pairs AS (
    SELECT
        m.user_id,

        -- Use MIN/MAX instead of LEAST/GREATEST for SQLite compatibility
        MIN(a.food_id, b.food_id) AS food_a,
        MAX(a.food_id, b.food_id) AS food_b,

        f.mood,
        f.energy,
        f.bloating
    FROM meals m
    JOIN meal_items a ON a.meal_id = m.id
    JOIN meal_items b ON b.meal_id = m.id AND b.food_id > a.food_id
    JOIN feelings  f  ON f.meal_id = m.id
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
HAVING COUNT(*) >= 2;  -- only keep pairs we have seen multiple times

---------------------------------------------------------------------------
--  BASE FOOD "HEALTH SCORE" FROM NUTRIENTS ONLY
--   
--      + fiber    is good
--      + protein  is good
--      - sugar    is bad
--      - fat      is bad
--      - calories are bad when very high
---------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS v_food_health_score AS
SELECT
    f.id   AS food_id,
    f.name,

    -- Fiber: +1.0 per gram, capped at +10
    (CASE
        WHEN f.fiber_g IS NULL THEN 0
        WHEN f.fiber_g < 10      THEN f.fiber_g
        ELSE 10
     END) * 1.0 AS fiber_score,

    -- Protein: +0.8 per gram, capped at +16 (20 g)
    (CASE
        WHEN f.protein_g IS NULL THEN 0
        WHEN f.protein_g < 20    THEN f.protein_g
        ELSE 20
     END) * 0.8 AS protein_score,

    -- Sugar: -1.2 per gram, capped at -24 (20 g)
    -(CASE
        WHEN f.sugar_g IS NULL THEN 0
        WHEN f.sugar_g < 20     THEN f.sugar_g
        ELSE 20
     END) * 1.2 AS sugar_penalty,

    -- Fat: -0.5 per gram, capped at -20 (40 g)
    -(CASE
        WHEN f.fat_g IS NULL THEN 0
        WHEN f.fat_g < 40      THEN f.fat_g
        ELSE 40
     END) * 0.5 AS fat_penalty,

    -- Calories: -0.04 per kcal, capped at -20 (500 kcal)
    -(CASE
        WHEN f.kcal IS NULL THEN 0
        WHEN f.kcal < 500    THEN f.kcal
        ELSE 500
     END) * 0.04 AS calorie_penalty,

    -- Combine all of the above into one base score
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

--    USER-PERSONALIZED FOOD HEALTH SCORE
--    Take the base nutrient score and adjust it by how YOU feel.
--    This is what the Meal Analysis page uses for good_foods / bad_foods.


CREATE VIEW IF NOT EXISTS v_user_food_health AS
SELECT
    u.user_id,
    u.food_id,
    f.name,
    f.base_health_score,
    u.n_meals,

    (u.avg_energy   * 2.0) AS energy_bonus,
    (u.avg_mood     * 2.0) AS mood_bonus,
    -(u.avg_bloating * 3.0) AS bloat_penalty,

    -- Final personalized score:
    --   good nutrients + good feelings - bad symptoms
    (
        f.base_health_score
        + (u.avg_energy   * 2.0)
        + (u.avg_mood     * 2.0)
        - (u.avg_bloating * 3.0)
    ) AS personalized_score

FROM v_user_food_agg      u
JOIN v_food_health_score  f ON f.food_id = u.food_id;

--  INDEXES -----

CREATE INDEX IF NOT EXISTS idx_meal_items_meal   ON meal_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_food   ON meal_items(food_id);
CREATE INDEX IF NOT EXISTS idx_meals_user_time   ON meals(user_id, eaten_at DESC);
CREATE INDEX IF NOT EXISTS idx_feelings_meal     ON feelings(meal_id);
CREATE INDEX IF NOT EXISTS idx_foods_name_lower  ON foods(LOWER(name));
