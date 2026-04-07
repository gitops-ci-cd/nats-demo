import {
  AckPolicy,
  connect,
  consumerOpts,
  DeliverPolicy,
  headers,
  jwtAuthenticator,
  type MsgHdrs,
  type NatsConnection,
  ReplayPolicy,
  RetentionPolicy,
  StorageType,
  StringCodec,
} from 'nats';

export const sc = StringCodec();

export async function getConnection(): Promise<NatsConnection> {
  const servers = process.env.NATS_URL ?? 'nats://localhost:4222';
  const jwt = process.env.NATS_USER_JWT;
  const seed = process.env.NATS_USER_SEED;

  const nc = await connect({
    servers,
    name: process.env.HOSTNAME ?? 'demo-client',
    reconnect: true,
    maxReconnectAttempts: -1,
    ...(jwt && seed && { authenticator: jwtAuthenticator(jwt, new TextEncoder().encode(seed)) }),
  });

  (async () => {
    for await (const s of nc.status()) {
      console.log(`[${now()}] nats: ${s.type}`, s.data ?? '');
    }
  })();

  nc.closed().then((err) => {
    console.log(`[${now()}] nats: connection closed`, err ?? '');
  });

  return nc;
}

export async function ensureStream(nc: NatsConnection) {
  const jsm = await nc.jetstreamManager();
  try {
    await jsm.streams.info('TASKS');
  } catch {
    await jsm.streams.add({
      name: 'TASKS',
      subjects: ['tasks.ingest'],
      retention: RetentionPolicy.Limits,
      storage: StorageType.File,
      max_msgs: 10000,
      max_age: 60 * 60 * 1_000_000_000, // 1 hour in ns
      num_replicas: 1,
    });
    console.log(`[${now()}] created stream TASKS`);
  }
}

export async function ensureConsumer(nc: NatsConnection) {
  const jsm = await nc.jetstreamManager();
  try {
    await jsm.consumers.info('TASKS', 'TASKS_WORKER');
  } catch {
    await jsm.consumers.add('TASKS', {
      durable_name: 'TASKS_WORKER',
      ack_policy: AckPolicy.Explicit,
      filter_subject: 'tasks.ingest',
      deliver_policy: DeliverPolicy.All,
      replay_policy: ReplayPolicy.Instant,
    });
    console.log(`[${now()}] created consumer TASKS_WORKER`);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function now(): string {
  return new Date().toISOString();
}

export function makePullConsumerOptions(durable: string) {
  const opts = consumerOpts();
  opts.durable(durable);
  opts.manualAck();
  opts.ackExplicit();
  return opts;
}

export function traceHeaders(source: string, inbound?: MsgHdrs): MsgHdrs {
  const h = headers();
  h.set('trace-id', inbound?.get('trace-id') || crypto.randomUUID());
  h.set('source', source);
  return h;
}

export function traceId(h?: MsgHdrs): string {
  return h?.get('trace-id') || 'unknown';
}
