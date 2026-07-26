"""Agendador de sync automático Thingiverse."""

import asyncio
import logging

from ..database import SessionLocal
from .settings_file import load_settings
from . import sync

logger = logging.getLogger(__name__)

SYNC_TIMEOUT = 300  # 5 minutos


async def run_scheduled_sync():
    """Loop principal: verifica settings a cada 60s e dispara sync se devido."""
    await asyncio.sleep(30)
    last_run = 0.0
    while True:
        try:
            settings = load_settings()
            interval = settings.thingiverse.sync_interval
            if interval > 0:
                db = SessionLocal()
                try:
                    results = await asyncio.wait_for(sync.sync_all(db), timeout=SYNC_TIMEOUT)
                    total = sum(r.downloaded + r.skipped + r.failed for r in results)
                    if total > 0:
                        logger.info("Sync automático concluído: %d coleções, %d things", len(results), total)
                except asyncio.TimeoutError:
                    logger.warning("Sync automático excedeu o tempo limite de %ds", SYNC_TIMEOUT)
                except Exception as e:
                    logger.error("Erro no sync automático: %s", e)
                finally:
                    db.close()
                last_run = asyncio.get_event_loop().time()
            await asyncio.sleep(60)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Erro no agendador de sync: %s", e)
            await asyncio.sleep(60)
