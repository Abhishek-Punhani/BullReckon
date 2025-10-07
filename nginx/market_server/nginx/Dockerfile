FROM nginx:alpine
RUN apk add --no-cache gettext
COPY nginx.conf /etc/nginx/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ARG MARKET_BACKEND_URL=localhost:5001
ENV MARKET_BACKEND_URL=${MARKET_BACKEND_URL}

ENTRYPOINT ["/entrypoint.sh"]
