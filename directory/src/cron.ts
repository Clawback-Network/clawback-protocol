import { initDb } from "./db.js";
import { captureSnapshot } from "./snapshot.js";

async function main() {
  await initDb();

  console.log("[clawback-cron] Capturing snapshot...");
  await captureSnapshot();

  console.log("[clawback-cron] Done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[clawback-cron] Fatal:", err);
  process.exit(1);
});
