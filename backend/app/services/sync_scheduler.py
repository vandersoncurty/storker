"""Agendador de sync automático Thingiverse.

Executa sync de todas as collections configuradas no intervalo
definido em settings.thingiverse.sync_interval (minutos).
Executa apenas se sync_interval > 0.
"""

import asyncio
import logging

from ..database import SessionLocal
from .settings_file import load_settings
from . import sync

logger = logging.getLogger(__name__)


async def run_scheduled_sync():
    """Loop principal: verifica settings a cada 60s e dispara sync se devido."""
    last_run = 0.0
    while True:
        try:
            settings = load_settings()
            interval = settings.thingiverse.sync_interval
            if interval > 0:
                db = SessionLocal()
                try:
                    results = await sync.sync_all(db)
                    total = sum(r.downloaded + r.skipped + r.failed for r in results)
                    if total > 0:
                        logger.info("Sync automático concluído: %d coleções, %d things", len(results), total)
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
