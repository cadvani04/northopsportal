import "dotenv/config";
import { processInboundEmail } from "../src/lib/actions";

async function main() {
  const result = await processInboundEmail({
    from: "Kush Vyas <unknown+kush-vyas@skaps-industries.northops-seed>",
    to: "dev@northops.org",
    subject: "n8n test — update SKAPS product catalog",
    body: "Automated inbound email test. Please update the product catalog hero section and add the new valve product line. Target completion: end of week.",
  });

  console.log("SUCCESS:", JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
