import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
	region: "auto",
	endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
	},
});

const BUCKET = process.env.R2_BUCKET_NAME ?? "better-in";
const PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

export async function uploadFile(
	key: string,
	body: Buffer,
	contentType: string,
): Promise<string> {
	await s3.send(
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: key,
			Body: body,
			ContentType: contentType,
			CacheControl: "public, max-age=31536000, immutable",
		}),
	);
	return `${PUBLIC_URL}/${key}`;
}

export async function downloadFile(key: string): Promise<Buffer> {
	const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
	const bytes = await res.Body?.transformToByteArray();
	if (!bytes) throw new Error(`Failed to download ${key}`);
	return Buffer.from(bytes);
}

export async function deleteFile(key: string): Promise<void> {
	await s3.send(
		new DeleteObjectCommand({
			Bucket: BUCKET,
			Key: key,
		}),
	);
}
