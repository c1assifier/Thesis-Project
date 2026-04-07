from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)


class AuthResponse(BaseModel):
    id: int
    name: str
