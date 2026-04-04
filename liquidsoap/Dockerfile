FROM savonet/liquidsoap:v2.3.0

COPY radio.liq /etc/liquidsoap/radio.liq

EXPOSE 8010 8011

CMD ["liquidsoap", "/etc/liquidsoap/radio.liq"]
