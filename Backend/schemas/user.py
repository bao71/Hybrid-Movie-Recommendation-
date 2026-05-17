from pydantic import BaseModel


class RegisterRequest(BaseModel):
    username: str | None = None
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str