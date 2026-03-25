import { useCallback, useEffect, useRef, useState } from "react";

const HOVER_CLOSE_DELAY = 300;

export function useHoverIntent(
	onOpen: () => void,
	onClose: () => void,
	enabled: boolean,
) {
	const closeTimer = useRef<ReturnType<typeof setTimeout>>(null);

	const handleEnter = useCallback(() => {
		if (!enabled) return;
		if (closeTimer.current) {
			clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
		onOpen();
	}, [enabled, onOpen]);

	const handleLeave = useCallback(() => {
		if (!enabled) return;
		closeTimer.current = setTimeout(onClose, HOVER_CLOSE_DELAY);
	}, [enabled, onClose]);

	useEffect(() => {
		return () => {
			if (closeTimer.current) clearTimeout(closeTimer.current);
		};
	}, []);

	return { handleEnter, handleLeave };
}

export function useCanHover() {
	const [canHover, setCanHover] = useState(false);

	useEffect(() => {
		const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
		setCanHover(mql.matches);
		const handler = (e: MediaQueryListEvent) => setCanHover(e.matches);
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);

	return canHover;
}
