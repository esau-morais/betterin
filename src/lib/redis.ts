import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!, {
	lazyConnect: true,
	maxRetriesPerRequest: 3,
});

export function createSubscriber(): Redis {
	return new Redis(process.env.REDIS_URL!, {
		lazyConnect: true,
		maxRetriesPerRequest: 3,
	});
}
