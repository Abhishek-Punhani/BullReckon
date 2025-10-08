#!/bin/sh
set -e

# Determine script directory for relative paths
SCRIPT_DIR="$(cd "$(dirname "${0}")" && pwd)"

# Load environment variables from .env in script directory for local testing
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  . "$SCRIPT_DIR/.env"
  set +a
fi

# Determine output path for nginx.conf: use NGINX_CONF_PATH env, or default to container path if writable, else local file
DEFAULT_CONF="/etc/nginx/nginx.conf"
if [ -n "$NGINX_CONF_PATH" ]; then
  TARGET_CONF="$NGINX_CONF_PATH"
elif [ -w "$(dirname "$DEFAULT_CONF")" ]; then
  TARGET_CONF="$DEFAULT_CONF"
else
  TARGET_CONF="./nginx.conf"
fi

echo "Writing final config to $TARGET_CONF"

# Generate upstream block with multiple backend instances and least_conn
UPSTREAM_BLOCK=""

# Determine how many instances to read. If MARKET_BACKEND_COUNT is set use that, otherwise scan up to 20
COUNT=${MARKET_BACKEND_COUNT:-1}
i=1
while [ "$i" -le "$COUNT" ]; do
  VAR_NAME="MARKET_BACKEND_URL_$i"
  eval VAR_VALUE=\$$VAR_NAME
  if [ -n "$VAR_VALUE" ]; then
    UPSTREAM_BLOCK="$UPSTREAM_BLOCK        server $VAR_VALUE;\n"
    echo "Added backend instance $i: $VAR_VALUE"
  fi
  i=$((i+1))
done

# If no numbered instances found, fall back to single MARKET_BACKEND_URL
if [ -z "$UPSTREAM_BLOCK" ] && [ -n "$MARKET_BACKEND_URL" ]; then
  UPSTREAM_BLOCK="        server $MARKET_BACKEND_URL;"
  echo "Using single backend: $MARKET_BACKEND_URL"
fi

# Build allowed-origins regex from ALLOWED_ORIGINS or CLIENT_URL
# ALLOWED_ORIGINS should be comma-separated list of origins (e.g. https://example.com,https://foo.com)
REGEX=""
if [ -n "$ALLOWED_ORIGINS" ]; then
  # remove spaces, convert commas to |, escape dots
  REGEX=$(printf "%s" "$ALLOWED_ORIGINS" | sed -E 's/[[:space:]]+//g' | sed 's/,/|/g' | sed 's/\./\\./g')
  echo "Using ALLOWED_ORIGINS regex: $REGEX"
elif [ -n "$CLIENT_URL" ]; then
  REGEX=$(printf "%s" "$CLIENT_URL" | sed -E 's/[[:space:]]+//g' | sed 's/\./\\./g')
  echo "Using CLIENT_URL as allowed origin: $REGEX"
else
  echo "No ALLOWED_ORIGINS or CLIENT_URL provided — nginx will reflect request origin (be careful in production)"
fi

# Prepare origin validation snippet to insert into nginx.conf
ORIGIN_CHECK=""
if [ -n "$REGEX" ]; then
  # match scheme://host(:port)? where host matches any entry in REGEX
  ORIGIN_CHECK="set "'$'"cors_allowed 0;
    if ("'$'"http_origin ~* '^(https?://($REGEX)(:[0-9]+)?)$') {
      set "'$'"cors_allowed 1;
    }"
else
  # no regex -> allow all origins (reflect)
  ORIGIN_CHECK="set "'$'"cors_allowed 1;"
fi

# Generate nginx.conf from template with least_conn
cat > "$TARGET_CONF" <<EOF
user  nginx;
worker_processes  auto;
error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;
    server_tokens off;

    upstream server_backend {
        least_conn;
$(printf '%b' "$UPSTREAM_BLOCK")
    }

    server {
        listen 5000;
        server_name _;

        $ORIGIN_CHECK
        
        location / {
            # Add CORS headers conditionally
            if (\$cors_allowed = 1) {
                add_header 'Access-Control-Allow-Origin' \$http_origin always;
            }
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;

            # Preflight: respond and exit
            if (\$request_method = OPTIONS) {
                add_header 'Access-Control-Allow-Origin' \$http_origin always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
                add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
                add_header 'Access-Control-Allow-Credentials' 'true' always;
                add_header 'Access-Control-Max-Age' 1728000 always;
                return 204;
            }

            proxy_pass http://server_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_set_header X-Forwarded-Host \$host;
            proxy_set_header X-Forwarded-Port \$server_port;
            proxy_read_timeout 90;
            proxy_connect_timeout 90;
            proxy_send_timeout 90;
            proxy_buffering off;
            proxy_request_buffering off;
            proxy_redirect off;
        }

        access_log  /var/log/nginx/market_access.log;
        error_log   /var/log/nginx/market_error.log;
    }
}
EOF

echo "Nginx config generated successfully"
