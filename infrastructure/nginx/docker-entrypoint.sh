#!/bin/sh
set -e

HOSTNAME="${ICECAST_HOSTNAME:-localhost}"
CERT_PATH="/etc/letsencrypt/live/$HOSTNAME/fullchain.pem"

# Substitute only our custom variable, leave nginx variables ($host etc.) alone
envsubst '$ICECAST_HOSTNAME' < /etc/nginx/nginx.conf.template > /tmp/nginx-substituted.conf

if [ -f "$CERT_PATH" ]; then
    echo "[nginx] SSL certificate found for $HOSTNAME — enabling HTTPS"
    cp /tmp/nginx-substituted.conf /etc/nginx/nginx.conf
else
    echo "[nginx] No SSL certificate found — serving HTTP only (for ACME challenge)"
    # Strip the HTTPS server block, keep only HTTP
    sed '/# HTTPS_START/,/# HTTPS_END/d' /tmp/nginx-substituted.conf > /etc/nginx/nginx.conf
fi

rm -f /tmp/nginx-substituted.conf
exec nginx -g 'daemon off;'
