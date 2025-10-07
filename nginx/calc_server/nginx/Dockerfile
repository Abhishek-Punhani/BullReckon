FROM nginx:alpine
RUN apk add --no-cache gettext
COPY nginx.conf /etc/nginx/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ARG CALC_BACKEND_URL=localhost:8001
ENV CALC_BACKEND_URL=${CALC_BACKEND_URL}

ENTRYPOINT ["/entrypoint.sh"]
