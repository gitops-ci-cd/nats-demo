import { getConnection, now, sc, traceHeaders, traceId } from './lib.js';

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

    msg.respond(sc.encode(JSON.stringify(response)), { headers: traceHeaders('rpc-server', msg.headers) });
    console.log(`[${now()}] rpc-server handled request trace=${traceId(msg.headers)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
