import os

class Settings:
    PROJECT_NAME: str = "Real-Time Interactive Quiz & Examination Platform"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-exam-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # SQLite async default for instant local execution, or PostgreSQL if DATABASE_URL provided
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./exam_platform.db")
    
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.abspath("uploads"))
    SAMPLE_PAPERS_DIR: str = os.getenv("SAMPLE_PAPERS_DIR", os.path.abspath("sample_papers"))
    
    ADMIN_DEFAULT_USER: str = os.getenv("ADMIN_DEFAULT_USER", "admin")
    ADMIN_DEFAULT_PASSWORD: str = os.getenv("ADMIN_DEFAULT_PASSWORD", "AdminPass@2026")
    
    # 4 Participants
    PARTICIPANTS = [
        {"id": "P001", "name": "Participant 01 (Alice)", "default_pw": "Pass@P001"},
        {"id": "P002", "name": "Participant 02 (Bob)", "default_pw": "Pass@P002"},
        {"id": "P003", "name": "Participant 03 (Charlie)", "default_pw": "Pass@P003"},
        {"id": "P004", "name": "Participant 04 (Diana)", "default_pw": "Pass@P004"},
    ]

settings = Settings()
