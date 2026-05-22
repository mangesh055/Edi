import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings
from sqlalchemy import text

async def add_column():
    engine = create_async_engine(settings.database_url, echo=True)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE data_sessions ADD COLUMN sandbox_code TEXT;"))
            print("Successfully added sandbox_code column.")
        except Exception as e:
            print(f"Error (maybe column already exists): {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(add_column())
