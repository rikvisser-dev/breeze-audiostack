FROM nginx:alpine

COPY nginx.conf /etc/nginx/templates/nginx.conf.template

# nginx:alpine auto-runs envsubst on /etc/nginx/templates/*.template
# and outputs to /etc/nginx/conf.d/. We override that to write to the
# main config path instead.
CMD ["sh", "-c", "envsubst '${ICECAST_HOSTNAME}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'"]
