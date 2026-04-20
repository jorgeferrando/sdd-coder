import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/health', () => ({ status: 'ok' }));

// Bind to 0.0.0.0 so the container is reachable from the Docker host.
app.listen({ host: '0.0.0.0', port: 3000 }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
