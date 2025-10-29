#!/usr/bin/env python3
"""Test script to verify rate limiting functionality for access links"""

import time
import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
ADMIN_USERNAME = "admin"  # Update with your admin credentials
ADMIN_PASSWORD = "admin"  # Update with your admin password

def get_auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        }
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Failed to authenticate: {response.status_code} - {response.text}")
        return None

def create_test_link(token):
    """Create a test access link"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Create a link that's valid for 1 hour
    expiration = datetime.utcnow() + timedelta(hours=1)

    link_data = {
        "name": "Rate Limiting Test Link",
        "notes": "This link is for testing rate limiting",
        "purpose": "OTHER",
        "active_on": datetime.utcnow().isoformat() + "Z",
        "expiration": expiration.isoformat() + "Z",
        "auto_open": False
    }

    response = requests.post(
        f"{BASE_URL}/links",
        headers=headers,
        json=link_data
    )

    if response.status_code == 200:
        link = response.json()
        print(f"✅ Created test link: {link['name']} (Code: {link['link_code']})")
        return link['link_code']
    else:
        print(f"Failed to create link: {response.status_code} - {response.text}")
        return None

def test_rate_limiting(link_code):
    """Test the rate limiting functionality"""
    print(f"\n🔧 Testing rate limiting for link code: {link_code}")
    print("-" * 50)

    # First request - should succeed
    print("\n📡 Request #1 (Initial request):")
    response = requests.post(f"{BASE_URL}/validate/{link_code}/access")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   ✅ Access GRANTED: {response.json()['message']}")
    else:
        print(f"   ❌ Access DENIED: {response.json().get('detail', 'Unknown error')}")

    # Second request immediately - should be rate limited
    print("\n📡 Request #2 (Immediate retry - should be rate limited):")
    time.sleep(1)  # Small delay to ensure the timestamp is different
    response = requests.post(f"{BASE_URL}/validate/{link_code}/access")
    print(f"   Status: {response.status_code}")
    if response.status_code == 403:
        detail = response.json().get('detail', 'Unknown error')
        if 'recently used' in detail.lower() or 'wait' in detail.lower():
            print(f"   ✅ Rate limiting working! Message: {detail}")
        else:
            print(f"   ⚠️ Access denied but not due to rate limiting: {detail}")
    elif response.status_code == 200:
        print(f"   ❌ Rate limiting NOT working - access was granted!")
    else:
        print(f"   ❓ Unexpected response: {response.json()}")

    # Wait and show countdown
    print("\n⏳ Waiting 60 seconds for rate limit to expire...")
    for i in range(60, 0, -10):
        print(f"   {i} seconds remaining...")
        time.sleep(10)

    # Third request after 60 seconds - should succeed
    print("\n📡 Request #3 (After 60 seconds - should succeed):")
    response = requests.post(f"{BASE_URL}/validate/{link_code}/access")
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   ✅ Access GRANTED after rate limit expired: {response.json()['message']}")
    else:
        print(f"   ❌ Unexpected denial: {response.json().get('detail', 'Unknown error')}")

    # Fourth request immediately after third - should be rate limited again
    print("\n📡 Request #4 (Immediate retry after success - should be rate limited):")
    time.sleep(1)
    response = requests.post(f"{BASE_URL}/validate/{link_code}/access")
    print(f"   Status: {response.status_code}")
    if response.status_code == 403:
        detail = response.json().get('detail', 'Unknown error')
        if 'recently used' in detail.lower() or 'wait' in detail.lower():
            print(f"   ✅ Rate limiting still working! Message: {detail}")
        else:
            print(f"   ⚠️ Access denied but not due to rate limiting: {detail}")
    elif response.status_code == 200:
        print(f"   ❌ Rate limiting NOT working - access was granted!")
    else:
        print(f"   ❓ Unexpected response: {response.json()}")

def cleanup_test_link(token, link_code):
    """Delete the test link"""
    headers = {
        "Authorization": f"Bearer {token}"
    }

    # First, get the link ID
    response = requests.get(
        f"{BASE_URL}/links",
        headers=headers,
        params={"search": link_code}
    )

    if response.status_code == 200:
        links = response.json()["items"]
        if links:
            link_id = links[0]["id"]
            # Delete the link
            delete_response = requests.delete(
                f"{BASE_URL}/links/{link_id}",
                headers=headers
            )
            if delete_response.status_code == 200:
                print(f"\n🗑️  Cleaned up test link")
            else:
                print(f"\n⚠️  Failed to delete test link")

def main():
    print("=" * 60)
    print("         ACCESS LINK RATE LIMITING TEST")
    print("=" * 60)

    print("\n⚡ Starting Gate Access Controller rate limiting test...")
    print("This test will verify that links cannot be used more than")
    print("once within a 60-second timeframe.")

    # Get auth token
    print("\n🔐 Authenticating...")
    token = get_auth_token()
    if not token:
        print("❌ Authentication failed. Please check your credentials.")
        return

    print("✅ Authentication successful!")

    # Create test link
    link_code = create_test_link(token)
    if not link_code:
        print("❌ Failed to create test link")
        return

    try:
        # Run the rate limiting test
        test_rate_limiting(link_code)

        print("\n" + "=" * 60)
        print("✅ Rate limiting test completed successfully!")
        print("=" * 60)

    finally:
        # Clean up
        cleanup_test_link(token, link_code)

if __name__ == "__main__":
    main()