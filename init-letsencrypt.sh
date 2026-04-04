#!/bin/bash

# Obtain initial Let's Encrypt certificate for the streaming stack.
# Run this once before starting the full stack.
#
# Usage: ./init-letsencrypt.sh
#
# Requires: .env file with ICECAST_HOSTNAME and LETSENCRYPT_EMAIL set.

set -e

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$ICECAST_HOSTNAME" ]; then
    echo "Error: ICECAST_HOSTNAME not set in .env"
    exit 1
fi

EMAIL="${LETSENCRYPT_EMAIL:-}"
STAGING="${LETSENCRYPT_STAGING:-0}"

EMAIL_ARG=""
if [ -n "$EMAIL" ]; then
    EMAIL_ARG="--email $EMAIL"
else
    EMAIL_ARG="--register-unsafely-without-email"
fi

STAGING_ARG=""
if [ "$STAGING" = "1" ]; then
    STAGING_ARG="--staging"
    echo "Using Let's Encrypt staging environment (test certificates)"
fi

echo "Requesting certificate for: $ICECAST_HOSTNAME"

# Create required directories
mkdir -p certbot/conf certbot/www

# Start nginx with a temporary self-signed cert for the ACME challenge
echo "Creating temporary self-signed certificate..."
mkdir -p "certbot/conf/live/$ICECAST_HOSTNAME"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "certbot/conf/live/$ICECAST_HOSTNAME/privkey.pem" \
    -out "certbot/conf/live/$ICECAST_HOSTNAME/fullchain.pem" \
    -subj "/CN=localhost" 2>/dev/null

echo "Starting nginx for ACME challenge..."
docker compose up -d --no-deps nginx

echo "Removing temporary certificate..."
rm -rf "certbot/conf/live/$ICECAST_HOSTNAME"

echo "Requesting Let's Encrypt certificate..."
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    $EMAIL_ARG \
    $STAGING_ARG \
    --agree-tos \
    --no-eff-email \
    -d "$ICECAST_HOSTNAME"

echo "Reloading nginx with real certificate..."
docker compose exec nginx nginx -s reload

echo "Done! Certificate obtained for $ICECAST_HOSTNAME"
echo "Start the full stack with: docker compose up -d"
