FROM nginx:1.28.3-alpine-slim

RUN apk add --no-cache gettext=0.24.1-r1

COPY nginx.conf /etc/nginx/nginx.conf.template
COPY index.html.template /etc/nginx/index.html.template
COPY docker-entrypoint.sh /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
