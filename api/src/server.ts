import app, { initializeDatabase, mountLegacyRouters } from "./app";
import { env, validateRequiredStartupEnvVars } from "./config/env";
import { runOnStartUp } from "./modules/onStartUp";

const port = env.port;

async function startServer(): Promise<void> {
  try {
    validateRequiredStartupEnvVars();
    await initializeDatabase();
    await runOnStartUp();
    mountLegacyRouters();
    app.listen(port, "0.0.0.0", () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on http://0.0.0.0:${port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to initialize database during startup:", error);
    process.exit(1);
  }
}

void startServer();
