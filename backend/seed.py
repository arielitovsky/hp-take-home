from sqlalchemy import select, func
from sqlalchemy.orm import Session
from db_engine import sync_engine
from models.database import User


def seed_user_if_needed():
    with Session(sync_engine) as session:
        with session.begin():
            # Check if we have at least 2 users
            user_count = session.execute(select(func.count(User.id))).scalar()
            if user_count >= 2:
                print(f"Already have {user_count} users, skipping seeding")
                return
            print("Seeding users")
            session.add(User(name="Alice"))
            session.add(User(name="Bot"))
            session.commit()
