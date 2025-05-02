import os
import sqlite3
import base64
import datetime
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import face_recognition
from werkzeug.utils import secure_filename
import pandas as pd
import zipfile
import tempfile
import shutil

app = Flask(__name__)
CORS(app)

# Directories
os.makedirs("images", exist_ok=True)
os.makedirs("faces", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

# Database path
DB_PATH = "C:/Users/Suyash/OneDrive/Desktop/FACES/attendance.db"

# Initialize database
def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            enrollmentYear TEXT,
            department TEXT,
            section TEXT,
            gender TEXT,
            encoding BLOB NOT NULL
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            time TEXT,
            imageUrl TEXT
        )''')
init_db()

# Save base64 image to disk
def save_base64_image(base64_img, prefix):
    img_data = base64.b64decode(base64_img.split(",")[1])
    filename = f"{prefix}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}.jpg"
    filepath = os.path.join("images", filename)
    with open(filepath, "wb") as f:
        f.write(img_data)
    return filepath

# Get average face encoding from base64 images
def get_average_encoding(base64_images):
    encodings = []
    for img in base64_images:
        path = save_base64_image(img, "user")
        image = face_recognition.load_image_file(path)
        faces = face_recognition.face_encodings(image)
        if faces:
            encodings.append(faces[0])
    if encodings:
        return np.mean(encodings, axis=0)
    return None

# Load and encode all faces from folders under a given directory
def load_faces_from_folders(base_folder="C:/Users/Suyash/OneDrive/Desktop/FACES"):
    count_added = 0
    for person_name in os.listdir(base_folder):
        person_path = os.path.join(base_folder, person_name)
        if os.path.isdir(person_path):
            encodings = []
            for image_file in os.listdir(person_path):
                img_path = os.path.join(person_path, image_file)
                try:
                    image = face_recognition.load_image_file(img_path)
                    faces = face_recognition.face_encodings(image)
                    if faces:
                        encodings.append(faces[0])
                except Exception as e:
                    print(f"Error processing {img_path}: {e}")
            if encodings:
                avg_encoding = np.mean(encodings, axis=0)
                with sqlite3.connect(DB_PATH) as conn:
                    c = conn.cursor()
                    c.execute("SELECT id FROM users WHERE name = ?", (person_name,))
                    if c.fetchone() is None:
                        c.execute('''INSERT INTO users (name, enrollmentYear, department, section, gender, encoding)
                                     VALUES (?, ?, ?, ?, ?, ?)''',
                                  (person_name, "", "", "", "", avg_encoding.tobytes()))
                        count_added += 1
    return count_added

@app.route("/api/load-folders", methods=["POST"])
def api_load_faces_from_folders():
    count = load_faces_from_folders()
    return jsonify({"message": f"Loaded encodings for {count} users from folder structure."})

@app.route("/api/upload-zip", methods=["POST"])
def upload_zip():
    if 'file' not in request.files:
        return jsonify({"message": "No file part in the request"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No file selected"}), 400

    if not file.filename.endswith('.zip'):
        return jsonify({"message": "Only .zip files are allowed"}), 400

    temp_dir = tempfile.mkdtemp()
    zip_path = os.path.join(temp_dir, secure_filename(file.filename))
    file.save(zip_path)

    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)

        extracted_root = temp_dir
        count = load_faces_from_folders(base_folder=extracted_root)

        return jsonify({"message": f"Loaded {count} users from uploaded zip."})
    except Exception as e:
        return jsonify({"message": f"Error processing zip: {str(e)}"}), 500
    finally:
        shutil.rmtree(temp_dir)

@app.route("/api/add-user", methods=["POST"])
def add_user():
    data = request.get_json()
    name = data["name"]
    enrollmentYear = data["enrollmentYear"]
    department = data["department"]
    section = data["section"]
    gender = data["gender"]
    images = data["images"]

    encoding = get_average_encoding(images)
    if encoding is None:
        return jsonify({"message": "No valid face found."}), 400

    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''INSERT INTO users (name, enrollmentYear, department, section, gender, encoding)
                     VALUES (?, ?, ?, ?, ?, ?)''',
                  (name, enrollmentYear, department, section, gender, encoding.tobytes()))
        conn.commit()

    return jsonify({"message": "User added successfully."})

@app.route("/api/recognize", methods=["POST"])
def recognize_face():
    data = request.get_json()
    img = data.get("image")
    if not img:
        return jsonify({"message": "No image provided"}), 400

    path = save_base64_image(img, "scan")
    captured_image = face_recognition.load_image_file(path)
    unknown_encodings = face_recognition.face_encodings(captured_image)

    if not unknown_encodings:
        return jsonify({"message": "No face detected"}), 404

    unknown_encoding = unknown_encodings[0]

    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        
        # Check if already marked today
        today = datetime.date.today().isoformat()
        c.execute("""
            SELECT u.name, u.encoding 
            FROM users u
            LEFT JOIN attendance a ON u.name = a.name AND date(a.time) = ?
            WHERE a.id IS NULL OR a.name IS NULL
        """, (today,))
        
        known_names = []
        known_encodings = []
        for name, encoding_blob in c.fetchall():
            known_names.append(name)
            known_encodings.append(np.frombuffer(encoding_blob, dtype=np.float64))

        if not known_encodings:
            return jsonify({"message": "All known users already marked today"}), 200

        matches = face_recognition.compare_faces(known_encodings, unknown_encoding, tolerance=0.6)
        face_distances = face_recognition.face_distance(known_encodings, unknown_encoding)
        best_match_index = np.argmin(face_distances)

        if matches[best_match_index]:
            name = known_names[best_match_index]
            
            # Check again in case of race condition
            c.execute("SELECT id FROM attendance WHERE name = ? AND date(time) = ?", 
                      (name, today))
            if not c.fetchone():
                timestamp = datetime.datetime.now().isoformat()
                image_url = f"/images/{os.path.basename(path)}"
                c.execute("INSERT INTO attendance (name, time, imageUrl) VALUES (?, ?, ?)",
                         (name, timestamp, image_url))
                conn.commit()
                return jsonify({
                    "status": "success",
                    "name": name,
                    "time": timestamp,
                    "imageUrl": image_url,
                    "already_marked": False
                })
            return jsonify({
                "status": "success",
                "name": name,
                "message": "Attendance already marked today",
                "already_marked": True
            })

    return jsonify({"status": "error", "message": "Unknown face"}), 404

@app.route("/api/attendance", methods=["GET"])
def get_today_attendance():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("""
            SELECT a.name, a.time, a.imageUrl, 
                   CASE WHEN date(a.time) = date('now') THEN 1 ELSE 0 END as marked_today
            FROM attendance a
            WHERE date(a.time) = date('now')
            ORDER BY a.time DESC
        """)
        rows = c.fetchall()
    return jsonify([{
        "name": row[0], 
        "time": row[1], 
        "imageUrl": row[2],
        "marked_today": bool(row[3])
    } for row in rows])

@app.route("/api/attendance-summary", methods=["GET"])
def attendance_summary():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("""
            SELECT u.department, COUNT(a.id) 
            FROM attendance a 
            JOIN users u ON a.name = u.name 
            WHERE date(a.time) = date('now') 
            GROUP BY u.department
        """)
        dept_data = [{"department": row[0], "count": row[1]} for row in c.fetchall()]

        c.execute("""
            SELECT strftime('%H', time) AS hour, COUNT(*) 
            FROM attendance 
            WHERE date(time) = date('now') 
            GROUP BY hour
        """)
        time_data = [{"hour": row[0], "count": row[1]} for row in c.fetchall()]

    return jsonify({
        "by_department": dept_data,
        "by_hour": time_data
    })

# ✅ New endpoints to delete attendance
@app.route("/deleteAllAttendance", methods=["DELETE"])
def delete_all_attendance():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("DELETE FROM attendance")
        conn.commit()
    return jsonify({"message": "All attendance deleted."})

@app.route("/deleteTodayAttendance", methods=["DELETE"])
def delete_today_attendance():
    today = datetime.date.today().isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("DELETE FROM attendance WHERE date(time) = ?", (today,))
        conn.commit()
    return jsonify({"message": "Today's attendance deleted."})

@app.route("/api/users", methods=["GET"])
def get_users():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("SELECT id, name FROM users")
        rows = c.fetchall()
    return jsonify([{"id": row[0], "name": row[1]} for row in rows])

@app.route("/api/delete-user/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
    return jsonify({"message": "User deleted"})

@app.route("/images/<filename>")
def serve_image(filename):
    return send_from_directory("images", filename)

if __name__ == "__main__":
    app.run(debug=True)