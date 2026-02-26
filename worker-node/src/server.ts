import 'dotenv/config';
import app from './app';

const port = Number(process.env.PORT ?? 3002);

app.listen(port, () => {
  // Keep startup logging minimal until logging module is implemented in Phase 2.
  console.log(`[worker-node] listening on port ${port}`);
});
