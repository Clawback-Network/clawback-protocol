import { app } from "./app.js";
import { config } from "./config.js";
import { initDb } from "./db.js";
import { startSweep } from "./sweep.js";

async function main() {
  await initDb();
  startSweep();

  app.listen(config.port, () => {
    console.log(
      `[clawback-directory] Listening on port ${config.port} (${config.nodeEnv})`,
    );
  });
}

main().catch((err) => {
  console.error("[clawback-directory] Fatal:", err);
  process.exit(1);
});
