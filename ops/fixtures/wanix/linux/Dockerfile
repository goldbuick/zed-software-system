FROM docker.io/i386/alpine:3.22

RUN mkdir -p /overlay/etc/apk/keys /overlay/lib/apk/db /overlay/lib/apk/exec /overlay/var/cache/apk \
    && cp -a /etc/apk/keys/* /overlay/etc/apk/keys/ \
    && cp /etc/apk/repositories /overlay/etc/apk/repositories \
    && cp /etc/apk/arch /overlay/etc/apk/arch

RUN apk add --no-cache --root /overlay --initdb \
    jq \
    curl \
    wget

COPY bin/ /overlay/usr/bin/
COPY lib/zedcafe/ /overlay/usr/lib/zedcafe/
COPY boot/rc /overlay/boot/rc

RUN chmod +x /overlay/usr/bin/zedcafe-* /overlay/boot/rc

RUN tar -czf /zedcafe-linux-overlay.tgz -C /overlay .
