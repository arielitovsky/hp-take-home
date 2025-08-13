from sqlalchemy import String, DateTime, func, Text, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from datetime import datetime


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    
    # Relationships to messages
    sent_messages: Mapped[list["Message"]] = relationship("Message", foreign_keys="Message.origin_user", back_populates="origin_user_rel")
    received_messages: Mapped[list["Message"]] = relationship("Message", foreign_keys="Message.destination_user", back_populates="destination_user_rel")

    def __repr__(self) -> str:
        return f"User(id={self.id!r}, name={self.name!r})"


class Message(Base):
    __tablename__ = "message"

    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str] = mapped_column(String(10))  # 'user' or 'bot'
    content: Mapped[str] = mapped_column(Text())
    origin_user: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    destination_user: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships to users
    origin_user_rel: Mapped[User] = relationship("User", foreign_keys=[origin_user], back_populates="sent_messages")
    destination_user_rel: Mapped[User] = relationship("User", foreign_keys=[destination_user], back_populates="received_messages")
