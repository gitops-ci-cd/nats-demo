# NATS Demo

A small demo you can run locally with Docker Compose to play with:

- core NATS pub/sub
- request/reply
- JetStream persistence + pull consumer

## What's inside

Services:

- `npm` — CLI alias for node package manager
- `nats` — CLI alias for the NATS client
- `broker` — the NATS server
- `publisher` — publishes `orders.created` events every 2 seconds
- `subscriber` — listens to `orders.created`
- `rpc-server` — serves request/reply on `agent.echo`
- `rpc-client` — calls `agent.echo` every 5 seconds
- `js-publisher` — writes durable messages to JetStream on `tasks.ingest`
- `js-worker` — pulls from JetStream and acknowledges messages

## Run it

```sh
alias dr="docker compose run --rm"

docker compose up --build
```

Then watch the logs.

## Useful endpoints

- NATS client port: `4222`
- Monitoring UI-ish endpoint: `http://localhost:8222/`

## Things to try

### Stop the normal subscriber

```sh
docker compose stop subscriber
```

Notice:

- core NATS messages published while it is stopped are not replayed later

Start it again:

```sh
docker compose start subscriber
```

### Stop the JetStream worker

```sh
docker compose stop js-worker
```

Let `js-publisher` keep running for a bit, then start the worker again:

```sh
docker compose start js-worker
```

Notice:

- JetStream retained the messages
- the worker resumes and drains them

### Scale the core subscriber

```sh
docker compose up --build --scale subscriber=2
```

Both subscribers receive the event because plain pub/sub fans out to all listeners.

### Inspect streams

```sh
dr nats stream ls
dr nats consumer ls TASKS
dr nats stream view TASKS
```

## Notes

- This demo uses the official `nats` JavaScript/TypeScript client.
- The JetStream pieces are intentionally simple.
- Messages are JSON encoded.
