import { redis } from "#/lib/redis";

const TRAIN_THRESHOLD = 10_000;
const TRAIN_LOCK_TTL = 60 * 60; // 1 hour max lock

export async function incrementAndCheckTrainTrigger(): Promise<void> {
	const count = await redis.incr("fi:events:since_last_train");

	if (count % 500 !== 0) return;
	if (count < TRAIN_THRESHOLD) return;

	const locked = await redis.set("fi:train:running", "1", {
		ex: TRAIN_LOCK_TTL,
		nx: true,
	});
	if (!locked) return;

	console.log(
		`[ml-trigger] ${count} events since last train — spawning pipeline`,
	);

	try {
		const proc = Bun.spawn(["bun", "run", "scripts/ml/pipeline.ts"], {
			stdout: "inherit",
			stderr: "inherit",
		});

		proc.exited.then(async (code: number) => {
			await redis.del("fi:train:running");
			if (code === 0) {
				await redis.set("fi:events:since_last_train", "0");
				console.log("[ml-trigger] Pipeline completed successfully");
			} else {
				console.error(`[ml-trigger] Pipeline failed with exit code ${code}`);
			}
		});
	} catch {
		await redis.del("fi:train:running");
	}
}
