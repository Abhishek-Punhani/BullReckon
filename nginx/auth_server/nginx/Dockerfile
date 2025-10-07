FROM nginx:alpine
RUN apk add --no-cache gettext

COPY nginx.conf /etc/nginx/nginx.conf.template
COPY entrypoint.sh /docker-entrypoint.d/40-envsubst-on-templates.sh
RUN chmod +x /docker-entrypoint.d/40-envsubst-on-templates.sh

ARG AUTH_BACKEND_URL=localhost:4001
ENV AUTH_BACKEND_URL=${AUTH_BACKEND_URL}

EXPOSE 4000
