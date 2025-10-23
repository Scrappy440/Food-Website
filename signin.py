from flask import Flask, render_template, request, redirect, url_for, flash, session
#No pygame, flask moving forward, easiest to communicate with SQL such as PostgreSQL
#flask version 25.1.1, used cmd: pip install flask
# 10/19 added "sessions" above
app = Flask(__name__)
app.secret_key = "keyHere" 

#10/15
# Fake user database for demo, tie in real database later
users = {
    "testuser@example.com": "password123",
    "admin@example.com": "admin"
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

    if email in users and users[email] == password:
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
    
    # Basic validation
    if email in users:
        flash("User already exists!", 'error')
        return redirect(url_for('index'))
    
    # Add user to "database"
    users[email] = password
    flash('Account created successfully! Please log in.', 'success')
    return redirect(url_for('login_page'))

@app.route('/home')
def home():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    return render_template('home.html', user=session['user'])

@app.route('/logout')
def logout():
    session.pop('user', None)
    flash('Logged out successfully!', 'info')
    return redirect(url_for('index'))

if __name__ == "__main__":
    app.run(debug=True, port=5001)
