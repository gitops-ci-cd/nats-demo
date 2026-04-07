import { ensureStream, getConnection, now, sc, sleep } from './lib.js';

async function main() {
  const nc = await getConnection();
  await ensureStream(nc);
  const js = nc.jetstream();
  let i = 0;

  console.log(`[${now()}] js-publisher connected`);

  while (true) {
    i += 1;
    const payload = {
      id: crypto.randomUUID(),
      seq: i,
      kind: 'task.ingest',
      docId: `doc-${i}`,
      source: 'demo',
      at: now(),
    };

    const ack = await js.publish('tasks.ingest', sc.encode(JSON.stringify(payload)));
    console.log(`[${now()}] js-publisher stored tasks.ingest seq=${payload.seq} streamSeq=${ack.seq}`);
    await sleep(3000);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
