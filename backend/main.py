from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from seed import seed_user_if_needed
from sqlalchemy.ext.asyncio import AsyncSession
from db_engine import engine
from models import User, Message
import random

seed_user_if_needed()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserRead(BaseModel):
    id: int
    name: str


@app.get("/users/me")
async def get_my_user():
    async with AsyncSession(engine) as session:
        async with session.begin():
            # Sample logic to simplify getting the current user. There's only one user.
            result = await session.execute(select(User))
            user = result.scalars().first()

            if user is None:
                raise HTTPException(status_code=404, detail="User not found")
            return UserRead(id=user.id, name=user.name)


class MessageRead(BaseModel):
    id: int
    role: str
    content: str
    user_id: int
    created_at: str


@app.get("/messages")
async def get_messages():
    async with AsyncSession(engine) as session:
        async with session.begin():
            result = await session.execute(select(Message).order_by(Message.created_at.asc()))
            messages = result.scalars().all()
            return [
                MessageRead(
                    id=m.id,
                    role=m.role,
                    content=m.content,
                    user_id=m.user_id,
                    created_at=m.created_at.isoformat() if hasattr(m.created_at, "isoformat") and m.created_at else "",
                )
                for m in messages
            ]


def _generate_bot_reply() -> str:
    words = [
        "lorem",
        "ipsum",
        "dolor",
        "sit",
        "amet",
        "consectetur",
        "adipiscing",
        "elit",
        "sed",
        "do",
        "eiusmod",
        "tempor",
        "incididunt",
        "ut",
        "labore",
        "et",
        "dolore",
        "magna",
        "aliqua",
    ]
    return " ".join(random.choice(words) for _ in range(8)).capitalize() + "."


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            text = await websocket.receive_text()
            async with AsyncSession(engine) as session:
                async with session.begin():
                    # Get the first user (Alice) for user messages
                    user = await session.execute(select(User).where(User.name == "Alice"))
                    user = user.scalar_one()
                    user_msg = Message(role="user", content=text, user_id=user.id)
                    session.add(user_msg)
                # Transaction committed on exiting session.begin()

            bot_text = _generate_bot_reply()

            async with AsyncSession(engine) as session:
                async with session.begin():
                    # Get the Bot user for bot messages
                    bot_user = await session.execute(select(User).where(User.name == "Bot"))
                    bot_user = bot_user.scalar_one()
                    bot_msg = Message(role="bot", content=bot_text, user_id=bot_user.id)
                    session.add(bot_msg)
                    # Ensure PK and server defaults (e.g., created_at) are loaded before session closes
                    await session.flush()
                    await session.refresh(bot_msg)

                    response_payload = {
                        "id": bot_msg.id,
                        "role": bot_msg.role,
                        "content": bot_msg.content,
                        "user_id": bot_msg.user_id,
                        "created_at": bot_msg.created_at.isoformat() if hasattr(bot_msg.created_at, "isoformat") and bot_msg.created_at else "",
                    }

            await websocket.send_json(response_payload)
    except WebSocketDisconnect:
        return
