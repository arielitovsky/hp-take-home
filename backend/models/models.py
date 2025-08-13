from pydantic import BaseModel


class UserRead(BaseModel):
    id: int
    name: str


class MessageRead(BaseModel):
    id: int
    role: str
    content: str
    origin_user: int
    destination_user: int
    created_at: str
