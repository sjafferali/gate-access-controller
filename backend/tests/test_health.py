"""Simple health check endpoint test"""

from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient) -> None:
    """Test the /health endpoint returns healthy status"""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data
