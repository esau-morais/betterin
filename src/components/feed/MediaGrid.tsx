import { cn } from "#/lib/utils";

export function MediaGrid({ mediaUrls }: { mediaUrls: string[] }) {
	if (mediaUrls.length === 0) return null;

	const isVideo = (url: string) => /\.(mp4|mov|webm)(\?|$)/i.test(url);

	if (mediaUrls.length === 1) {
		const url = mediaUrls[0];
		return (
			<div className="mt-2 rounded-xl overflow-hidden">
				{isVideo(url) ? (
					<VideoItem src={url} className="w-full max-h-[400px] object-cover" />
				) : (
					<img
						src={url}
						alt=""
						loading="lazy"
						className="w-full max-h-[400px] object-cover"
					/>
				)}
			</div>
		);
	}

	if (mediaUrls.length === 2) {
		return (
			<div className="mt-2 grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden">
				{mediaUrls.map((url) => (
					<MediaItem
						key={url}
						url={url}
						isVideo={isVideo(url)}
						className="aspect-[4/3]"
					/>
				))}
			</div>
		);
	}

	if (mediaUrls.length === 3) {
		return (
			<div className="mt-2 grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden">
				<MediaItem
					url={mediaUrls[0]}
					isVideo={isVideo(mediaUrls[0])}
					className="row-span-2 aspect-[3/4]"
				/>
				<MediaItem
					url={mediaUrls[1]}
					isVideo={isVideo(mediaUrls[1])}
					className="aspect-square"
				/>
				<MediaItem
					url={mediaUrls[2]}
					isVideo={isVideo(mediaUrls[2])}
					className="aspect-square"
				/>
			</div>
		);
	}

	const visible = mediaUrls.slice(0, 4);
	const extra = mediaUrls.length - 4;

	return (
		<div className="mt-2 grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden">
			{visible.map((url, i) => (
				<div key={url} className="relative aspect-square">
					<MediaItem
						url={url}
						isVideo={isVideo(url)}
						className="absolute inset-0"
					/>
					{i === 3 && extra > 0 && (
						<div className="absolute inset-0 flex items-center justify-center bg-background/60">
							<span className="text-2xl font-bold">+{extra}</span>
						</div>
					)}
				</div>
			))}
		</div>
	);
}

function VideoItem({ src, className }: { src: string; className?: string }) {
	return (
		// biome-ignore lint/a11y/useMediaCaption: user-uploaded content without captions
		<video src={src} controls preload="metadata" className={className} />
	);
}

function MediaItem({
	url,
	isVideo: video,
	className,
}: {
	url: string;
	isVideo: boolean;
	className?: string;
}) {
	if (video) {
		return (
			<VideoItem
				src={url}
				className={cn("w-full h-full object-cover", className)}
			/>
		);
	}
	return (
		<img
			src={url}
			alt=""
			loading="lazy"
			className={cn("w-full h-full object-cover", className)}
		/>
	);
}
