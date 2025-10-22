"""Background scheduler for periodic tasks"""

import asyncio
import time
from collections.abc import Awaitable, Callable

from app.core.logging import logger


class BackgroundScheduler:
    """Asyncio-based scheduler for running periodic async tasks"""

    def __init__(self) -> None:
        self._tasks: list[tuple[Callable[[], Awaitable[None]], int]] = []
        self._task_handles: list[asyncio.Task[None]] = []
        self._running = False

    def add_task(self, task: Callable[[], Awaitable[None]], interval_seconds: int) -> None:
        """
        Add a task to run periodically.

        Args:
            task: Async function to call periodically
            interval_seconds: How often to run the task in seconds
        """
        self._tasks.append((task, interval_seconds))
        logger.info(
            "Scheduled background task",
            task=task.__name__,
            interval_seconds=interval_seconds,
        )

    def start(self) -> None:
        """Start all scheduled tasks in the current event loop"""
        if self._running:
            logger.warning("Scheduler already running")
            return

        self._running = True

        # Create background tasks for each scheduled task
        for task, interval in self._tasks:
            task_handle = asyncio.create_task(self._run_periodic(task, interval))
            self._task_handles.append(task_handle)

        logger.info("Background scheduler started")

    async def stop(self) -> None:
        """Cancel all running tasks and wait for them to finish"""
        if not self._running:
            logger.warning("Scheduler not running")
            return

        logger.info("Stopping background scheduler...")
        self._running = False

        # Cancel all task handles
        for task_handle in self._task_handles:
            task_handle.cancel()

        # Wait for all tasks to finish cancellation
        if self._task_handles:
            await asyncio.gather(*self._task_handles, return_exceptions=True)

        self._task_handles.clear()
        logger.info("Background scheduler stopped")

    async def _run_periodic(
        self,
        task: Callable[[], Awaitable[None]],
        interval_seconds: int,
    ) -> None:
        """
        Run a task periodically at the specified interval.

        Args:
            task: Async function to execute
            interval_seconds: Interval between executions in seconds
        """
        while self._running:
            try:
                await self._run_task(task)
            except asyncio.CancelledError:
                logger.info("Scheduled task cancelled", task=task.__name__)
                break
            except Exception as e:
                logger.error(
                    "Error running scheduled task",
                    task=task.__name__,
                    error=str(e),
                    exc_info=True,
                )

            # Wait for the interval before running again
            try:
                await asyncio.sleep(interval_seconds)
            except asyncio.CancelledError:
                logger.info("Scheduled task cancelled during sleep", task=task.__name__)
                break

    async def _run_task(self, task: Callable[[], Awaitable[None]]) -> None:
        """
        Run a single task and log its execution.

        Args:
            task: Async function to execute
        """
        start_time = time.time()
        logger.debug("Running scheduled task", task=task.__name__)

        try:
            await task()
            elapsed = time.time() - start_time
            logger.debug(
                "Scheduled task completed",
                task=task.__name__,
                elapsed_seconds=round(elapsed, 2),
            )
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(
                "Scheduled task failed",
                task=task.__name__,
                elapsed_seconds=round(elapsed, 2),
                error=str(e),
                exc_info=True,
            )
            raise


# Global scheduler instance
scheduler = BackgroundScheduler()
