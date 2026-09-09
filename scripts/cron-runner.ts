import cron from "node-cron";
import { main } from "../src/index";

// Default to daily at midnight if not provided, or set via ENV
const schedule = process.env.CRON_SCHEDULE || "0 0 * * *";

console.log(`Starting cron runner with schedule: ${schedule}`);

cron.schedule(schedule, async () => {
	console.log(`[${new Date().toISOString()}] Running scheduled job...`);
	try {
		await main();
		console.log(
			`[${new Date().toISOString()}] Scheduled job finished successfully.`,
		);
	} catch (error) {
		console.error(`[${new Date().toISOString()}] Scheduled job failed:`, error);
	}
});
