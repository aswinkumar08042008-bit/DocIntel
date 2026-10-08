"""Start the API with:  uvicorn app.main:app --reload"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api import routes_analysis, routes_documents, routes_sessions
from app.config import get_settings
from app.database.db import create_tables
from app.errors import AppError

logger = logging.getLogger("docinsight")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        create_tables()
    except Exception:
        logger.exception("Database is not reachable. Analysis works, but saving will fail.")
    yield


app = FastAPI(title="DocInsight API", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://doc-intel-git-main-tech-builders3.vercel.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
for router in (routes_documents.router, routes_analysis.router, routes_sessions.router):
    app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok"}


# Friendly errors: users never see stack traces (details go to the server log only).
@app.exception_handler(AppError)
async def app_error_handler(request: Request, error: AppError):
    return JSONResponse({"detail": error.message}, status_code=error.status_code)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, error: RequestValidationError):
    return JSONResponse({"detail": "Something in the request was not valid. Please check and try again."}, status_code=422)


@app.exception_handler(Exception)
async def unexpected_handler(request: Request, error: Exception):
    logger.exception("Unexpected error")
    return JSONResponse({"detail": "Something went wrong on our side. Please try again."}, status_code=500)
