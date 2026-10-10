FROM golang:1.27-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o /out/roadmap .


FROM alpine:3.22

RUN apk add --no-cache su-exec

COPY --from=build /out/roadmap /usr/local/bin/roadmap
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

# Starts as root only to fix ownership of the data directory, then runs the
# server as APP_UID (1000 by default). See entrypoint.sh.
ENTRYPOINT ["entrypoint.sh"]
