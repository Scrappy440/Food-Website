from flask import Flask, render_template, request, redirect, url_for, flash,session
#No pygame, flask moving forward, easiest to communicate with SQL such as PostgreSQL
#flask version 25.1.1, used cmd: pip install flask
# 10/19 added "sessions" above
app = Flask(__name__)
app.secret_key = "keyHere" 

#10/15
# Fake user database for demo, tie in real database later
users = {
    "testuser": "password123",
    "admin": "admin"
}
# Connect with flask: 
@app.route("/")
def home():
    return render_template("login")     # called "login" not login.htlm

@app.route("/login", methods=['GET', 'POST'])
def login():
    #username = request.form["username"]
    email = request.form.get('email')
    password = request.form.get('password')

    if email in users and users[email] == password:
        session['user'] = email
        flash('Login successful!', 'success')
        return redirect(url_for('dashboard'))
    else:
        flash("Invalid credentials, try again.")
        return redirect(url_for("login"))

#New 10/19
@app.route('/dashboard')        #not in session works
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    return f"<h1>Welcome, {session['user']}!</h1><a href='/logout'>Logout</a>"

@app.route('/logout')
def logout():
    session.pop('user', None)
    flash('Logged out successfully!', 'info')
    return redirect(url_for('login'))

if __name__ == "__main__":
    app.run(debug=True)
