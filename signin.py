from flask import Flask, render_template, request, redirect, url_for, flash, session
#No pygame, flask moving forward, easiest to communicate with SQL such as PostgreSQL
#flask version 25.1.1, used cmd: pip install flask
# 10/19 added "sessions" above
import os, sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
app = Flask(__name__)
app.secret_key = "keyHere" 

DB_PATH = os.path.abspath("bitethat.db")
def get_db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON;")
    return con

#10/15
# Fake user database for demo, tie in real database later
#

#10/25 further testing, no users breaks site
# removed admin account 
users = {
}

# Connect with flask: 
@app.route("/")
def index():
    print("Index route accessed")  # Debug
    return render_template("index.html")

@app.route("/login_page")
def login_page():
    return render_template("Login.html")

@app.route("/login", methods=['POST'])
def login():
    email = request.form.get('email')
    password = request.form.get('password')

    con = get_db()
    row = con.execute("SELECT id, email, display_name, hashed_password FROM users WHERE email=?", (email,)).fetchone()
    con.close()

    if row and check_password_hash(row['hashed_password'], password):
        session['user'] = email
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
    
    con = get_db()
    exists = con.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone()
    if exists:
        con.close()
        flash("User already exists!", 'error')
        return redirect(url_for('index'))
    
    pw_hash = generate_password_hash(password)
    con.execute("INSERT INTO users(email, display_name, hashed_password) VALUES (?,?,?)", (email, full_name, pw_hash))
    con.commit()
    con.close()

    flash('Account created successfully! Please log in.', 'success')
    return redirect(url_for('login_page'))

@app.route('/home')
def home():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    return render_template('home.html', user=session['user'])

@app.route('/log_meal', methods=['GET', 'POST'])
def log_meal():
    if request.method == 'POST':
        #  save the meal log to the database
        meal_type = request.form.get('meal-type')
        meal_date = request.form.get('meal-date')

        ingredient_names = request.form.getlist('ingredient-name[]')
        quantities = request.form.getlist('quantity[]')
        calories_list = request.form.getlist('calories[]')
        protein_list = request.form.getlist('protein[]')
        carbs_list = request.form.getlist('carbs[]')
        fat_list = request.form.getlist('fat[]')

        return redirect(url_for('log_meal'))
    return render_template('logMeal.html')

     
@app.route('/meal_analysis')
def meal_analysis():
    return render_template('mealAnalysis.html')

@app.route('/log_physical_state')
def log_physical_state():
    return render_template('logPhysicalState.html') 

@app.route('/logout')
def logout():
    session.pop('user', None)
    flash('Logged out successfully!', 'info')
    return redirect(url_for('index'))

if __name__ == "__main__":
    app.run(debug=True, port=5001)

#port number should not overwrite 
#
