#!/bin/sh
set -e

# Substitute environment variables in nginx.conf.template to nginx.conf
envsubst '${MARKET_BACKEND_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "Nginx config generated with MARKET_BACKEND_URL=${MARKET_BACKEND_URL}"
