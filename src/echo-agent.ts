import { getConnection, now, sc, traceHeaders, traceId } from './lib.js';

const SUBJECT = 'agent.echo-agent';

async function main() {
  const nc = await getConnection();
  const sub = nc.subscribe(SUBJECT, { queue: SUBJECT });

  console.log(`[${now()}] echo-agent listening on ${SUBJECT}`);

  for await (const msg of sub) {
    const request = msg.json<{ parts?: { kind: string; text: string }[] }>();
    const userText = (request.parts ?? [])
      .filter((p) => p.kind === 'text')
      .map((p) => p.text)
      .join(' ');

    console.log(`[${now()}] echo-agent received: "${userText}" trace=${traceId(msg.headers)}`);

    const response = {
      kind: 'message',
      messageId: crypto.randomUUID(),
      role: 'agent',
      parts: [{ kind: 'text', text: `Echo: ${userText}` }],
    };

    msg.respond(sc.encode(JSON.stringify(response)), {
      headers: traceHeaders('echo-agent', msg.headers),
    });

    console.log(`[${now()}] echo-agent replied trace=${traceId(msg.headers)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
