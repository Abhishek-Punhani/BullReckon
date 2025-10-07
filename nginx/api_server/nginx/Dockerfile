FROM nginx:alpine
RUN apk add --no-cache gettext

COPY nginx.conf /etc/nginx/nginx.conf.template
COPY entrypoint.sh /docker-entrypoint.d/40-envsubst-on-templates.sh
RUN chmod +x /docker-entrypoint.d/40-envsubst-on-templates.sh

ARG API_BACKEND_URL=localhost:3005
ENV API_BACKEND_URL=${API_BACKEND_URL}

EXPOSE 3004
