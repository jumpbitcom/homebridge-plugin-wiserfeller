#
# Docker homebridge server with ports for plugin wiser
#
# Docker build:
# docker login
# docker build -t username/homebridge:latest .
# docker push username/homebridge:latest
#
# docker run --rm -it  username/homebridge:latest
# 

FROM homebridge/homebridge:latest

WORKDIR /homebridge

VOLUME /homebridge

# UI port
EXPOSE 8581/tcp

# Plugin wiser bridge port
EXPOSE 42035/tcp

ENTRYPOINT ["/init"]