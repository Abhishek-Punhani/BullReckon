#!/bin/sh
set -e

# Substitute environment variables in nginx.conf.template to nginx.conf
if [ -f /etc/nginx/nginx.conf.template ]; then
  envsubst < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
fi

exec nginx -g 'daemon off;'
