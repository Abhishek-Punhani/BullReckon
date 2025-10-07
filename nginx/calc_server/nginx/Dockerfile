FROM nginx:alpine
RUN apk add --no-cache gettext

COPY nginx.conf /etc/nginx/nginx.conf.template
COPY entrypoint.sh /docker-entrypoint.d/40-envsubst-on-templates.sh
RUN chmod +x /docker-entrypoint.d/40-envsubst-on-templates.sh

ARG CALC_BACKEND_URL=localhost:8001
ENV CALC_BACKEND_URL=${CALC_BACKEND_URL}

EXPOSE 8000
