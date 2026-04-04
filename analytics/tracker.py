"""
Breeze Radio — Icecast Listener Analytics → PostHog

Polls Icecast stats endpoint and sends listener metrics to PostHog.
"""

import json
import os
import sys
import time

import posthog
import requests

# Configuration
ICECAST_URL = os.getenv("ICECAST_URL", "http://icecast:8000")
ICECAST_ADMIN_USER = os.getenv("ICECAST_ADMIN_USER", "admin")
ICECAST_ADMIN_PASSWORD = os.getenv("ICECAST_ADMIN_PASSWORD", "changeme")
POSTHOG_API_KEY = os.getenv("POSTHOG_API_KEY", "")
POSTHOG_HOST = os.getenv("POSTHOG_HOST", "https://posthog.sonicverse.eu")
POLL_INTERVAL = int(os.getenv("POSTHOG_POLL_INTERVAL", "30"))
DISTINCT_ID = "breezeradio-streaming-stack"

# Initialize PostHog
posthog.project_api_key = POSTHOG_API_KEY
posthog.host = POSTHOG_HOST

# Track previous state for failover detection
previous_sources = {}


def fetch_icecast_stats():
    """Fetch stats from Icecast status-json.xsl endpoint."""
    try:
        resp = requests.get(
            f"{ICECAST_URL}/status-json.xsl",
            auth=(ICECAST_ADMIN_USER, ICECAST_ADMIN_PASSWORD),
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[analytics] Failed to fetch Icecast stats: {e}", file=sys.stderr)
        return None


def parse_sources(stats):
    """Extract source/mount information from Icecast stats JSON."""
    icestats = stats.get("icestats", {})
    sources = icestats.get("source", [])

    # Icecast returns a single dict if only one source, list if multiple
    if isinstance(sources, dict):
        sources = [sources]

    return sources


def track_listeners(sources):
    """Send per-mount listener counts to PostHog."""
    total_listeners = 0

    for source in sources:
        mount = source.get("listenurl", "unknown")
        # Extract just the mount path
        if "/" in mount:
            mount = "/" + mount.split("/", 3)[-1] if mount.count("/") >= 3 else mount

        listeners = source.get("listeners", 0)
        total_listeners += listeners

        posthog.capture(
            distinct_id=DISTINCT_ID,
            event="stream_listeners",
            properties={
                "mount": mount,
                "listeners": listeners,
                "peak_listeners": source.get("listener_peak", 0),
                "genre": source.get("genre", ""),
                "title": source.get("title", ""),
                "audio_info": source.get("audio_info", ""),
                "server_name": source.get("server_name", ""),
            },
        )

    posthog.capture(
        distinct_id=DISTINCT_ID,
        event="stream_total_listeners",
        properties={
            "total_listeners": total_listeners,
            "active_mounts": len(sources),
        },
    )


def track_source_status(sources):
    """Detect and report source connect/disconnect (failover) events."""
    global previous_sources

    current_mounts = {s.get("listenurl", "unknown") for s in sources}
    prev_mounts = set(previous_sources.keys())

    # Detect new sources
    for mount in current_mounts - prev_mounts:
        posthog.capture(
            distinct_id=DISTINCT_ID,
            event="stream_source_connected",
            properties={"mount": mount},
        )
        print(f"[analytics] Source connected: {mount}")

    # Detect disconnected sources
    for mount in prev_mounts - current_mounts:
        posthog.capture(
            distinct_id=DISTINCT_ID,
            event="stream_source_disconnected",
            properties={"mount": mount},
        )
        print(f"[analytics] Source disconnected: {mount}")

    # Update state
    previous_sources = {s.get("listenurl", "unknown"): s for s in sources}


def main():
    if not POSTHOG_API_KEY:
        print("[analytics] POSTHOG_API_KEY not set, exiting.", file=sys.stderr)
        sys.exit(1)

    print(f"[analytics] Starting Icecast → PostHog tracker")
    print(f"[analytics] Polling {ICECAST_URL} every {POLL_INTERVAL}s")
    print(f"[analytics] Sending events to {POSTHOG_HOST}")

    while True:
        stats = fetch_icecast_stats()

        if stats:
            sources = parse_sources(stats)
            track_listeners(sources)
            track_source_status(sources)
            posthog.flush()

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
