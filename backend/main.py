from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from seed import seed_user_if_needed
from sqlalchemy.ext.asyncio import AsyncSession
from db_engine import engine
from models import User, Message, UserRead, MessageRead
from utils import generate_bot_reply
import json
import random


async def get_bot_user(session: AsyncSession) -> User:
    """Get the Bot user from the database"""
    result = await session.execute(select(User).where(User.name == "Bot"))
    return result.scalar_one()

async def get_user_by_id(session: AsyncSession, user_id: int) -> User:
    """Get the user by ID from the database"""
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()
    if not user:
        # Throw an error if the specified user_id doesn't exist
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found")
    return user

seed_user_if_needed()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/users/me")
async def get_my_user():
    async with AsyncSession(engine) as session:
        async with session.begin():
            # Randomly choose between Alice and Zod
            random_name = random.choice(["Alice", "Zod"])
            result = await session.execute(select(User).where(User.name == random_name))
            user = result.scalar_one()

            if user is None:
                raise HTTPException(status_code=404, detail="User not found")
            return UserRead(id=user.id, name=user.name)


@app.get("/messages")
async def get_messages(user_id: int):
    async with AsyncSession(engine) as session:
        async with session.begin():
            
            bot_user = await get_bot_user(session)
            user = await get_user_by_id(session, user_id)
            # Get messages where the user is either origin or destination, and the other party is the Bot
            result = await session.execute(
                select(Message).where(
                    ((Message.origin_user == user_id) & (Message.destination_user == bot_user.id)) |
                    ((Message.origin_user == bot_user.id) & (Message.destination_user == user_id))
                ).order_by(Message.created_at.asc())
            )
            messages = result.scalars().all()
            return [
                MessageRead(
                    id=m.id,
                    role=m.role,
                    content=m.content,
                    origin_user=m.origin_user,
                    destination_user=m.destination_user,
                    created_at=m.created_at.isoformat() if hasattr(m.created_at, "isoformat") and m.created_at else "",
                )
                for m in messages
            ]





@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            text = await websocket.receive_text()
            
            try:
                # Parse the message the user submitted through the websocket
                parsed = json.loads(text)
                content = parsed.get("content")
                user_id = parsed.get("user_id")
                
                if not user_id:
                    raise HTTPException(status_code=400, detail="user_id is required in message payload")
                
                if not content:
                    raise HTTPException(status_code=400, detail="content is required in message payload")
                    
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Message must be valid JSON with 'content' and 'user_id' fields")
            
            async with AsyncSession(engine) as session:
                async with session.begin():
                    # Get the user by ID for user messages
                    user = await get_user_by_id(session, user_id)

                    # Get the Bot user ID
                    bot_user = await get_bot_user(session)
                    
                    user_msg = Message(role="user", content=content, origin_user=user.id, destination_user=bot_user.id)
                    session.add(user_msg)
                # Transaction committed on exiting session.begin()

            bot_text = generate_bot_reply()

            async with AsyncSession(engine) as session:
                async with session.begin():
                    user = await get_user_by_id(session, user_id)
                    bot_user = await get_bot_user(session)
                    bot_msg = Message(role="bot", content=bot_text, origin_user=bot_user.id, destination_user=user.id)
                    session.add(bot_msg)
                    
                    # Flush the INSERT statement to the database to get the auto-generated primary key (id)
                    # This executes the SQL but doesn't commit the transaction yet
                    await session.flush()
                    
                    # Refresh the object from the database to populate server-generated fields
                    # like created_at (if it has a default value) and ensure all fields are available
                    # for the response payload below
                    await session.refresh(bot_msg)

                    response_payload = {
                        "id": bot_msg.id,
                        "role": bot_msg.role,
                        "content": bot_msg.content,
                        "origin_user": bot_msg.origin_user,
                        "destination_user": bot_msg.destination_user,
                        "created_at": bot_msg.created_at.isoformat() if hasattr(bot_msg.created_at, "isoformat") and bot_msg.created_at else "",
                    }

            await websocket.send_json(response_payload)
    except WebSocketDisconnect:
        return
