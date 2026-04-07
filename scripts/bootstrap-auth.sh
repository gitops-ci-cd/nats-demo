#!/bin/sh
set -eu

# Bootstrap NATS JWT auth: Operator → Account → User
# Run via: docker compose run --rm --entrypoint sh nsc /scripts/bootstrap-auth.sh
# Or use the nsc compose alias for individual commands: dr nsc <command>

echo "==> Creating operator 'Demo' with system account..."
nsc add operator Demo --sys

echo "==> Setting operator service URL..."
nsc edit operator --service-url nats://broker:4222 --account-jwt-server-url nats://broker:4222

echo "==> Creating account 'Agents'..."
nsc add account Agents

echo "==> Enabling JetStream on account 'Agents'..."
nsc edit account Agents --js-mem-storage -1 --js-disk-storage -1 --js-streams -1 --js-consumer -1

echo "==> Creating user 'demo-client'..."
nsc add user demo-client --account Agents

echo "==> Generating resolver config..."
nsc generate config --nats-resolver --config-file /nsc/resolver.conf

CREDS_FILE="/nsc/nkeys/creds/Demo/Agents/demo-client.creds"

echo "==> Extracting JWT and seed to .env..."
JWT=$(sed -n '/BEGIN NATS USER JWT/,/END NATS USER JWT/p' "$CREDS_FILE" | grep -v '[-][-][-]')
SEED=$(sed -n '/BEGIN USER NKEY SEED/,/END USER NKEY SEED/p' "$CREDS_FILE" | grep -v '[-][-][-]')

cat > /nsc/.env <<EOF
NATS_USER_JWT=${JWT}
NATS_USER_SEED=${SEED}
EOF

echo ""
echo "Done! Next steps:"
echo "  1. Copy resolver config:  cp .nsc/resolver.conf ./resolver.conf"
echo "  2. Copy env file:         cp .nsc/.env ./.env"
echo "  3. Start broker:          docker compose up -d broker"
echo "  4. Push accounts:         dr nsc push -A -u nats://broker:4222"
echo "  5. Start everything:      docker compose up -d"
