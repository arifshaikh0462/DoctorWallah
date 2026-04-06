import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE articles ADD COLUMN image2 TEXT;")
        print("Added image2 column")
    except Exception as e:
        print("image2 error:", e)
        
    try:
        cursor.execute("ALTER TABLE articles ADD COLUMN image3 TEXT;")
        print("Added image3 column")
    except Exception as e:
        print("image3 error:", e)
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    migrate()
