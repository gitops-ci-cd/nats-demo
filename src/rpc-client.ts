import { getConnection, now, sc, sleep } from './lib.js';

interface EchoResponse {
  handledBy: string;
  request: { traceId: string };
}

async function main() {
  const nc = await getConnection();

  console.log(`[${now()}] rpc-client connected`);

  while (true) {
    const payload = {
      traceId: crypto.randomUUID(),
      capability: 'echo',
      prompt: 'hello from rpc-client',
      at: now(),
    };

    const res = await nc.request('agent.echo', sc.encode(JSON.stringify(payload)), {
      timeout: 2000,
    });

    const body = res.json<EchoResponse>();
    console.log(`[${now()}] rpc-client got response handledBy=${body.handledBy} traceId=${body.request.traceId}`);

    await sleep(5000);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
