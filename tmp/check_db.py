import sqlite3
import os

db_path = "d:/Code/InsightBank-AI/backend/bank_analyzer.db"
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- Statements ---")
    try:
        cursor.execute("SELECT * FROM statements")
        rows = cursor.fetchall()
        for row in rows:
            print(row)
    except Exception as e:
        print(f"Error reading statements: {e}")
        
    print("\n--- Transactions ---")
    try:
        cursor.execute("SELECT COUNT(*) FROM transactions")
        count = cursor.fetchone()[0]
        print(f"Total transactions: {count}")
    except Exception as e:
        print(f"Error reading transactions: {e}")
        
    conn.close()
