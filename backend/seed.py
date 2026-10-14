import asyncio
import os
import sys

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from backend.app.database import engine, Base, AsyncSessionLocal
from backend.app.models.user import User
from backend.app.services.auth_service import get_password_hash
from backend.app.config import settings

async def seed_database():
    print("Creating all database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created.")

    async with AsyncSessionLocal() as session:
        # Check if admin exists
        stmt = select(User).where(User.username == settings.ADMIN_DEFAULT_USER)
        res = await session.execute(stmt)
        admin = res.scalar_one_or_none()
        if not admin:
            admin = User(
                username=settings.ADMIN_DEFAULT_USER,
                hashed_password=get_password_hash(settings.ADMIN_DEFAULT_PASSWORD),
                role="admin",
                full_name="System Administrator",
                is_active=True
            )
            session.add(admin)
            print(f"Created Admin account: {settings.ADMIN_DEFAULT_USER}")
        else:
            print(f"Admin account already exists: {admin.username}")

        # Check and create the 4 permanent participants
        for p in settings.PARTICIPANTS:
            p_stmt = select(User).where(User.username == p["id"])
            p_res = await session.execute(p_stmt)
            participant = p_res.scalar_one_or_none()
            if not participant:
                participant = User(
                    username=p["id"],
                    hashed_password=get_password_hash(p["default_pw"]),
                    role="participant",
                    full_name=p["name"],
                    is_active=True
                )
                session.add(participant)
                print(f"Created Participant: {p['id']} ({p['name']})")
            else:
                print(f"Participant already exists: {participant.username}")

        await session.commit()
    print("Database initialization and user seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_database())
