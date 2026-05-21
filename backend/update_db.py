import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings
from sqlalchemy import text

async def add_user_id_column():
    engine = create_async_engine(settings.database_url, echo=True)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE data_sessions ADD COLUMN user_id VARCHAR(255);"))
            await conn.execute(text("CREATE INDEX ix_data_sessions_user_id ON data_sessions (user_id);"))
            print("Successfully added user_id column.")
        except Exception as e:
            print(f"Error (maybe column already exists): {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(add_user_id_column())
