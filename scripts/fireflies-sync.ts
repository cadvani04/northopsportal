import "dotenv/config";
import { syncFirefliesDateRange } from "../src/lib/fireflies/sync-meeting";

async function main() {
  const days = parseInt(process.argv[2] || "30", 10);
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  console.log(`Syncing Fireflies meetings from ${fromDate.toISOString()} to ${toDate.toISOString()}...`);

  const results = await syncFirefliesDateRange(fromDate, toDate);
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
