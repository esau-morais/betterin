import { env } from "cloudflare:workers";

export async function uploadFile(
	key: string,
	body: Buffer | ArrayBuffer | ReadableStream,
	contentType: string,
): Promise<string> {
	await env.R2_BUCKET.put(key, body, {
		httpMetadata: {
			contentType,
			cacheControl: "public, max-age=31536000, immutable",
		},
	});
	return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function downloadFile(key: string): Promise<Buffer> {
	const obj = await env.R2_BUCKET.get(key);
	if (!obj) throw new Error(`Failed to download ${key}`);
	return Buffer.from(await obj.arrayBuffer());
}

export async function deleteFile(key: string): Promise<void> {
	await env.R2_BUCKET.delete(key);
}
