FROM nginx:alpine
RUN apk add --no-cache gettext
COPY nginx.conf /etc/nginx/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ARG AUTH_BACKEND_URL=localhost:4001
ENV AUTH_BACKEND_URL=${AUTH_BACKEND_URL}

ENTRYPOINT ["/entrypoint.sh"]
