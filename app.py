#11/12 Push

# Notes: Autocomplete feature on Logging Meals page: using entire USDA database
# Database stored in SQL pull wtih bitethat.db
#https://www.geeksforgeeks.org/python/use-jsonify-instead-of-json-dumps-in-flask/
# ' ' 

#Flask the GOAT with Jsonify() 
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import sqlite3, os, datetime, json, urllib.request, urllib.error
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
load_dotenv()


app = Flask(__name__)
app.secret_key = "keyHere"
DB_PATH = os.path.abspath("bitethat.db")

# 11/8
#https://pytutorial.com/python-sqlite3-database-connection-guide/
# "use conn to connect to SQLite 3" okay 

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

#home / index page both good

@app.route("/")
def index():
    return render_template("index.html")
#same as before
@app.route("/home")
def home():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    user_name = session.get('user_name', 'User')
    return render_template('home.html', user_name=user_name)

@app.route("/login_page")
def login_page():
    return render_template("Login.html")

@app.route("/login", methods=['POST'])
def login():
    email = request.form.get('email')
    password = request.form.get('password')

    conn = get_db()
    row = conn.execute("SELECT id, email, display_name, hashed_password FROM users WHERE email=?", (email,)).fetchone()
    conn.close()

    if row and check_password_hash(row['hashed_password'], password):
        session['user'] = email
        session['user_name'] = row['display_name']
        flash('Login successful!', 'success')
        return redirect(url_for('home'))
    else:
        return render_template("Login.html", error="Invalid email or password. Please try again.")

@app.route("/signup", methods=['POST'])
def signup():
    full_name = request.form.get('full-name')
    email = request.form.get('email')
    username = request.form.get('username')
    password = request.form.get('password')

    conn = get_db()
    exists = conn.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone()
    if exists:
        conn.close()
        flash("User already exists!", 'error')
        return redirect(url_for('index'))

    pw_hash = generate_password_hash(password)
    conn.execute("INSERT INTO users(email, display_name, hashed_password) VALUES (?, ?, ?)", (email, full_name, pw_hash))
    conn.commit()
    conn.close()

    flash('Account created successfully! Please log in.', 'success')
    return redirect(url_for('login_page'))

@app.route("/logout")
def logout():
    session.pop('user', None)
    flash('Logged out successfully!', 'info')
    return redirect(url_for('index'))

# ///////////////////////////////////
# logMeal.html w/ autocomplete from db

@app.route("/logmeal", methods=['GET', 'POST'])
def log_meal():
    # GET - show page with meals grouped by category
    if request.method == 'GET':
        if 'user' not in session:
            return redirect(url_for('login_page'))
        
        conn = get_db()
        cur = conn.cursor()
        user_email = session.get('user')
        user_row = cur.execute("SELECT id FROM users WHERE email = ?", (user_email,)).fetchone()
        
        meals_data = []
        def _parse_dt(val):
            if not val:
                return None
            if isinstance(val, datetime.datetime):
                return val
            s = str(val)
            try:
                return datetime.datetime.fromisoformat(s)
            except Exception:
                pass
            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
                try:
                    return datetime.datetime.strptime(s, fmt)
                except Exception:
                    continue
            return s
        
        if user_row:
            user_id = user_row['id']
            meal_rows = cur.execute("SELECT id, eaten_at, title FROM meals WHERE user_id = ? ORDER BY eaten_at DESC LIMIT 50", (user_id,)).fetchall()
            for m in meal_rows:
                items = []
                item_rows = cur.execute("SELECT mi.id, mi.quantity_servings, f.name, f.kcal, f.protein_g, f.carbs_g, f.fat_g FROM meal_items mi JOIN foods f ON f.id = mi.food_id WHERE mi.meal_id = ?", (m['id'],)).fetchall()
                for it in item_rows:
                    items.append({
                        'id': it['id'],
                        'ingredient_name': it['name'],
                        'quantity': it['quantity_servings'],
                        'calories': it['kcal'],
                        'protein': it['protein_g'],
                        'carbs': it['carbs_g'],
                        'fat': it['fat_g'],
                    })
                meals_data.append({
                    'id': m['id'],
                    'meal_type': m['title'] or '',
                    'meal_date': _parse_dt(m['eaten_at']),
                    'items': items,
                })
        
        # group meals by type
        meals_by_type = {'breakfast': [], 'lunch': [], 'dinner': [], 'snack': []}
        for mm in meals_data:
            key = (mm.get('meal_type') or '').lower()
            if key in meals_by_type:
                meals_by_type[key].append(mm)
            else:
                meals_by_type['snack'].append(mm)
        
        # compute today's totals
        totals = {'kcal': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
        if user_row:
            user_id = user_row['id']
            try:
                r = cur.execute("SELECT SUM(kcal) AS kcal, SUM(protein_g) AS protein, SUM(carbs_g) AS carbs, SUM(fat_g) AS fat FROM v_meal_nutrition WHERE user_id = ? AND date(eaten_at) = date('now','localtime')", (user_id,)).fetchone()
                if r:
                    totals['kcal'] = r['kcal'] or 0
                    totals['protein'] = r['protein'] or 0
                    totals['carbs'] = r['carbs'] or 0
                    totals['fat'] = r['fat'] or 0
            except Exception:
                pass
        
        return render_template('logMeal.html', meals_by_type=meals_by_type, totals=totals)
    
    # POST - save meal (AJAX)
    if 'user' not in session:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify(success=False, error='Not authenticated'), 401
        return redirect(url_for('login_page'))
    
    meal_type = request.form.get('meal_type') or 'meal'
    meal_date = request.form.get('meal_date') or datetime.datetime.utcnow().isoformat()
    
    ingredient_names = request.form.getlist('ingredient_name[]')
    quantities = request.form.getlist('quantity[]')
    calories_list = request.form.getlist('calories[]')
    protein_list = request.form.getlist('protein[]')
    carbs_list = request.form.getlist('carbs[]')
    fat_list = request.form.getlist('fat[]')
    
    conn = get_db()
    cur = conn.cursor()
    try:
        user_email = session.get('user')
        user_row = cur.execute("SELECT id FROM users WHERE email = ?", (user_email,)).fetchone()
        if not user_row:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify(success=False, error='User not found'), 400
            flash('User not found', 'error')
            return redirect(url_for('login_page'))
        user_id = user_row['id']
        
        cur.execute("INSERT INTO meals (user_id, eaten_at, title) VALUES (?, ?, ?)", (user_id, meal_date, meal_type))
        meal_id = cur.lastrowid
        
        saved_items = []
        for i, name in enumerate(ingredient_names):
            if not name or name.strip() == '':
                continue
            name = name.strip()
            food_row = cur.execute("SELECT id FROM foods WHERE name = ? LIMIT 1", (name,)).fetchone()
            kcal = float(calories_list[i]) if i < len(calories_list) and calories_list[i] else 0.0
            prot = float(protein_list[i]) if i < len(protein_list) and protein_list[i] else 0.0
            carbs = float(carbs_list[i]) if i < len(carbs_list) and carbs_list[i] else 0.0
            fat = float(fat_list[i]) if i < len(fat_list) and fat_list[i] else 0.0
            
            if food_row:
                food_id = food_row['id']
            else:
                cur.execute("INSERT INTO foods (name, serving_size_g, kcal, protein_g, carbs_g, fat_g) VALUES (?, NULL, ?, ?, ?, ?)", (name, kcal, prot, carbs, fat))
                food_id = cur.lastrowid
            
            q_raw = quantities[i] if i < len(quantities) else ''
            try:
                q = float(q_raw)
            except Exception:
                try:
                    import re
                    m = re.match(r"([0-9]+\.?[0-9]*)", str(q_raw).strip())
                    q = float(m.group(1)) if m else 1.0
                except Exception:
                    q = 1.0
            
            cur.execute("INSERT INTO meal_items (meal_id, food_id, quantity_servings) VALUES (?, ?, ?)", (meal_id, food_id, q))
            
            saved_items.append({
                'ingredient_name': name,
                'quantity': q_raw or '',
                'calories': kcal,
                'protein': prot,
                'carbs': carbs,
                'fat': fat,
            })
        
        conn.commit()
        
        # compute per-meal totals
        meal_totals = {'kcal': 0.0, 'protein': 0.0, 'carbs': 0.0, 'fat': 0.0}
        for it in saved_items:
            try:
                qnum = float(it.get('quantity')) if it.get('quantity') not in (None, '') else 1.0
            except Exception:
                qnum = 1.0
            meal_totals['kcal'] += (float(it.get('calories') or 0.0)) * qnum
            meal_totals['protein'] += (float(it.get('protein') or 0.0)) * qnum
            meal_totals['carbs'] += (float(it.get('carbs') or 0.0)) * qnum
            meal_totals['fat'] += (float(it.get('fat') or 0.0)) * qnum
        
        meal_obj = {
            'id': meal_id,
            'meal_type': meal_type,
            'meal_date': meal_date.split('T')[0] if 'T' in meal_date else meal_date,
            'items': saved_items,
            'totals': meal_totals,
        }
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify(success=True, meal=meal_obj)
        
        flash('Meal added successfully!', 'success')
        return redirect(url_for('log_meal'))
    except Exception as e:
        conn.rollback()
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify(success=False, error=str(e)), 500
        flash(f'Error saving meal: {e}', 'error')
        return redirect(url_for('log_meal'))

@app.route("/autocomplete")
def autocomplete():
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify([])
    
    conn = get_db()  #COnect database
 
#If i want the first non Null then
#https://www.w3schools.com/SQL/func_sqlserver_coalesce.asp
    cur = conn.cursor() 
    cur.execute("""SELECT id, name, COALESCE(brand, '') AS brand
        FROM foods
        WHERE name LIKE ? OR brand LIKE ?
        LIMIT 10
    """, (f"%{query}%", f"%{query}%"))
    results = [
        {"id": row["id"], "name": row["name"], "brand": row["brand"]}
        for row in cur.fetchall()
    ]
    # Optionally query USDA FoodData Central API if API key is configured
    api_key = os.environ.get('USDA_FDC_API_KEY')
    if api_key:
        try:
            # POST search (pageSize 10)
            url = f"https://api.nal.usda.gov/fdc/v1/foods/search?api_key={api_key}"
            payload = json.dumps({"query": query, "pageSize": 10}).encode('utf-8')
            req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method='POST')
            with urllib.request.urlopen(req, timeout=10) as resp:
                body = resp.read().decode('utf-8')
                data = json.loads(body)
                for f in data.get('foods', []):
                    # create an id string to identify USDA results
                    fid = f.get('fdcId')
                    name = f.get('description') or f.get('lowercaseDescription') or ''
                    brand = f.get('brandOwner') or ''
                    results.append({"id": f"usda:{fid}", "name": name, "brand": brand, "fdc_id": fid})
        except Exception:
            # If USDA API fails, just ignore and return local results
            pass

    conn.close()
    return jsonify(results)


@app.route('/food/usda/<int:fdc_id>')
def get_food_usda(fdc_id: int):
    """Fetch USDA food details from FoodData Central (requires USDA_FDC_API_KEY env var).
    Returns a JSON object with mapped nutrients where possible.
    """
    api_key = os.environ.get('USDA_FDC_API_KEY')
    if not api_key:
        return jsonify({"error": "USDA API key not configured"}), 400
    try:
        url = f"https://api.nal.usda.gov/fdc/v1/food/{fdc_id}?api_key={api_key}"
        req = urllib.request.Request(url, method='GET')
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode('utf-8')
            data = json.loads(body)

        # DEBUG: Print the raw USDA API response to the server log
        print("\n--- USDA API RAW RESPONSE ---\n", body[:2000], "\n--- END USDA API RAW RESPONSE ---\n")

        # Map common nutrients by nutrient number where available (USDA: 208=kcal, 203=protein, 205=carbs, 204=fat)
        nutrient_map = {208: 'kcal', 203: 'protein_g', 205: 'carbs_g', 204: 'fat_g'}
        mapped = {'name': data.get('description'), 'brand': data.get('brandOwner')}
        for n in data.get('foodNutrients', []) or []:
            num = n.get('nutrient', {}).get('number') if isinstance(n.get('nutrient'), dict) else n.get('nutrientNumber')
            try:
                num = int(num)
            except Exception:
                num = None
            val = n.get('amount') or n.get('value')
            if num and val is not None and num in nutrient_map:
                mapped[nutrient_map[num]] = float(val)

        for k in ('kcal', 'protein_g', 'carbs_g', 'fat_g'):
            try:
                mapped[k] = float(mapped.get(k, 0) or 0)
            except Exception:
                mapped[k] = 0.0

        return jsonify(mapped)
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode('utf-8')
            return jsonify({'error': 'USDA API error', 'details': json.loads(body)}), 500
        except Exception:
            return jsonify({'error': 'USDA API HTTP error'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/food/<int:food_id>")
def get_food(food_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT name, brand, serving_size_g, kcal, protein_g, carbs_g, fat_g
        FROM foods WHERE id = ?
    """, (food_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Food not found"}), 404
    # Always return all fields, defaulting to 0 if missing
    d = dict(row)
    for k in ('kcal', 'protein_g', 'carbs_g', 'fat_g'):
        try:
            d[k] = float(d.get(k, 0) or 0)
        except Exception:
            d[k] = 0.0
    return jsonify(d)

# MEAL analysis 

@app.route("/meal_analysis")
def meal_analysis():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    return render_template('mealAnalysis.html')

# Happyness State
@app.route("/log_physical_state")
def log_physical_state():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    return render_template('logPhysicalState.html')

@app.route('/meal/<int:meal_id>', methods=['GET'])
def get_meal_json(meal_id):
    if 'user' not in session:
        return jsonify(success=False, error='Not authenticated'), 401
    conn = get_db()
    cur = conn.cursor()
    user_email = session.get('user')
    user_row = cur.execute("SELECT id FROM users WHERE email = ?", (user_email,)).fetchone()
    if not user_row:
        return jsonify(success=False, error='User not found'), 400
    user_id = user_row['id']
    
    meal = cur.execute("SELECT id, user_id, eaten_at, title FROM meals WHERE id = ?", (meal_id,)).fetchone()
    if not meal or meal['user_id'] != user_id:
        return jsonify(success=False, error='Meal not found or access denied'), 404
    
    items = []
    rows = cur.execute("SELECT mi.id, mi.quantity_servings, f.name, f.kcal, f.protein_g, f.carbs_g, f.fat_g FROM meal_items mi JOIN foods f ON f.id = mi.food_id WHERE mi.meal_id = ?", (meal_id,)).fetchall()
    for it in rows:
        items.append({
            'id': it['id'],
            'ingredient_name': it['name'],
            'quantity': it['quantity_servings'],
            'calories': it['kcal'],
            'protein': it['protein_g'],
            'carbs': it['carbs_g'],
            'fat': it['fat_g'],
        })
    
    return jsonify(success=True, meal={
        'id': meal['id'],
        'meal_type': meal['title'],
        'meal_date': meal['eaten_at'],
        'items': items,
    })

@app.route('/meal/<int:meal_id>/update', methods=['POST'])
def update_meal(meal_id):
    if 'user' not in session:
        return jsonify(success=False, error='Not authenticated'), 401
    conn = get_db()
    cur = conn.cursor()
    user_email = session.get('user')
    user_row = cur.execute("SELECT id FROM users WHERE email = ?", (user_email,)).fetchone()
    if not user_row:
        return jsonify(success=False, error='User not found'), 400
    user_id = user_row['id']
    
    meal = cur.execute("SELECT id, user_id FROM meals WHERE id = ?", (meal_id,)).fetchone()
    if not meal or meal['user_id'] != user_id:
        return jsonify(success=False, error='Meal not found or access denied'), 404
    
    meal_type = request.form.get('meal_type') or ''
    meal_date = request.form.get('meal_date') or None
    
    ingredient_names = request.form.getlist('ingredient_name[]')
    quantities = request.form.getlist('quantity[]')
    calories_list = request.form.getlist('calories[]')
    protein_list = request.form.getlist('protein[]')
    carbs_list = request.form.getlist('carbs[]')
    fat_list = request.form.getlist('fat[]')
    
    try:
        if meal_type or meal_date:
            cur.execute("UPDATE meals SET title = COALESCE(?, title), eaten_at = COALESCE(?, eaten_at) WHERE id = ?", (meal_type or None, meal_date or None, meal_id))
        
        cur.execute("DELETE FROM meal_items WHERE meal_id = ?", (meal_id,))
        
        saved_items = []
        for i, name in enumerate(ingredient_names):
            if not name or name.strip() == '':
                continue
            name = name.strip()
            food_row = cur.execute("SELECT id FROM foods WHERE name = ? LIMIT 1", (name,)).fetchone()
            kcal = float(calories_list[i]) if i < len(calories_list) and calories_list[i] else 0.0
            prot = float(protein_list[i]) if i < len(protein_list) and protein_list[i] else 0.0
            carbs = float(carbs_list[i]) if i < len(carbs_list) and carbs_list[i] else 0.0
            fat = float(fat_list[i]) if i < len(fat_list) and fat_list[i] else 0.0
            
            if food_row:
                food_id = food_row['id']
            else:
                cur.execute("INSERT INTO foods (name, serving_size_g, kcal, protein_g, carbs_g, fat_g) VALUES (?, NULL, ?, ?, ?, ?)", (name, kcal, prot, carbs, fat))
                food_id = cur.lastrowid
            
            q_raw = quantities[i] if i < len(quantities) else ''
            try:
                q = float(q_raw)
            except Exception:
                try:
                    import re
                    m = re.match(r"([0-9]+\.?[0-9]*)", str(q_raw).strip())
                    q = float(m.group(1)) if m else 1.0
                except Exception:
                    q = 1.0
            
            cur.execute("INSERT INTO meal_items (meal_id, food_id, quantity_servings) VALUES (?, ?, ?)", (meal_id, food_id, q))
            saved_items.append({'ingredient_name': name, 'quantity': q_raw or '', 'calories': kcal, 'protein': prot, 'carbs': carbs, 'fat': fat})
        
        conn.commit()
        
        # compute totals
        meal_totals = {'kcal': 0.0, 'protein': 0.0, 'carbs': 0.0, 'fat': 0.0}
        for it in saved_items:
            try:
                qnum = float(it.get('quantity')) if it.get('quantity') not in (None, '') else 1.0
            except Exception:
                qnum = 1.0
            meal_totals['kcal'] += (float(it.get('calories') or 0.0)) * qnum
            meal_totals['protein'] += (float(it.get('protein') or 0.0)) * qnum
            meal_totals['carbs'] += (float(it.get('carbs') or 0.0)) * qnum
            meal_totals['fat'] += (float(it.get('fat') or 0.0)) * qnum
        
        return jsonify(success=True, meal={'id': meal_id, 'meal_type': meal_type, 'meal_date': meal_date, 'items': saved_items, 'totals': meal_totals})
    except Exception as e:
        conn.rollback()
        return jsonify(success=False, error=str(e)), 500

@app.route('/meal/<int:meal_id>/delete', methods=['POST'])
def delete_meal(meal_id):
    if 'user' not in session:
        return jsonify(success=False, error='Not authenticated'), 401
    conn = get_db()
    cur = conn.cursor()
    user_email = session.get('user')
    user_row = cur.execute("SELECT id FROM users WHERE email = ?", (user_email,)).fetchone()
    if not user_row:
        return jsonify(success=False, error='User not found'), 400
    user_id = user_row['id']
    
    meal = cur.execute("SELECT id, user_id FROM meals WHERE id = ?", (meal_id,)).fetchone()
    if not meal or meal['user_id'] != user_id:
        return jsonify(success=False, error='Meal not found or access denied'), 404
    
    try:
        cur.execute("DELETE FROM meals WHERE id = ?", (meal_id,))
        conn.commit()
        return jsonify(success=True)
    except Exception as e:
        conn.rollback()
        return jsonify(success=False, error=str(e)), 500

if __name__ == "__main__":
    app.run(debug=True, port=5001)
