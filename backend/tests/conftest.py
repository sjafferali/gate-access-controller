"""Pytest configuration and fixtures"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client() -> TestClient:
    """Create a test client"""
    # Import app fresh each time to avoid middleware issues
    from app.main import app

    # Simpler approach: just set the headers to match allowed host
    test_client = TestClient(app, base_url="http://localhost")
    return test_client
