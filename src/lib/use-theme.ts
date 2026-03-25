import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "bi-theme";
const MEDIA = "(prefers-color-scheme: dark)";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
	return window.matchMedia(MEDIA).matches ? "dark" : "light";
}

function disableTransitions(): () => void {
	const css = document.createElement("style");
	css.appendChild(
		document.createTextNode("*,*::before,*::after{transition:none!important}"),
	);
	document.head.appendChild(css);

	return () => {
		(() => window.getComputedStyle(document.body))();
		setTimeout(() => document.head.removeChild(css), 1);
	};
}

function applyTheme(t: Theme) {
	const restore = disableTransitions();
	document.documentElement.classList.toggle("dark", t === "dark");
	restore();
}

const listeners = new Set<() => void>();
function emitChange() {
	for (const fn of listeners) fn();
}

function subscribe(callback: () => void) {
	listeners.add(callback);

	const handleStorage = (e: StorageEvent) => {
		if (e.key !== STORAGE_KEY && e.key !== null) return;
		const next = (e.newValue as Theme | null) ?? getSystemTheme();
		applyTheme(next);
		emitChange();
	};

	const media = window.matchMedia(MEDIA);
	const handleMedia = () => {
		if (localStorage.getItem(STORAGE_KEY)) return;
		applyTheme(getSystemTheme());
		emitChange();
	};

	window.addEventListener("storage", handleStorage);
	media.addEventListener("change", handleMedia);

	return () => {
		listeners.delete(callback);
		window.removeEventListener("storage", handleStorage);
		media.removeEventListener("change", handleMedia);
	};
}

function getSnapshot(): Theme {
	return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
	return "light";
}

export function useTheme() {
	const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

	const setTheme = useCallback((t: Theme) => {
		applyTheme(t);
		localStorage.setItem(STORAGE_KEY, t);
		emitChange();
	}, []);

	const toggle = useCallback(() => {
		setTheme(getSnapshot() === "dark" ? "light" : "dark");
	}, [setTheme]);

	return { theme, setTheme, toggle };
}
