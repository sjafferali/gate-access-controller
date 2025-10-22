"""Service for handling webhook calls to the gate controller"""

import time
from typing import Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.logging import logger


class WebhookService:
    """Service for triggering gate control webhooks"""

    def __init__(self):
        self.webhook_url = settings.GATE_WEBHOOK_URL
        self.webhook_token = settings.GATE_WEBHOOK_TOKEN
        self.timeout = settings.GATE_WEBHOOK_TIMEOUT
        self.open_duration = settings.GATE_OPEN_DURATION_SECONDS

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def trigger_gate_open(self) -> int:
        """
        Trigger the gate opening webhook.

        Returns:
            int: Response time in milliseconds
        """
        if not self.webhook_url:
            logger.warning("Gate webhook URL not configured, simulating success")
            return 0

        start_time = time.time()

        try:
            async with httpx.AsyncClient() as client:
                headers = {}
                if self.webhook_token:
                    headers["Authorization"] = f"Bearer {self.webhook_token}"

                response = await client.post(
                    self.webhook_url,
                    headers=headers,
                    json={
                        "action": "open",
                        "duration_seconds": self.open_duration,
                        "source": "gate-access-controller",
                    },
                    timeout=self.timeout,
                )

                response_time_ms = int((time.time() - start_time) * 1000)

                if response.status_code not in (200, 201, 202, 204):
                    logger.error(
                        "Gate webhook returned error",
                        status_code=response.status_code,
                        response_text=response.text,
                        response_time_ms=response_time_ms,
                    )
                    raise Exception(f"Gate webhook failed with status {response.status_code}")

                logger.info(
                    "Gate webhook triggered successfully",
                    response_time_ms=response_time_ms,
                )

                return response_time_ms

        except httpx.TimeoutException as e:
            response_time_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "Gate webhook timeout",
                error=str(e),
                timeout_seconds=self.timeout,
                response_time_ms=response_time_ms,
            )
            raise Exception("Gate control system timeout")

        except httpx.RequestError as e:
            response_time_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "Gate webhook request error",
                error=str(e),
                response_time_ms=response_time_ms,
            )
            raise Exception("Failed to connect to gate control system")

        except Exception as e:
            response_time_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "Unexpected gate webhook error",
                error=str(e),
                response_time_ms=response_time_ms,
            )
            raise

    async def test_webhook(self) -> tuple[bool, str, Optional[int]]:
        """
        Test the gate webhook connection.

        Returns:
            tuple: (success, message, response_time_ms)
        """
        if not self.webhook_url:
            return False, "Webhook URL not configured", None

        try:
            # Use a shorter timeout for testing
            start_time = time.time()

            async with httpx.AsyncClient() as client:
                headers = {}
                if self.webhook_token:
                    headers["Authorization"] = f"Bearer {self.webhook_token}"

                response = await client.get(
                    self.webhook_url.replace("/open", "/health"),
                    headers=headers,
                    timeout=5.0,
                )

                response_time_ms = int((time.time() - start_time) * 1000)

                if response.status_code == 200:
                    return True, "Webhook is accessible", response_time_ms
                else:
                    return (
                        False,
                        f"Webhook returned status {response.status_code}",
                        response_time_ms,
                    )

        except httpx.TimeoutException:
            return False, "Webhook timeout", None
        except httpx.RequestError as e:
            return False, f"Connection error: {str(e)}", None
        except Exception as e:
            return False, f"Unexpected error: {str(e)}", None