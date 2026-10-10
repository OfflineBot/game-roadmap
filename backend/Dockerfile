FROM golang:1.27-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o /out/roadmap .

FROM alpine:3.22

COPY --from=build /out/roadmap /usr/local/bin/roadmap

# Runs as 1000 so the sqlite file on the host stays owned by the user.
USER 1000:1000

CMD ["roadmap"]
