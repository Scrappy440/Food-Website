#!/usr/bin/env python3
"""Quick debug script to check what's in the database"""
import sqlite3

conn = sqlite3.connect('bitethat.db')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=== FOODS TABLE ===")
foods = cur.execute("SELECT id, name, kcal, serving_size_g FROM foods ORDER BY id DESC LIMIT 5").fetchall()
for f in foods:
    print(f"  ID {f['id']}: {f['name']} - {f['kcal']} kcal (serving: {f['serving_size_g']}g)")

print("\n=== MEAL ITEMS ===")
items = cur.execute("""
    SELECT mi.id, mi.meal_id, mi.quantity_servings, f.name, f.kcal
    FROM meal_items mi
    JOIN foods f ON f.id = mi.food_id
    ORDER BY mi.id DESC LIMIT 5
""").fetchall()
for i in items:
    print(f"  MealItem {i['id']}: {i['name']} - qty={i['quantity_servings']} * {i['kcal']}kcal = {i['quantity_servings'] * i['kcal']}")

print("\n=== MEAL NUTRITION VIEW ===")
meals = cur.execute("""
    SELECT meal_id, kcal, protein_g, carbs_g, fat_g
    FROM v_meal_nutrition
    ORDER BY meal_id DESC LIMIT 5
""").fetchall()
for m in meals:
    print(f"  Meal {m['meal_id']}: {m['kcal']} kcal, {m['protein_g']}g protein, {m['carbs_g']}g carbs, {m['fat_g']}g fat")

conn.close()
