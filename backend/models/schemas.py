from pydantic import BaseModel


class UserRead(BaseModel):
    id: int
    name: str


class MessageRead(BaseModel):
    id: int
    role: str
    content: str
    user_id: int
    created_at: str
