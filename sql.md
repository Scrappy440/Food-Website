# BiteThat! DB App Contract 

Database: SQLite (bitethat.db)
PRAGMA foreign_keys = ON;

Tables :
- users(id,email UNIQUE,display_name,hashed_password,created_at)
- foods(id,name,brand,serving_size_g,kcal,protein_g,carbs_g,fat_g,sugar_g,fiber_g)
- meals(id,user_id,eaten_at,title,notes)
- meal_items(id,meal_id,food_id,quantity_servings)
- feelings(id,meal_id,user_id,recorded_at,mood,energy,bloating,nausea,notes)
Views:
- v_meal_nutrition  (per-meal totals)
- v_food_symptom_avg (pattern averages)

Passwords:
- App MUST hash; DB stores the hash (no plaintext).


```sql

SELECT id FROM users WHERE email=?;


INSERT INTO users(email, display_name, hashed_password) VALUES (?,?,?);

-- optional prefs
INSERT OR IGNORE INTO user_prefs(user_id, region, unit_system) VALUES (?, 'US', 'metric');
