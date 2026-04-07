import { getConnection, now, sc } from './lib.js';

interface EchoRequest {
  traceId: string;
}

async function main() {
  const nc = await getConnection();
  const sub = nc.subscribe('agent.echo');

  console.log(`[${now()}] rpc-server listening on agent.echo`);

  for await (const msg of sub) {
    const request = msg.json<EchoRequest>();
    const response = {
      ok: true,
      handledBy: process.env.HOSTNAME ?? 'rpc-server',
      receivedAt: now(),
      request,
    };

    msg.respond(sc.encode(JSON.stringify(response)));
    console.log(`[${now()}] rpc-server handled request traceId=${request.traceId}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
