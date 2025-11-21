"""Helper functions for:
 computing meal nutrition from user-picked foods (food_id + grams),
 predicting how the user will feel after a planned meal,
 recommending foods to eat more of / to avoid,
searching foods.
"""

import os
import sqlite3
from typing import List, Tuple, Optional, Dict, Any



DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bitethat.db")


def open_db(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def _values_clause(rows: List[Tuple[Any, ...]]) -> Tuple[str, List[Any]]:
    
    if not rows:
        raise ValueError("rows must not be empty")

    placeholders_per_row = "(" + ",".join("?" for _ in rows[0]) + ")"
    clause = ",".join([placeholders_per_row] * len(rows))
    params: List[Any] = []
    for r in rows:
        params.extend(r)
    return clause, params


# NUTRITION TOTALS FOR A PLANNED MEAL


def compute_meal_totals(
    conn: sqlite3.Connection,
    picks: List[Tuple[int, float]],
) -> Dict[str, float]:
    """
    picks: list of (food_id, grams)

    Returns a dict with total_kcal, total_protein_g, total_carbs_g,
    total_fat_g, total_sugar_g, total_fiber_g.
    """
    if not picks:
        return {
            "total_kcal": 0.0,
            "total_protein_g": 0.0,
            "total_carbs_g": 0.0,
            "total_fat_g": 0.0,
            "total_sugar_g": 0.0,
            "total_fiber_g": 0.0,
        }

    values_clause, params = _values_clause(picks)

    sql = f"""
    WITH pick(food_id, grams) AS (
        VALUES {values_clause}
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
    """

    row = conn.execute(sql, params).fetchone()
    return {k: float(row[k] or 0.0) for k in row.keys()}



#PREDICT HOW THE USER WILL FEEL AFTER A PLANNED MEAL
def predict_meal_feelings(
    conn: sqlite3.Connection,
    user_id: int,
    food_ids: List[int],
) -> Dict[str, float]:
   
    if not food_ids:
        return {"pred_mood": 0.0, "pred_energy": 0.0, "pred_bloating": 0.0}

    # Build VALUES (?,?....) for pick(food_id)
    picks = [(fid,) for fid in food_ids]
    values_clause, params = _values_clause(picks)
    params = [user_id] + params  # :user_id first

    sql = f"""
    WITH pick(food_id) AS (
        VALUES {values_clause}
    ),
    base AS (
        SELECT
            p.food_id,
            COALESCE(u.avg_mood,    g.avg_mood)     AS mood,
            COALESCE(u.avg_energy,  g.avg_energy)   AS energy,
            COALESCE(u.avg_bloating,g.avg_bloating) AS bloating
        FROM pick p
        LEFT JOIN v_user_food_agg   u
               ON u.user_id = ? AND u.food_id = p.food_id
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
          ON pa.user_id = ?
         AND pa.food_a = a.food_id
         AND pa.food_b = b.food_id
    )
    SELECT
        ROUND((SELECT AVG(mood) FROM base)
              + 0.15 * COALESCE((SELECT pair_mood_adj FROM pairs),0), 1) AS pred_mood,
        ROUND((SELECT AVG(energy) FROM base)
              + 0.15 * COALESCE((SELECT pair_energy_adj FROM pairs),0), 1) AS pred_energy,
        ROUND(
          MAX(0,
            (SELECT AVG(bloating) FROM base)
            + 0.15 * COALESCE((SELECT pair_bloat_adj FROM pairs),0)
          ), 1
        ) AS pred_bloating;
    """

    # user_id used twice in query
    params = [user_id] + params 
    flat_food_ids: List[Any] = []
    for fid in food_ids:
        flat_food_ids.append(fid)
    params_for_query: List[Any] = [user_id] + flat_food_ids + [user_id]

    row = conn.execute(sql, params_for_query).fetchone()
    return {
        "pred_mood": float(row["pred_mood"] or 0.0),
        "pred_energy": float(row["pred_energy"] or 0.0),
        "pred_bloating": float(row["pred_bloating"] or 0.0),
    }


#PERSONAL RECOMMENDATIONS
def get_user_good_foods(
    conn: sqlite3.Connection,
    user_id: int,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Foods that usually make this user feel good:
    high energy/mood, lower bloating.
    """
    sql = """
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
    WHERE u.user_id = ?
      AND u.n_meals >= 2
    ORDER BY health_score DESC
    LIMIT ?;
    """
    rows = conn.execute(sql, (user_id, limit)).fetchall()
    return [dict(r) for r in rows]


def get_user_avoid_foods(
    conn: sqlite3.Connection,
    user_id: int,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Foods that usually cause higher bloating / lower energy for this user.
    """
    sql = """
    SELECT
        f.id,
        f.name,
        u.n_meals,
        ROUND(u.avg_bloating,1) AS avg_bloating,
        ROUND(u.avg_energy,1)   AS avg_energy
    FROM v_user_food_agg u
    JOIN foods f ON f.id = u.food_id
    WHERE u.user_id = ?
      AND u.n_meals >= 2
    ORDER BY u.avg_bloating DESC, u.avg_energy ASC
    LIMIT ?;
    """
    rows = conn.execute(sql, (user_id, limit)).fetchall()
    return [dict(r) for r in rows]



# FOOD SEARCH (for dropdown)
def search_foods(
    conn: sqlite3.Connection,
    query: str,
    kcal_min: Optional[float] = None,
    kcal_max: Optional[float] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
   
    sql = """
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
    WHERE LOWER(name) LIKE '%' || LOWER(?) || '%'
      AND (? IS NULL OR kcal >= ?)
      AND (? IS NULL OR kcal <= ?)
    ORDER BY name
    LIMIT ?;
    """
    rows = conn.execute(
        sql,
        (
            query,
            kcal_min, kcal_min,
            kcal_max, kcal_max,
            limit,
        ),
    ).fetchall()
    return [dict(r) for r in rows]

