import { getConnection, now, sc, sleep, traceHeaders } from './lib.js';

async function main() {
  const nc = await getConnection();
  let i = 0;

  console.log(`[${now()}] publisher connected`);

  while (true) {
    i += 1;
    const payload = {
      id: crypto.randomUUID(),
      seq: i,
      kind: 'order.created',
      orderId: `order-${i}`,
      total: Number((Math.random() * 100).toFixed(2)),
      at: now(),
    };

    nc.publish('orders.created', sc.encode(JSON.stringify(payload)), { headers: traceHeaders('publisher') });
    console.log(`[${now()}] published orders.created seq=${payload.seq} id=${payload.id}`);
    await sleep(2000);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
