#!/bin/sh
set -e

# Substitute environment variables in nginx.conf.template to nginx.conf
envsubst '${CALC_BACKEND_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "Nginx config generated with CALC_BACKEND_URL=${CALC_BACKEND_URL}"
