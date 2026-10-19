import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine, SessionLocal
from . import models
from .auth import hash_password
from .routers import auth_routes, patients, cases, analytics

SEED_USERS = [
    ("admin", "Admin User", "admin123", "admin"),
    ("doctor", "Dr. Anjali Rao", "doctor123", "doctor"),
    ("nurse", "Nurse Priya", "nurse123", "nurse"),
]


def seed():
    db = SessionLocal()
    try:
        for username, full, pw, role in SEED_USERS:
            if not db.query(models.User).filter_by(username=username).first():
                db.add(models.User(username=username, full_name=full,
                                   hashed_password=hash_password(pw), role=role))
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed()
    if os.getenv("SEED_DEMO", "").lower() in ("1", "true", "yes"):
        from .demo import load_demo
        db = SessionLocal()
        try:
            load_demo(db)
        finally:
            db.close()
    yield


app = FastAPI(title="Patient Case-Taking Software", version="1.0.0",
              description="Structured clinical case-taking with automatic triage and red-flag alerts.",
              lifespan=lifespan)
# Comma-separated list in CORS_ORIGINS; "*" (default) is fine because auth uses a Bearer header, not cookies.
ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["*"], allow_headers=["*"])

for r in (auth_routes.router, patients.router, cases.router, analytics.router):
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"status": "ok"}
