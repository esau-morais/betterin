import { useEffect, useRef, useState } from "react";

export function useScrollVisibility(options?: {
	threshold?: number;
	rootMargin?: string;
}) {
	const sentinelRef = useRef<HTMLDivElement>(null);
	const [isVisible, setIsVisible] = useState(true);

	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => setIsVisible(entry.isIntersecting),
			{
				threshold: options?.threshold ?? 0,
				rootMargin: options?.rootMargin,
			},
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, [options?.threshold, options?.rootMargin]);

	return { sentinelRef, isVisible };
}
