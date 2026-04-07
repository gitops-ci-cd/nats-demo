import { getConnection, now, sc, sleep, traceHeaders, traceId } from './lib.js';

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

    const h = traceHeaders('rpc-client');
    const res = await nc.request('agent.echo', sc.encode(JSON.stringify(payload)), {
      timeout: 2000,
      headers: h,
    });

    const body = res.json<EchoResponse>();
    console.log(`[${now()}] rpc-client got response trace=${traceId(h)} handledBy=${body.handledBy}`);

    await sleep(5000);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
