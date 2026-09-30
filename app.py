from flask import Flask, request, jsonify, session
from flask_cors import CORS
import joblib
import os
import sqlite3
import json
from werkzeug.security import generate_password_hash, check_password_hash


# =========================================
# THINKTRACK JOURNAL - FLASK BACKEND
# =========================================

app = Flask(__name__)

# Frontend and backend are running on different ports.
CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ]
)

app.secret_key = "thinktrack-secret-key-change-this"


# =========================================
# DATABASE
# =========================================

DATABASE = os.path.join(
    os.path.dirname(__file__),
    "users.db"
)


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


# =========================================
# CREATE DATABASE TABLES
# =========================================

def create_users_table():

    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


def create_journal_table():

    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            mood TEXT,
            entry_date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()


def create_planner_table():

    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS daily_planners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            plan_date TEXT NOT NULL,

            weather TEXT,

            priorities TEXT,
            todos TEXT,
            things TEXT,
            schedule TEXT,

            money_in REAL DEFAULT 0,
            money_out REAL DEFAULT 0,

            comment TEXT,

            water INTEGER DEFAULT 0,

            mood TEXT,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            UNIQUE(user_id, plan_date),

            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()


def add_water_column():

    conn = get_db()

    columns = conn.execute(
        "PRAGMA table_info(daily_planners)"
    ).fetchall()

    column_names = [column["name"] for column in columns]

    if "water" not in column_names:

        conn.execute(
            "ALTER TABLE daily_planners ADD COLUMN water INTEGER DEFAULT 0"
        )

        conn.commit()

    conn.close()


def create_health_table():

    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS daily_health (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            health_date TEXT NOT NULL,

            mood INTEGER DEFAULT 5,
            sleep REAL DEFAULT 0,
            study REAL DEFAULT 0,
            tasks INTEGER DEFAULT 0,
            stress INTEGER DEFAULT 0,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            UNIQUE(user_id, health_date),

            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()


# Create all tables when server starts
create_users_table()
create_journal_table()
create_planner_table()
add_water_column()
create_health_table()


# =========================================
# LOAD AI MODEL
# =========================================

model_path = os.path.join(
    os.path.dirname(__file__),
    "..",
    "thinktrack_model.pkl"
)

try:

    model = joblib.load(model_path)

    print("ThinkTrack AI model loaded successfully.")

except Exception as error:

    model = None

    print("Warning: AI model could not be loaded.")
    print(error)


# =========================================
# HOME / SERVER TEST
# =========================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "success": True,
        "message": "ThinkTrack AI Backend is running!"
    })


# =========================================
# REGISTER
# =========================================

@app.route("/register", methods=["POST"])
def register():

    data = request.get_json(silent=True) or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:

        return jsonify({
            "success": False,
            "message": "All fields are required."
        }), 400

    if len(password) < 6:

        return jsonify({
            "success": False,
            "message": "Password must contain at least 6 characters."
        }), 400

    password_hash = generate_password_hash(password)

    conn = get_db()

    try:

        conn.execute(
            """
            INSERT INTO users
            (name, email, password)
            VALUES (?, ?, ?)
            """,
            (
                name,
                email,
                password_hash
            )
        )

        conn.commit()

    except sqlite3.IntegrityError:

        conn.close()

        return jsonify({
            "success": False,
            "message": "An account with this email already exists."
        }), 409

    conn.close()

    return jsonify({
        "success": True,
        "message": "Account created successfully."
    }), 201


# =========================================
# LOGIN
# =========================================

@app.route("/login", methods=["POST"])
def login():

    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:

        return jsonify({
            "success": False,
            "message": "Email and password are required."
        }), 400

    conn = get_db()

    user = conn.execute(
        """
        SELECT *
        FROM users
        WHERE email = ?
        """,
        (email,)
    ).fetchone()

    conn.close()

    if user is None:

        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401

    if not check_password_hash(
        user["password"],
        password
    ):

        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401

    # Clear any old session
    session.clear()

    # Create new session
    session["user_id"] = user["id"]
    session["user_name"] = user["name"]
    session["user_email"] = user["email"]

    return jsonify({
        "success": True,
        "message": "Login successful.",
        "name": user["name"],
        "email": user["email"]
    })


# =========================================
# CURRENT USER
# =========================================

@app.route("/me", methods=["GET"])
def get_current_user():

    if "user_id" not in session:

        return jsonify({
            "success": False,
            "message": "Not logged in."
        }), 401

    return jsonify({
        "success": True,
        "id": session["user_id"],
        "name": session["user_name"],
        "email": session["user_email"]
    })


# =========================================
# LOGOUT
# =========================================

@app.route("/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    })


# =========================================
# JOURNAL - ADD
# =========================================

@app.route("/journal", methods=["POST"])
def add_journal():

    if "user_id" not in session:

        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401

    data = request.get_json(silent=True) or {}

    title = data.get("title", "").strip()
    content = data.get("content", "").strip()
    mood = data.get("mood", "").strip()
    entry_date = data.get("entry_date", "").strip()

    if not title or not content or not entry_date:

        return jsonify({
            "success": False,
            "message": "Title, content and date are required."
        }), 400

    conn = get_db()

    cursor = conn.execute(
        """
        INSERT INTO journal_entries
        (
            user_id,
            title,
            content,
            mood,
            entry_date
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            session["user_id"],
            title,
            content,
            mood,
            entry_date
        )
    )

    conn.commit()

    entry_id = cursor.lastrowid

    conn.close()

    return jsonify({
        "success": True,
        "message": "Journal entry saved successfully.",
        "id": entry_id
    }), 201


# =========================================
# JOURNAL - GET USER ENTRIES
# =========================================

@app.route("/journal", methods=["GET"])
def get_journals():

    if "user_id" not in session:

        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401

    conn = get_db()

    entries = conn.execute(
        """
        SELECT
            id,
            title,
            content,
            mood,
            entry_date,
            created_at
        FROM journal_entries
        WHERE user_id = ?
        ORDER BY entry_date DESC, id DESC
        """,
        (session["user_id"],)
    ).fetchall()

    conn.close()

    result = []

    for entry in entries:

        result.append({
            "id": entry["id"],
            "title": entry["title"],
            "content": entry["content"],
            "mood": entry["mood"],
            "entry_date": entry["entry_date"],
            "created_at": entry["created_at"]
        })

    return jsonify({
        "success": True,
        "entries": result
    })


# =========================================
# JOURNAL - DELETE
# =========================================

@app.route("/journal/<int:entry_id>", methods=["DELETE"])
def delete_journal(entry_id):

    if "user_id" not in session:

        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401

    conn = get_db()

    cursor = conn.execute(
        """
        DELETE FROM journal_entries
        WHERE id = ?
        AND user_id = ?
        """,
        (
            entry_id,
            session["user_id"]
        )
    )

    conn.commit()

    deleted = cursor.rowcount

    conn.close()

    if deleted == 0:

        return jsonify({
            "success": False,
            "message": "Entry not found."
        }), 404

    return jsonify({
        "success": True,
        "message": "Journal entry deleted successfully."
    })


# =========================================
# PLANNER - SAVE / UPDATE
# =========================================

@app.route("/planner", methods=["POST"])
def save_planner():

    if "user_id" not in session:

        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401

    data = request.get_json(silent=True) or {}

    plan_date = data.get("plan_date", "").strip()

    if not plan_date:

        return jsonify({
            "success": False,
            "message": "Planner date is required."
        }), 400

    weather = data.get("weather", "")
    priorities = data.get("priorities", [])
    todos = data.get("todos", [])
    things = data.get("things", [])
    schedule = data.get("schedule", [])

    money_in = data.get("money_in", 0)
    money_out = data.get("money_out", 0)

    comment = data.get("comment", "")
    water = int(data.get("water", 0))

    priorities_json = json.dumps(priorities)
    todos_json = json.dumps(todos)
    things_json = json.dumps(things)
    schedule_json = json.dumps(schedule)

    conn = get_db()

    existing = conn.execute(
        """
        SELECT id
        FROM daily_planners
        WHERE user_id = ?
        AND plan_date = ?
        """,
        (
            session["user_id"],
            plan_date
        )
    ).fetchone()

    if existing:

        conn.execute(
            """
            UPDATE daily_planners
            SET
                weather = ?,
                priorities = ?,
                todos = ?,
                things = ?,
                schedule = ?,
                money_in = ?,
                money_out = ?,
                comment = ?,
                water = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
            AND plan_date = ?
            """,
            (
                weather,
                priorities_json,
                todos_json,
                things_json,
                schedule_json,
                float(money_in or 0),
                float(money_out or 0),
                comment,
                water,
                session["user_id"],
                plan_date
            )
        )

    else:

        conn.execute(
            """
            INSERT INTO daily_planners
            (
                user_id,
                plan_date,
                weather,
                priorities,
                todos,
                things,
                schedule,
                money_in,
                money_out,
                comment,
                water
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session["user_id"],
                plan_date,
                weather,
                priorities_json,
                todos_json,
                things_json,
                schedule_json,
                float(money_in or 0),
                float(money_out or 0),
                comment,
                water
            )
        )

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Planner saved successfully."
    })


# =========================================
# PLANNER - GET
# =========================================

@app.route("/planner", methods=["GET"])
def get_planner():

    if "user_id" not in session:

        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401

    plan_date = request.args.get(
        "date",
        ""
    ).strip()

    if not plan_date:

        return jsonify({
            "success": False,
            "message": "Planner date is required."
        }), 400

    conn = get_db()

    planner = conn.execute(
        """
        SELECT
            id,
            plan_date,
            weather,
            priorities,
            todos,
            things,
            schedule,
            money_in,
            money_out,
            comment,
            water
        FROM daily_planners
        WHERE user_id = ?
        AND plan_date = ?
        """,
        (
            session["user_id"],
            plan_date
        )
    ).fetchone()

    conn.close()


    # No planner saved for this date
    if planner is None:

        return jsonify({
            "success": True,
            "exists": False,
            "planner": None
        })


    # Convert JSON strings back to lists
    try:
        priorities = json.loads(
            planner["priorities"] or "[]"
        )
    except Exception:
        priorities = []


    try:
        todos = json.loads(
            planner["todos"] or "[]"
        )
    except Exception:
        todos = []


    try:
        things = json.loads(
            planner["things"] or "[]"
        )
    except Exception:
        things = []


    try:
        schedule = json.loads(
            planner["schedule"] or "[]"
        )
    except Exception:
        schedule = []


    return jsonify({
        "success": True,
        "exists": True,

        "planner": {
            "id": planner["id"],
            "plan_date": planner["plan_date"],

            "weather": planner["weather"] or "",

            "priorities": priorities,
            "todos": todos,
            "things": things,
            "schedule": schedule,

            "money_in": planner["money_in"] or 0,
            "money_out": planner["money_out"] or 0,

            "comment": planner["comment"] or "",

            "water": planner["water"] or 0
        }
    })


# =========================================
# DAILY HEALTH - SAVE
# =========================================

@app.route("/health", methods=["POST"])
def save_health():

    if "user_id" not in session:

        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401

    data = request.get_json(silent=True) or {}

    health_date = data.get(
        "health_date",
        ""
    ).strip()

    if not health_date:

        return jsonify({
            "success": False,
            "message": "Health date is required."
        }), 400

    mood = float(data.get("mood", 5))
    sleep = float(data.get("sleep", 0))
    study = float(data.get("study", 0))
    tasks = int(data.get("tasks", 0))
    stress = int(data.get("stress", 0))

    conn = get_db()

    existing = conn.execute(
        """
        SELECT id
        FROM daily_health
        WHERE user_id = ?
        AND health_date = ?
        """,
        (
            session["user_id"],
            health_date
        )
    ).fetchone()

    if existing:

        conn.execute(
            """
            UPDATE daily_health
            SET
                mood = ?,
                sleep = ?,
                study = ?,
                tasks = ?,
                stress = ?
            WHERE user_id = ?
            AND health_date = ?
            """,
            (
                mood,
                sleep,
                study,
                tasks,
                stress,
                session["user_id"],
                health_date
            )
        )

    else:

        conn.execute(
            """
            INSERT INTO daily_health
            (
                user_id,
                health_date,
                mood,
                sleep,
                study,
                tasks,
                stress
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session["user_id"],
                health_date,
                mood,
                sleep,
                study,
                tasks,
                stress
            )
        )

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Daily health data saved."
    })


# =========================================
# DAILY HEALTH - GET
# =========================================

@app.route("/health", methods=["GET"])
def get_health():

    if "user_id" not in session:

        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401

    health_date = request.args.get(
        "date",
        ""
    ).strip()

    if not health_date:

        return jsonify({
            "success": False,
            "message": "Health date is required."
        }), 400

    conn = get_db()

    health = conn.execute(
        """
        SELECT
            mood,
            sleep,
            study,
            tasks,
            stress
        FROM daily_health
        WHERE user_id = ?
        AND health_date = ?
        """,
        (
            session["user_id"],
            health_date
        )
    ).fetchone()

    conn.close()

    if health is None:

        return jsonify({
            "success": True,
            "exists": False,
            "health": None
        })

    return jsonify({
        "success": True,
        "exists": True,
        "health": {
            "mood": health["mood"],
            "sleep": health["sleep"],
            "study": health["study"],
            "tasks": health["tasks"],
            "stress": health["stress"]
        }
    })


# =========================================
# MOOD BASED AI PREDICTION
# =========================================
@app.route("/predict", methods=["POST"])
def predict():
    if "user_id" not in session:
        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401

    data = request.get_json(silent=True) or {}

    try:
        mood = float(data.get("mood", 0))
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "Invalid mood value."
        }), 400

    if mood < 1 or mood > 6:
        return jsonify({
            "success": False,
            "message": "Mood must be between 1 and 6."
        }), 400

    if model is None:
        return jsonify({
            "success": False,
            "message": "AI model is not available."
        }), 500

    try:
        prediction = model.predict([[mood]])
        result = int(prediction[0])

        if result == 2:
            status = "Good"
            recommendation = (
                "You are having a positive day. "
                "Keep doing things that make you happy "
                "and take time to appreciate your progress."
            )

        elif result == 1:
            status = "Normal"
            recommendation = (
                "Your mood seems balanced today. "
                "Take a short break, stay organized, "
                "and continue your day at a comfortable pace."
            )

        else:
            status = "Needs Care"
            recommendation = (
                "It seems like today may feel a little difficult. "
                "Give yourself some quiet time, talk to someone "
                "you trust, and be gentle with yourself."
            )

        return jsonify({
            "success": True,
            "prediction": result,
            "status": status,
            "recommendation": recommendation
        })

    except Exception as error:
        print("AI prediction error:", error)

        return jsonify({
            "success": False,
            "message": "AI prediction failed."
        }), 500


# =========================================
# RUN SERVER
# =========================================

if __name__ == "__main__":

    print("----------------------------------------")
    print(" THINKTRACK JOURNAL BACKEND")
    print("----------------------------------------")
    print(" Server: http://127.0.0.1:5000")
    print(" Database:", DATABASE)
    print(" AI Model:", model_path)
    print("----------------------------------------")

    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT",5000)),
        debug=False
    )
