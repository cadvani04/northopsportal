import "dotenv/config";
import { reprocessAllIncompleteMeetings } from "../src/lib/fireflies/sync-meeting";

async function main() {
  const results = await reprocessAllIncompleteMeetings({ force: false });
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
