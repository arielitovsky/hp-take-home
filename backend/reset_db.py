from sqlalchemy import text
from db_engine import sync_engine

def reset_database():
    """Reset the database by dropping and recreating all tables"""
    with sync_engine.connect() as conn:
        # Drop all tables
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.commit()
    
    # Recreate tables from models
    from models.database import Base
    Base.metadata.create_all(sync_engine)
    print("Database reset complete. All tables have been recreated.")

if __name__ == "__main__":
    reset_database()
