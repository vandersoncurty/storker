"""Testes para os serviços de integração (Moonraker, Spoolman, Thingiverse).

Usa mocking para simular respostas HTTP sem depender de servidores externos.
"""

import pytest
import httpx
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_moonraker_get_url_fallback():
    from app.services.moonraker import _get_url
    url = _get_url()
    assert url.startswith("http")


@pytest.mark.asyncio
async def test_moonraker_get_printer_info_offline():
    from app.services.moonraker import get_printer_info
    with patch("app.services.moonraker._get_url", return_value="http://localhost:1"):
        with pytest.raises(httpx.ConnectError):
            await get_printer_info()


@pytest.mark.asyncio
async def test_moonraker_get_print_stats_offline():
    from app.services.moonraker import get_print_stats
    with patch("app.services.moonraker._get_url", return_value="http://localhost:1"):
        with pytest.raises(httpx.ConnectError):
            await get_print_stats()


@pytest.mark.asyncio
async def test_moonraker_cancel_print_offline():
    from app.services.moonraker import cancel_print
    with patch("app.services.moonraker._get_url", return_value="http://localhost:1"):
        with pytest.raises(httpx.ConnectError):
            await cancel_print()


@pytest.mark.asyncio
async def test_moonraker_pause_print_offline():
    from app.services.moonraker import pause_print
    with patch("app.services.moonraker._get_url", return_value="http://localhost:1"):
        with pytest.raises(httpx.ConnectError):
            await pause_print()


@pytest.mark.asyncio
async def test_moonraker_resume_print_offline():
    from app.services.moonraker import resume_print
    with patch("app.services.moonraker._get_url", return_value="http://localhost:1"):
        with pytest.raises(httpx.ConnectError):
            await resume_print()


@pytest.mark.asyncio
async def test_moonraker_upload_file_offline():
    from app.services.moonraker import upload_file_to_moonraker
    import tempfile, os
    tmp = tempfile.NamedTemporaryFile(suffix=".gcode", delete=False)
    tmp.write(b"G28\n")
    tmp.close()
    with patch("app.services.moonraker._get_url", return_value="http://localhost:1"):
        with pytest.raises(httpx.ConnectError):
            await upload_file_to_moonraker("test.gcode", tmp.name)
    os.unlink(tmp.name)


@pytest.mark.asyncio
async def test_spoolman_list_spools_offline():
    from app.services.spoolman import list_spools
    with patch("app.services.spoolman._get_url", return_value="http://localhost:1"):
        with pytest.raises(httpx.ConnectError):
            await list_spools()


@pytest.mark.asyncio
async def test_spoolman_get_spool_offline():
    from app.services.spoolman import get_spool
    with patch("app.services.spoolman._get_url", return_value="http://localhost:1"):
        with pytest.raises(httpx.ConnectError):
            await get_spool(1)


@pytest.mark.asyncio
async def test_spoolman_list_filaments_offline():
    from app.services.spoolman import list_filaments
    with patch("app.services.spoolman._get_url", return_value="http://localhost:1"):
        with pytest.raises(httpx.ConnectError):
            await list_filaments()


@pytest.mark.asyncio
async def test_thingiverse_get_url():
    from app.services.thingiverse import THINGIVERSE_BASE_URL
    assert THINGIVERSE_BASE_URL == "https://api.thingiverse.com"


@pytest.mark.asyncio
async def test_thingiverse_get_token():
    from app.services.thingiverse import _get_token
    token = _get_token()
    assert isinstance(token, str)
    assert len(token) > 0


@pytest.mark.asyncio
async def test_thingiverse_get_collection_things_offline():
    from app.services.thingiverse import get_collection_things
    assert callable(get_collection_things)


@pytest.mark.asyncio
async def test_thingiverse_get_thing_offline():
    from app.services.thingiverse import get_thing
    assert callable(get_thing)


@pytest.mark.asyncio
async def test_spoolman_get_filament_usage_offline():
    from app.services.spoolman import get_filament_usage
    with patch("app.services.spoolman._get_url", return_value="http://localhost:1"):
        with pytest.raises(httpx.ConnectError):
            await get_filament_usage(1)


@pytest.mark.asyncio
async def test_moonraker_get_job_queue_offline():
    from app.services.moonraker import get_job_queue
    with patch("app.services.moonraker._get_url", return_value="http://localhost:1"):
        with pytest.raises(httpx.ConnectError):
            await get_job_queue()


@pytest.mark.asyncio
async def test_moonraker_get_directory_offline():
    from app.services.moonraker import get_directory
    with patch("app.services.moonraker._get_url", return_value="http://localhost:1"):
        with pytest.raises(httpx.ConnectError):
            await get_directory()


@pytest.mark.asyncio
async def test_moonraker_start_print_offline():
    from app.services.moonraker import start_print
    with patch("app.services.moonraker._get_url", return_value="http://localhost:1"):
        with pytest.raises(httpx.ConnectError):
            await start_print("test.gcode")


@pytest.mark.asyncio
async def test_moonraker_post_job_queue_offline():
    from app.services.moonraker import post_job_queue
    with patch("app.services.moonraker._get_url", return_value="http://localhost:1"):
        with pytest.raises(httpx.ConnectError):
            await post_job_queue("test.gcode")
