#!/bin/sh
set -e

# Substitute environment variables in nginx.conf.template to nginx.conf
envsubst '${API_BACKEND_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "Nginx config generated with API_BACKEND_URL=${API_BACKEND_URL}"
