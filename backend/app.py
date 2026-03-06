# backend/app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import operator
import os

app = Flask(__name__)
CORS(app)  # Allow React to talk to Flask

DB_PATH = "database.db"

# ──────────────────────────────────────────
# DATABASE SETUP
# ──────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            expression TEXT NOT NULL,
            result     TEXT NOT NULL,
            timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()  # Run on startup


# ──────────────────────────────────────────
# HELPER — SAFE CALCULATION (no eval)
# ──────────────────────────────────────────
OPS = {
    "+": operator.add,
    "-": operator.sub,
    "*": operator.mul,
    "/": operator.truediv,
    "%": operator.mod,
}

def calculate(a, op, b):
    if op not in OPS:
        raise ValueError(f"Unknown operator: {op}")
    if op == "/" and b == 0:
        raise ZeroDivisionError("Cannot divide by zero")
    result = OPS[op](a, b)
    return round(result, 10)


# ──────────────────────────────────────────
# ROUTES
# ──────────────────────────────────────────

# 1. CALCULATE
@app.route("/api/calculate", methods=["POST"])
def api_calculate():
    data = request.get_json()
    
    try:
        a   = float(data["a"])
        op  = data["op"]        # "+", "-", "*", "/"
        b   = float(data["b"])
        
        result = calculate(a, op, b)
        expression = f"{a} {op} {b}"
        result_str = str(result)
        
        # Save to DB
        conn = sqlite3.connect(DB_PATH)
        conn.execute(
            "INSERT INTO history (expression, result) VALUES (?, ?)",
            (expression, result_str)
        )
        conn.commit()
        conn.close()
        
        return jsonify({ "result": result_str, "expression": expression })
    
    except ZeroDivisionError:
        return jsonify({ "result": "Error: Divide by zero" }), 400
    except (KeyError, ValueError) as e:
        return jsonify({ "error": str(e) }), 400


# 2. GET HISTORY
@app.route("/api/history", methods=["GET"])
def api_history():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT expression, result, timestamp FROM history ORDER BY id DESC LIMIT 10"
    )
    rows = cursor.fetchall()
    conn.close()
    
    history = [
        { "expression": r[0], "result": r[1], "timestamp": r[2] }
        for r in rows
    ]
    return jsonify(history)


# 3. CLEAR HISTORY
@app.route("/api/history", methods=["DELETE"])
def api_clear_history():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM history")
    conn.commit()
    conn.close()
    return jsonify({ "message": "History cleared" })


# ──────────────────────────────────────────
# RUN
# ──────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5000)