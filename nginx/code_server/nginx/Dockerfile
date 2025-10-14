FROM nginx:alpine
RUN apk add --no-cache gettext

COPY nginx.conf /etc/nginx/nginx.conf.template
COPY entrypoint.sh /docker-entrypoint.d/40-envsubst-on-templates.sh
RUN chmod +x /docker-entrypoint.d/40-envsubst-on-templates.sh

ARG CODE_BACKEND_URL=localhost:2001
ENV CODE_BACKEND_URL=${CODE_BACKEND_URL}

EXPOSE 2000
