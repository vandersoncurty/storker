"""Client API Thingiverse - busca collections, things, detalhes e download de STLs."""

import httpx

from ..config import THINGIVERSE_APP_TOKEN, THINGIVERSE_BASE_URL


def _headers() -> dict:
    return {"Authorization": f"Bearer {THINGIVERSE_APP_TOKEN}"}


async def get_collection_things(collection_id: int, page: int = 1, per_page: int = 30) -> list:
    """Lista things de uma collection."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{THINGIVERSE_BASE_URL}/collections/{collection_id}/things",
            headers=_headers(),
            params={"page": page, "per_page": per_page},
        )
        resp.raise_for_status()
        return resp.json()


async def get_thing(thing_id: int) -> dict:
    """Busca detalhes de um thing (nome, descrição, imagens)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{THINGIVERSE_BASE_URL}/things/{thing_id}",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def get_thing_files(thing_id: int) -> list:
    """Lista arquivos de um thing."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{THINGIVERSE_BASE_URL}/things/{thing_id}/files",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def get_thing_images(thing_id: int) -> list:
    """Lista imagens de um thing."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{THINGIVERSE_BASE_URL}/things/{thing_id}/images",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def download_file(download_url: str) -> bytes:
    """Baixa um arquivo pela URL."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.get(download_url, headers=_headers())
        resp.raise_for_status()
        return resp.content


async def get_user_collections(username: str) -> list:
    """Lista collections de um usuário."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{THINGIVERSE_BASE_URL}/users/{username}/collections",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()
