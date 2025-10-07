FROM nginx:alpine
RUN apk add --no-cache gettext
COPY nginx.conf /etc/nginx/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set default backend URL if not provided at build time
ARG API_BACKEND_URL=localhost:3005
ENV API_BACKEND_URL=${API_BACKEND_URL}

ENTRYPOINT ["/entrypoint.sh"]
