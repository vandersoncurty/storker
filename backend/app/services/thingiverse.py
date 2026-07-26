"""Client API Thingiverse - busca collections, things, detalhes e download de STLs."""

import configparser

import httpx

from ..config import THINGIVERSE_APP_TOKEN, THINGIVERSE_BASE_URL, DATA_DIR

LONG_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
SHORT_TIMEOUT = httpx.Timeout(15.0, connect=5.0)


def _load_settings_token() -> str:
    settings_path = DATA_DIR / "config" / "storker.conf"
    if settings_path.exists():
        parser = configparser.ConfigParser()
        parser.read(settings_path)
        token = parser.get("thingiverse", "app_token", fallback="")
        if token:
            return token
    return ""


def _get_token() -> str:
    settings_token = _load_settings_token()
    return settings_token or THINGIVERSE_APP_TOKEN


def _headers() -> dict:
    return {"Authorization": f"Bearer {_get_token()}"}


async def get_collection_things(collection_id: int, page: int = 1, per_page: int = 30) -> list:
    async with httpx.AsyncClient(timeout=SHORT_TIMEOUT) as client:
        resp = await client.get(
            f"{THINGIVERSE_BASE_URL}/collections/{collection_id}/things",
            headers=_headers(),
            params={"page": page, "per_page": per_page},
        )
        resp.raise_for_status()
        return resp.json()


async def get_thing(thing_id: int) -> dict:
    async with httpx.AsyncClient(timeout=SHORT_TIMEOUT) as client:
        resp = await client.get(
            f"{THINGIVERSE_BASE_URL}/things/{thing_id}",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def get_thing_files(thing_id: int) -> list:
    async with httpx.AsyncClient(timeout=SHORT_TIMEOUT) as client:
        resp = await client.get(
            f"{THINGIVERSE_BASE_URL}/things/{thing_id}/files",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def get_thing_images(thing_id: int) -> list:
    async with httpx.AsyncClient(timeout=SHORT_TIMEOUT) as client:
        resp = await client.get(
            f"{THINGIVERSE_BASE_URL}/things/{thing_id}/images",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def download_file(download_url: str) -> bytes:
    async with httpx.AsyncClient(follow_redirects=True, timeout=LONG_TIMEOUT) as client:
        resp = await client.get(download_url, headers=_headers())
        resp.raise_for_status()
        return resp.content


async def get_user_collections(username: str) -> list:
    async with httpx.AsyncClient(timeout=SHORT_TIMEOUT) as client:
        resp = await client.get(
            f"{THINGIVERSE_BASE_URL}/users/{username}/collections",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()
