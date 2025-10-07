#!/bin/sh
set -e

# Substitute environment variables in nginx.conf.template to nginx.conf
envsubst '${AUTH_BACKEND_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "Nginx config generated with AUTH_BACKEND_URL=${AUTH_BACKEND_URL}"
