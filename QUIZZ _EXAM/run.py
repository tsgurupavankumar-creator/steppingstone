import asyncio
import os
import sys
import uvicorn

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.seed import seed_database

def main():
    print("================================================================")
    print("  REAL-TIME INTERACTIVE QUIZ & EXAMINATION PLATFORM")
    print("================================================================")
    
    # 1. Run database initialization and user seeding
    print("\n[1/2] Verifying database and user seeding...")
    asyncio.run(seed_database())

    # 2. Start Uvicorn Server
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "127.0.0.1")

    print(f"\n[2/2] Launching application on http://{host}:{port}")
    print(f"      - Web Application: http://{host}:{port}/")
    print(f"      - API Documentation (Swagger): http://{host}:{port}/docs")
    print("      - Admin Account: admin / AdminPass@2026")
    print("      - 4 Participant Accounts: P001..P004 (Pass@P001 .. Pass@P004)\n")

    uvicorn.run("backend.app.main:app", host=host, port=port, log_level="info")

if __name__ == "__main__":
    main()
