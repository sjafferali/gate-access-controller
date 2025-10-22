"""Background scheduler for periodic tasks"""

import asyncio
import threading
import time
from collections.abc import Awaitable, Callable

from app.core.logging import logger


class BackgroundScheduler:
    """Simple thread-based scheduler for running periodic async tasks"""

    def __init__(self) -> None:
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._tasks: list[tuple[Callable[[], Awaitable[None]], int]] = []

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
        """Start the scheduler in a background thread"""
        if self._thread is not None and self._thread.is_alive():
            logger.warning("Scheduler already running")
            return

        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        logger.info("Background scheduler started")

    def stop(self) -> None:
        """Stop the scheduler and wait for the thread to finish"""
        if self._thread is None or not self._thread.is_alive():
            logger.warning("Scheduler not running")
            return

        logger.info("Stopping background scheduler...")
        self._stop_event.set()
        self._thread.join(timeout=10)
        logger.info("Background scheduler stopped")

    def _run(self) -> None:
        """Main loop that runs in the background thread"""
        # Track next run time for each task
        next_run_times = {i: time.time() for i in range(len(self._tasks))}

        while not self._stop_event.is_set():
            current_time = time.time()

            # Check each task to see if it's time to run
            for idx, (task, interval) in enumerate(self._tasks):
                if current_time >= next_run_times[idx]:
                    try:
                        # Run the async task in a new event loop
                        asyncio.run(self._run_task(task))
                        next_run_times[idx] = current_time + interval
                    except Exception as e:
                        logger.error(
                            "Error running scheduled task",
                            task=task.__name__,
                            error=str(e),
                            exc_info=True,
                        )
                        # Still update next run time to avoid tight error loops
                        next_run_times[idx] = current_time + interval

            # Sleep for a short time before checking again
            # Use a small sleep to allow responsive shutdown
            self._stop_event.wait(timeout=1)

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
