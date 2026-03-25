import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { uploadFile } from "#/lib/storage";

const ALLOWED_IMAGE_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

function getExtension(contentType: string): string {
	const map: Record<string, string> = {
		"image/jpeg": "jpg",
		"image/png": "png",
		"image/gif": "gif",
		"image/webp": "webp",
		"video/mp4": "mp4",
		"video/quicktime": "mov",
	};
	return map[contentType] ?? "bin";
}

export const Route = createFileRoute("/api/upload")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({
					headers: request.headers,
				});
				if (!session) {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				const formData = await request.formData();
				const file = formData.get("file");

				if (!(file instanceof File)) {
					return Response.json({ error: "No file provided" }, { status: 400 });
				}

				const contentType = file.type;
				const isImage = ALLOWED_IMAGE_TYPES.has(contentType);
				const isVideo = ALLOWED_VIDEO_TYPES.has(contentType);

				if (!isImage && !isVideo) {
					return Response.json(
						{ error: "Unsupported file type" },
						{ status: 422 },
					);
				}

				const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
				if (file.size > maxSize) {
					return Response.json(
						{
							error: `File too large. Max ${isImage ? "10MB" : "100MB"}`,
						},
						{ status: 422 },
					);
				}

				const ext = getExtension(contentType);
				const key = `media/${session.user.id}/${crypto.randomUUID()}.${ext}`;
				const buffer = Buffer.from(await file.arrayBuffer());

				const url = await uploadFile(key, buffer, contentType);

				return Response.json({
					url,
					type: isImage ? "image" : "video",
				});
			},
		},
	},
});
