import { ensureConsumer, ensureStream, getConnection, now, sleep } from './lib.js';

interface TaskMessage {
  seq: number;
  docId: string;
}

async function main() {
  const nc = await getConnection();
  await ensureStream(nc);
  await ensureConsumer(nc);
  const js = nc.jetstream();

  console.log(`[${now()}] js-worker connected`);

  const consumer = await js.consumers.get('TASKS', 'TASKS_WORKER');

  while (true) {
    const messages = await consumer.fetch({ max_messages: 5, expires: 2000 });

    let gotAny = false;
    for await (const msg of messages) {
      gotAny = true;
      const data = msg.json<TaskMessage>();
      console.log(`[${now()}] js-worker processing subject=${msg.subject} seq=${data.seq} docId=${data.docId}`);
      await sleep(750);
      msg.ack();
      console.log(`[${now()}] js-worker acked seq=${data.seq}`);
    }

    if (!gotAny) {
      await sleep(1000);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
