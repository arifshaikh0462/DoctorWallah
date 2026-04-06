import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE doctors ADD COLUMN qualification TEXT;")
        print("Added qualification column")
    except Exception as e:
        print("qualification error:", e)
        
    try:
        cursor.execute("ALTER TABLE doctors ADD COLUMN hospital_name TEXT;")
        print("Added hospital_name column")
    except Exception as e:
        print("hospital_name error:", e)
        
    try:
        cursor.execute("ALTER TABLE doctors ADD COLUMN booking_link TEXT;")
        print("Added booking_link column")
    except Exception as e:
        print("booking_link error:", e)
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    migrate()
