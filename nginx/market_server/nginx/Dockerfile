FROM nginx:alpine
RUN apk add --no-cache gettext

COPY nginx.conf /etc/nginx/nginx.conf.template
COPY entrypoint.sh /docker-entrypoint.d/40-envsubst-on-templates.sh
RUN chmod +x /docker-entrypoint.d/40-envsubst-on-templates.sh

ARG MARKET_BACKEND_URL=localhost:5001
ENV MARKET_BACKEND_URL=${MARKET_BACKEND_URL}

EXPOSE 5000
