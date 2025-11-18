-- pattern_queries.sql
-- Library of queries used by the app for pattern analysis & recommendations.


--  Nutrition for a planned meal (user picks foods + grams)
-- Backend builds a temp table pick(food_id, grams) and runs:
-- (assumes foods.serving_size_g is the base size for the nutrient values)

WITH pick(food_id, grams) AS (
    VALUES
      (?, ?),   -- e.g., (chicken_id, 120g)
      (?, ?),   -- (broccoli_id, 80g)
      (?, ?)    
),
per_food AS (
    SELECT
        p.food_id,
        f.name,
        p.grams,
        f.serving_size_g,
        (p.grams / NULLIF(f.serving_size_g, 0)) AS factor,
        f.kcal, f.protein_g, f.carbs_g, f.fat_g, f.sugar_g, f.fiber_g
    FROM pick p
    JOIN foods f ON f.id = p.food_id
),
totals AS (
    SELECT
        SUM(factor * kcal)      AS total_kcal,
        SUM(factor * protein_g) AS total_protein_g,
        SUM(factor * carbs_g)   AS total_carbs_g,
        SUM(factor * fat_g)     AS total_fat_g,
        SUM(factor * sugar_g)   AS total_sugar_g,
        SUM(factor * fiber_g)   AS total_fiber_g
    FROM per_food
)
SELECT * FROM totals;

--  Predict how the user will feel after this planned meal

WITH pick(food_id) AS (
    VALUES
      (?), (?), (?) 
),
base AS (
    SELECT
        p.food_id,
        COALESCE(u.avg_mood,    g.avg_mood)    AS mood,
        COALESCE(u.avg_energy,  g.avg_energy)  AS energy,
        COALESCE(u.avg_bloating,g.avg_bloating)AS bloating
    FROM pick p
    LEFT JOIN v_user_food_agg   u ON u.user_id = :user_id AND u.food_id = p.food_id
    LEFT JOIN v_global_food_agg g ON g.food_id = p.food_id
),
pairs AS (
    SELECT
        SUM(COALESCE(pa.avg_mood,0))      AS pair_mood_adj,
        SUM(COALESCE(pa.avg_energy,0))    AS pair_energy_adj,
        SUM(COALESCE(pa.avg_bloating,0))  AS pair_bloat_adj
    FROM pick a
    JOIN pick b ON b.food_id > a.food_id
    LEFT JOIN v_user_pair_agg pa
        ON pa.user_id = :user_id AND pa.food_a = a.food_id AND pa.food_b = b.food_id
)
SELECT
    ROUND((SELECT AVG(mood) FROM base)
          + 0.15 * COALESCE((SELECT pair_mood_adj FROM pairs),0), 1) AS pred_mood,
    ROUND((SELECT AVG(energy) FROM base)
          + 0.15 * COALESCE((SELECT pair_energy_adj FROM pairs),0), 1) AS pred_energy,
    ROUND(GREATEST(0,
          (SELECT AVG(bloating) FROM base)
          + 0.15 * COALESCE((SELECT pair_bloat_adj FROM pairs),0)), 1) AS pred_bloating;

-- Personal "eat more of this" recommendations

-- Healthy = higher energy + mood, lower bloating, moderate calories.

-- Good foods for this user (they have eaten at least twice)
SELECT
    f.id,
    f.name,
    f.kcal,
    f.protein_g,
    f.carbs_g,
    f.fat_g,
    u.n_meals,
    ROUND(u.avg_mood,1)     AS avg_mood,
    ROUND(u.avg_energy,1)   AS avg_energy,
    ROUND(u.avg_bloating,1) AS avg_bloating,
    (u.avg_energy - 0.6 * u.avg_bloating) AS health_score
FROM v_user_food_agg u
JOIN foods f ON f.id = u.food_id
WHERE u.user_id = :user_id
  AND u.n_meals >= 2
ORDER BY health_score DESC
LIMIT 20;

-- Foods this user should watch out for (high bloating, lower energy)
SELECT
    f.id,
    f.name,
    u.n_meals,
    ROUND(u.avg_bloating,1) AS avg_bloating,
    ROUND(u.avg_energy,1)   AS avg_energy
FROM v_user_food_agg u
JOIN foods f ON f.id = u.food_id
WHERE u.user_id = :user_id
  AND u.n_meals >= 2
ORDER BY u.avg_bloating DESC, u.avg_energy ASC
LIMIT 20;


--Search foods (for dropdown like "chicken")

-- Case-insensitive search with optional kcal window
SELECT
    id,
    name,
    brand,
    serving_size_g,
    kcal,
    protein_g,
    carbs_g,
    fat_g,
    sugar_g,
    fiber_g
FROM foods
WHERE LOWER(name) LIKE '%' || LOWER(:q) || '%'
  AND (:kmin IS NULL OR kcal >= :kmin)
  AND (:kmax IS NULL OR kcal <= :kmax)
ORDER BY name
LIMIT 50;
