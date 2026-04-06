import sqlite3
import os

DB_PATH = 'database.db'

def init_db():
    # Remove existing database if exists
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create tables
    cursor.execute('''
        CREATE TABLE admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            specialization TEXT NOT NULL,
            qualification TEXT,
            hospital_name TEXT,
            booking_link TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            short_description TEXT,
            doctor_id INTEGER,
            category_id INTEGER,
            image TEXT,
            image2 TEXT,
            image3 TEXT,
            date TEXT NOT NULL,
            FOREIGN KEY(doctor_id) REFERENCES doctors(id),
            FOREIGN KEY(category_id) REFERENCES categories(id)
        )
    ''')

    # Insert default admin (username: admin, password: admin123)
    # Using a simple hash mechanism for demonstration (in a real app, use werkzeug.security)
    from werkzeug.security import generate_password_hash
    cursor.execute(
        "INSERT INTO admins (username, password_hash) VALUES (?, ?)",
        ("admin", generate_password_hash("admin123"))
    )

    # Insert some initial categories
    predefined_categories = ['Heart', 'Diabetes', 'Skin', 'Mental Health', 'Nutrition']
    for cat in predefined_categories:
        cursor.execute("INSERT INTO categories (name) VALUES (?)", (cat,))
        
    # Insert some placeholder doctors
    doctors = [
        ('Dr. Ramesh Kumar', 'Cardiologist'),
        ('Dr. Sana Sheikh', 'Dermatologist'),
        ('Dr. Arvind Gupta', 'Endocrinologist')
    ]
    for doc in doctors:
        cursor.execute("INSERT INTO doctors (name, specialization) VALUES (?, ?)", doc)

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

if __name__ == "__main__":
    init_db()
