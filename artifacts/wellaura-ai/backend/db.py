import os
from typing import Any

import asyncpg

pool: asyncpg.Pool | None = None


async def connect() -> None:
    global pool
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL must be configured for private wellness storage.")
    if dsn.startswith("postgres://"):
        dsn = "postgresql://" + dsn[len("postgres://") :]
    pool = await asyncpg.create_pool(dsn=dsn, min_size=1, max_size=5)


async def disconnect() -> None:
    global pool
    if pool:
        await pool.close()
        pool = None


def get_pool() -> asyncpg.Pool:
    if pool is None:
        raise RuntimeError("The wellness database is not connected.")
    return pool


async def insert_record(
    owner_id: str,
    profile_id: str,
    kind: str,
    record_id: str,
    encrypted_payload: str,
    parent_id: str | None = None,
) -> dict[str, Any]:
    db = get_pool()
    async with db.acquire() as connection:
        row = await connection.fetchrow(
            """
            INSERT INTO wellaura_records
                (id, owner_id, profile_id, kind, parent_id, encrypted_payload)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, owner_id, profile_id, kind, parent_id,
                      encrypted_payload, created_at, updated_at
            """,
            record_id,
            owner_id,
            profile_id,
            kind,
            parent_id,
            encrypted_payload,
        )
    return dict(row)


async def get_record(owner_id: str, record_id: str, kind: str | None = None) -> dict[str, Any] | None:
    db = get_pool()
    async with db.acquire() as connection:
        if kind is None:
            row = await connection.fetchrow(
                """
                SELECT id, owner_id, profile_id, kind, parent_id,
                       encrypted_payload, created_at, updated_at
                FROM wellaura_records
                WHERE owner_id = $1 AND id = $2
                """,
                owner_id,
                record_id,
            )
        else:
            row = await connection.fetchrow(
                """
                SELECT id, owner_id, profile_id, kind, parent_id,
                       encrypted_payload, created_at, updated_at
                FROM wellaura_records
                WHERE owner_id = $1 AND id = $2 AND kind = $3
                """,
                owner_id,
                record_id,
                kind,
            )
    return dict(row) if row else None


async def list_records(
    owner_id: str,
    kind: str,
    profile_id: str | None = None,
) -> list[dict[str, Any]]:
    db = get_pool()
    async with db.acquire() as connection:
        if profile_id is None:
            rows = await connection.fetch(
                """
                SELECT id, owner_id, profile_id, kind, parent_id,
                       encrypted_payload, created_at, updated_at
                FROM wellaura_records
                WHERE owner_id = $1 AND kind = $2
                ORDER BY created_at
                """,
                owner_id,
                kind,
            )
        else:
            rows = await connection.fetch(
                """
                SELECT id, owner_id, profile_id, kind, parent_id,
                       encrypted_payload, created_at, updated_at
                FROM wellaura_records
                WHERE owner_id = $1 AND kind = $2 AND profile_id = $3
                ORDER BY created_at
                """,
                owner_id,
                kind,
                profile_id,
            )
    return [dict(row) for row in rows]


async def update_record(
    owner_id: str,
    record_id: str,
    kind: str,
    encrypted_payload: str,
) -> dict[str, Any] | None:
    db = get_pool()
    async with db.acquire() as connection:
        row = await connection.fetchrow(
            """
            UPDATE wellaura_records
            SET encrypted_payload = $4, updated_at = NOW()
            WHERE owner_id = $1 AND id = $2 AND kind = $3
            RETURNING id, owner_id, profile_id, kind, parent_id,
                      encrypted_payload, created_at, updated_at
            """,
            owner_id,
            record_id,
            kind,
            encrypted_payload,
        )
    return dict(row) if row else None


async def delete_record(owner_id: str, record_id: str, kind: str | None = None) -> bool:
    db = get_pool()
    async with db.acquire() as connection:
        if kind is None:
            status = await connection.execute(
                "DELETE FROM wellaura_records WHERE owner_id = $1 AND id = $2",
                owner_id,
                record_id,
            )
        else:
            status = await connection.execute(
                "DELETE FROM wellaura_records WHERE owner_id = $1 AND id = $2 AND kind = $3",
                owner_id,
                record_id,
                kind,
            )
    return not status.endswith(" 0")


async def delete_profile_records(owner_id: str, profile_id: str) -> None:
    db = get_pool()
    async with db.acquire() as connection:
        await connection.execute(
            "DELETE FROM wellaura_records WHERE owner_id = $1 AND profile_id = $2",
            owner_id,
            profile_id,
        )


async def delete_user_records(owner_id: str) -> None:
    db = get_pool()
    async with db.acquire() as connection:
        await connection.execute(
            "DELETE FROM wellaura_records WHERE owner_id = $1",
            owner_id,
        )


async def delete_children(owner_id: str, parent_id: str) -> None:
    db = get_pool()
    async with db.acquire() as connection:
        await connection.execute(
            "DELETE FROM wellaura_records WHERE owner_id = $1 AND parent_id = $2",
            owner_id,
            parent_id,
        )
