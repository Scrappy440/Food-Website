#!/usr/bin/env python3
"""Import USDA data into the SQLite DB and populate the app's foods table."""

import argparse, os, sqlite3, pandas as pd

KEY_NUTRIENTS = {
    "Energy": "kcal",
    "Protein": "protein_g",
    "Carbohydrate, by difference": "carbs_g",
    "Total lipid (fat)": "fat_g",
    "Sugars, total including NLEA": "sugar_g",
    "Fiber, total dietary": "fiber_g",
}

def read_csv(path, **kw):
    try:
        return pd.read_csv(path, **kw)
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="latin-1", **kw)

def ensure_app_tables(conn: sqlite3.Connection):
    conn.executescript("""
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        brand TEXT,
        serving_size_g REAL,
        kcal REAL DEFAULT 0,
        protein_g REAL DEFAULT 0,
        carbs_g REAL DEFAULT 0,
        fat_g REAL DEFAULT 0,
        sugar_g REAL DEFAULT 0,
        fiber_g REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS usda_food_map (
        app_food_id INTEGER,
        fdc_id INTEGER,
        PRIMARY KEY(app_food_id, fdc_id),
        FOREIGN KEY(app_food_id) REFERENCES foods(id) ON DELETE CASCADE
    );
    """)
    conn.commit()

def upsert_df(conn, df: pd.DataFrame, table: str):
    df.to_sql(table, conn, if_exists="replace", index=False)

def load_usda_reference(conn, usda_dir: str):
    # Load nutrient dictionary
    path = os.path.join(usda_dir, "nutrient.csv")
    if os.path.exists(path):
        nutrients = read_csv(path)
        upsert_df(conn, nutrients, "usda_nutrient")
    else:
        nutrients = None

    # Optional aux tables
    for name in ["wweia_food_category.csv", "survey_fndds_food.csv"]:
        p = os.path.join(usda_dir, name)
        if os.path.exists(p):
            upsert_df(conn, read_csv(p), "usda_" + name.replace(".csv",""))

    return nutrients

def build_nutrient_id_map(nutrients: pd.DataFrame):
    if nutrients is None: 
        return {}
    # Make case-insensitive map from USDA name → id
    m = {}
    for usda_name in KEY_NUTRIENTS.keys():
        row = nutrients[nutrients["name"].str.lower()==usda_name.lower()].head(1)
        if not row.empty:
            m[usda_name] = int(row.iloc[0]["id"])
    return m

def import_from_food_nutrient(conn, usda_dir: str, nutrient_id_map: dict, limit: int|None):
    food_csv = os.path.join(usda_dir, "food.csv")
    fn_csv   = os.path.join(usda_dir, "food_nutrient.csv")
    if not (os.path.exists(food_csv) and os.path.exists(fn_csv)):
        return 0

    foods = read_csv(food_csv, usecols=["fdc_id","description","brand_owner","serving_size","serving_size_unit"])
    if limit:
        foods = foods.head(limit)

    fn = read_csv(fn_csv, usecols=["fdc_id","nutrient_id","amount"])

    # Filter to only key nutrients we care about
    wanted_ids = set(nutrient_id_map.values())
    fn = fn[fn["nutrient_id"].isin(wanted_ids)]

    # Pivot nutrient rows to columns
    piv = fn.pivot_table(index="fdc_id", columns="nutrient_id", values="amount", aggfunc="mean").reset_index()

    merged = foods.merge(piv, on="fdc_id", how="left")
    merged.rename(columns={
        nutrient_id_map.get("Energy", -1): "kcal",
        nutrient_id_map.get("Protein", -2): "protein_g",
        nutrient_id_map.get("Carbohydrate, by difference", -3): "carbs_g",
        nutrient_id_map.get("Total lipid (fat)", -4): "fat_g",
        nutrient_id_map.get("Sugars, total including NLEA", -5): "sugar_g",
        nutrient_id_map.get("Fiber, total dietary", -6): "fiber_g",
    }, inplace=True)

    # Normalize serving size → grams when possible
    merged["serving_size_g"] = merged.apply(
        lambda r: r["serving_size"] if str(r.get("serving_size_unit","")).lower() in ["g","gram","grams"] else None, axis=1
    )

    # Insert into app foods & mapping
    cur = conn.cursor()
    inserted = 0
    for _, r in merged.iterrows():
        name = str(r["description"])
        brand = None if pd.isna(r.get("brand_owner")) else str(r["brand_owner"])
        vals = (name, brand, r.get("serving_size_g"), r.get("kcal",0), r.get("protein_g",0),
                r.get("carbs_g",0), r.get("fat_g",0), r.get("sugar_g",0), r.get("fiber_g",0))
        cur.execute("""INSERT INTO foods(name, brand, serving_size_g, kcal, protein_g, carbs_g, fat_g, sugar_g, fiber_g)
                      VALUES(?,?,?,?,?,?,?,?,?)""", vals)
        app_food_id = cur.lastrowid
        cur.execute("INSERT OR IGNORE INTO usda_food_map(app_food_id, fdc_id) VALUES(?,?)", (app_food_id, int(r["fdc_id"])))
        inserted += 1

    conn.commit()
    return inserted

def import_from_sr_legacy(conn, usda_dir: str, nutrient_id_map: dict, limit: int|None):
    # SR Legacy pair: sr_legacy_food.csv and sr_legacy_food_nutrient.csv
    food_csv = os.path.join(usda_dir, "sr_legacy_food.csv")
    fn_csv   = os.path.join(usda_dir, "sr_legacy_food_nutrient.csv")
    if not (os.path.exists(food_csv) and os.path.exists(fn_csv)):
        return 0

    foods = read_csv(food_csv)  # typically has fdc_id & NDB_number
    if limit:
        foods = foods.head(limit)

    fn = read_csv(fn_csv)  # must include fdc_id, nutrient_id, amount
    wanted_ids = set(nutrient_id_map.values())
    fn = fn[fn["nutrient_id"].isin(wanted_ids)]
    piv = fn.pivot_table(index="fdc_id", columns="nutrient_id", values="amount", aggfunc="mean").reset_index()

    merged = foods.merge(piv, on="fdc_id", how="left")
    merged.rename(columns={
        nutrient_id_map.get("Energy", -1): "kcal",
        nutrient_id_map.get("Protein", -2): "protein_g",
        nutrient_id_map.get("Carbohydrate, by difference", -3): "carbs_g",
        nutrient_id_map.get("Total lipid (fat)", -4): "fat_g",
        nutrient_id_map.get("Sugars, total including NLEA", -5): "sugar_g",
        nutrient_id_map.get("Fiber, total dietary", -6): "fiber_g",
    }, inplace=True)

    cur = conn.cursor()
    inserted = 0
    for _, r in merged.iterrows():
        name = f"SR Legacy {{int(r['fdc_id'])}}"
        vals = (name, None, None, r.get("kcal",0), r.get("protein_g",0),
                r.get("carbs_g",0), r.get("fat_g",0), r.get("sugar_g",0), r.get("fiber_g",0))
        cur.execute("""INSERT INTO foods(name, brand, serving_size_g, kcal, protein_g, carbs_g, fat_g, sugar_g, fiber_g)
                      VALUES(?,?,?,?,?,?,?,?,?)""", vals)
        app_food_id = cur.lastrowid
        cur.execute("INSERT OR IGNORE INTO usda_food_map(app_food_id, fdc_id) VALUES(?,?)", (app_food_id, int(r["fdc_id"])))
        inserted += 1
    conn.commit()
    return inserted

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="bitethat.db")
    ap.add_argument("--usda-dir", required=True)
    ap.add_argument("--limit", type=int, default=None, help="import at most N foods for quick starts")
    args = ap.parse_args()

    conn = sqlite3.connect(args.db)
    ensure_app_tables(conn)
    nutrients = load_usda_reference(conn, args.usda_dir)
    nutrient_id_map = build_nutrient_id_map(nutrients)

    total = 0
    total += import_from_food_nutrient(conn, args.usda_dir, nutrient_id_map, args.limit)
    total += import_from_sr_legacy(conn, args.usda_dir, nutrient_id_map, args.limit)

    print(f"Imported {{total}} foods into app 'foods' table.")

if __name__ == "__main__":
    main()
