
-- Users and auth (store hashed_passwords)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    hashed_password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

-- A meal,container logged by a user at a time
CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    eaten_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    title TEXT,
    notes TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Mapping foods into a meal with quantities
CREATE TABLE IF NOT EXISTS meal_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id INTEGER NOT NULL,
    food_id INTEGER NOT NULL,
    quantity_servings REAL NOT NULL DEFAULT 1.0, 
    FOREIGN KEY(meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    FOREIGN KEY(food_id) REFERENCES foods(id) ON DELETE RESTRICT
);

-- Feelings/symptoms reported by user after a meal (0=none, 10=severe)
CREATE TABLE IF NOT EXISTS feelings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mood INTEGER CHECK(mood BETWEEN 0 AND 10),         
    energy INTEGER CHECK(energy BETWEEN 0 AND 10),     
    bloating INTEGER CHECK(bloating BETWEEN 0 AND 10), 
    nausea INTEGER CHECK(nausea BETWEEN 0 AND 10),     
    notes TEXT,
    FOREIGN KEY(meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Preferences & units
CREATE TABLE IF NOT EXISTS user_prefs (
    user_id INTEGER PRIMARY KEY,
    region TEXT DEFAULT 'US',
    unit_system TEXT DEFAULT 'metric', 
    dietary_tags TEXT, 
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- per-meal totals
CREATE VIEW IF NOT EXISTS v_meal_nutrition AS
SELECT
    m.id AS meal_id,
    m.user_id,
    m.eaten_at,
    SUM(fi.kcal * mi.quantity_servings) AS kcal,
    SUM(fi.protein_g * mi.quantity_servings) AS protein_g,
    SUM(fi.carbs_g * mi.quantity_servings) AS carbs_g,
    SUM(fi.fat_g * mi.quantity_servings) AS fat_g,
    SUM(fi.sugar_g * mi.quantity_servings) AS sugar_g,
    SUM(fi.fiber_g * mi.quantity_servings) AS fiber_g
FROM meals m
JOIN meal_items mi ON mi.meal_id = m.id
JOIN foods fi ON fi.id = mi.food_id
GROUP BY m.id;

CREATE VIEW IF NOT EXISTS v_food_symptom_avg AS
SELECT
    f.id AS food_id,
    f.name,
    AVG(CASE WHEN fl.bloating IS NOT NULL THEN fl.bloating END) AS avg_bloating,
    AVG(CASE WHEN fl.nausea IS NOT NULL THEN fl.nausea END) AS avg_nausea,
    AVG(CASE WHEN fl.energy IS NOT NULL THEN fl.energy END) AS avg_energy,
    AVG(CASE WHEN fl.mood IS NOT NULL THEN fl.mood END) AS avg_mood,
    COUNT(DISTINCT fl.id) AS n_reports
FROM foods f
JOIN meal_items mi ON mi.food_id = f.id
JOIN meals m ON m.id = mi.meal_id
JOIN feelings fl ON fl.meal_id = m.id
GROUP BY f.id;


CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_meals_user ON meals(user_id, eaten_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_meal ON meal_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_items_food ON meal_items(food_id);
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
