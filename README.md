# NATS Demo

[NATS](https://docs.nats.io/nats-concepts/overview) is a lightweight, high-performance messaging system for distributed applications. It handles pub/sub, request/reply, and persistent streaming (JetStream) with minimal operational overhead.

This demo runs locally with Docker Compose so you can play with:

- core NATS pub/sub
- request/reply
- JetStream persistence + pull consumer

## What's inside

Services:

- `npm` — CLI alias for node package manager
- `nk` — CLI alias for the NKey tool
- `nsc` — CLI alias for the NATS security credential tool
- `nats` — CLI alias for the NATS client
- `broker` — the NATS server
- `publisher` — publishes `orders.created` events every 2 seconds
- `subscriber` — listens to `orders.created`
- `rpc-server` — serves request/reply on `agent.echo`
- `rpc-client` — calls `agent.echo` every 5 seconds
- `js-publisher` — writes durable messages to JetStream on `tasks.ingest`
- `js-worker` — pulls from JetStream and acknowledges messages

## Prerequisites

```sh
brew bundle
```

This installs the `nats`, `nsc`, and `nk` CLIs locally from the `nats-io/nats-tools` tap. They're optional for the Docker-based workflow but useful for debugging and inspecting a running cluster.

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

## Authentication

This demo uses [JWT-based authentication](https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/jwt) with an Operator → Account → User trust chain. NKeys (Ed25519) are still used under the hood for cryptographic identity, but JWTs layer on decentralized management, expiration, revocation, and per-account isolation.

### First-time setup

Bootstrap the operator, account, and user:

```sh
docker compose run --rm --entrypoint sh nsc /scripts/bootstrap-auth.sh
```

This creates:

- **Operator** `Demo` — the root of trust
- **Account** `Agents` — the tenant (your agent mesh)
- **User** `demo-client` — the identity used by all demo services

Copy the generated resolver config and credentials into the project:

```sh
cp .nsc/resolver.conf ./resolver.conf
cp .nsc/.env ./.env
```

Start the broker, then push account JWTs:

```sh
docker compose up -d broker
dr nsc push -A -u nats://broker:4222
docker compose up -d
```

### Adding more users

```sh
dr nsc add user another-agent --account Agents
dr nsc push -A -u nats://broker:4222
```

No broker restart needed — account JWTs are resolved dynamically.

### Credential distribution

Each connecting client needs two things: its **user JWT** (identity) and **user seed** (private key). In this demo they live in `.env`, but in production you'd store them in Vault or a similar secrets manager.

To extract credentials for a new user:

```sh
# view the creds file
dr nsc describe user another-agent --account Agents --raw

# or extract JWT and seed separately
dr nsc describe user another-agent --account Agents --field sub   # user public key
cat .nsc/nkeys/creds/Demo/Agents/another-agent.creds              # JWT + seed
```

| Secret | Sensitivity | Where to store |
| -------- | ------------- | ---------------- |
| User JWT | Low — signed, not usable alone | Vault, env var, config map |
| User Seed | **High** — proves identity | Vault only |
| Account JWT | None for clients | Pushed to broker via `nsc push` |
| Operator keys | **Critical** | Offline / HSM |

### Key hierarchy

`nsc` stores all keys under `.nsc/nkeys/keys/`, organized by type prefix:

```sh
.nsc/nkeys/keys/
├── O/   # Operator seeds — root of trust
├── A/   # Account seeds — sign user JWTs
└── U/   # User seeds — prove client identity
```

Each `.nk` file contains the seed (private key) for that entity. The file is named by public key.

**In production**, the operator seed should be extracted and moved offline (or to an HSM) after initial setup. You only need it to sign new _account_ JWTs — a rare operation. Day-to-day tasks like adding users only require the account seed. This means a compromised account key can't mint new accounts or alter the operator, limiting blast radius.

For this demo, everything stays in `.nsc/` for convenience. The entire directory is gitignored.

## Notes

- This demo uses the official `nats` JavaScript/TypeScript client.
- The JetStream pieces are intentionally simple.
- Messages are JSON encoded.
