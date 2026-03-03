import { app } from "./app.js";
import { config } from "./config.js";
import { initDb } from "./db.js";
import { startIndexer, stopIndexer } from "./indexer.js";

async function main() {
  await initDb();

  // Start on-chain event indexer if contract is configured
  startIndexer();

  const server = app.listen(config.port, () => {
    console.log(
      `[clawback-directory] Listening on port ${config.port} (${config.nodeEnv})`,
    );
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("[clawback-directory] Shutting down...");
    stopIndexer();
    server.close(() => {
      console.log("[clawback-directory] HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[clawback-directory] Fatal:", err);
  process.exit(1);
});
