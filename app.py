#11/12 Push

# Notes: Autocomplete feature on Logging Meals page: using entire USDA database
# Database stored in SQL pull wtih bitethat.db
#https://www.geeksforgeeks.org/python/use-jsonify-instead-of-json-dumps-in-flask/
# ' ' 

#Flask the GOAT with Jsonify() 
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import sqlite3, os
from werkzeug.security import generate_password_hash, check_password_hash

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
    if 'user' not in session:
        return redirect(url_for('login_page'))

    if request.method == 'POST':
        # (Optional) Save meal data to DB
        meal_type = request.form.get('meal-type')
        meal_date = request.form.get('meal-date')

        ingredient_names = request.form.getlist('ingredient_name[]')
        quantities = request.form.getlist('quantity[]')
        calories_list = request.form.getlist('calories[]')
        protein_list = request.form.getlist('protein[]')
        carbs_list = request.form.getlist('carbs[]')
        fat_list = request.form.getlist('fat[]')

        # !!!!!!!!!!!!!!!!!!!!  11/9
        # HERE  Saving correctly? USDA still not pulling :( 

        flash('Meal added successfully!', 'success')  #not showing bug
        return redirect(url_for('log_meal'))

    return render_template('logMeal.html')

@app.route("/autocomplete")
def autocomplete():
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify([])
    
    conn = get_db()  #COnect database
    #Notes: I think Coca cola should appear as CC and not soda. 
    # Kellog instead of cereal. Or like Oreos. Instead of "cookie" because 
    # the db has that info already

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
    conn.close()
    return jsonify(results)

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
    return jsonify(dict(row))

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

if __name__ == "__main__":
    app.run(debug=True, port=5001)
