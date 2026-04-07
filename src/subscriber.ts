import { getConnection, now, traceId } from './lib.js';

interface OrderEvent {
  seq: number;
  orderId: string;
  total: number;
}

async function main() {
  const nc = await getConnection();
  const sub = nc.subscribe('orders.created');

  console.log(`[${now()}] subscriber listening on orders.created`);

  for await (const msg of sub) {
    const data = msg.json<OrderEvent>();
    console.log(
      `[${now()}] subscriber received subject=${msg.subject} trace=${traceId(msg.headers)} seq=${data.seq} orderId=${data.orderId} total=${data.total}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
