import os
from sqlalchemy import create_engine, text
from app.database import build_database_url

DATABASE_URL = build_database_url()
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("Adding full_name...")
        conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR(255) DEFAULT NULL"))
        print("Adding phone...")
        conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(50) DEFAULT NULL"))
        print("Adding currency...")
        conn.execute(text("ALTER TABLE users ADD COLUMN currency VARCHAR(10) DEFAULT 'INR'"))
        print("Adding profile_image_url...")
        conn.execute(text("ALTER TABLE users ADD COLUMN profile_image_url VARCHAR(1024) DEFAULT NULL"))
        conn.commit()
        print("Migration successful.")
except Exception as e:
    print(f"Error during migration (could be already applied): {e}")
