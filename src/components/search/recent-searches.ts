const SEARCHES_KEY = "bi:recent-searches";
const PEOPLE_KEY = "bi:recent-people";
const MAX_SEARCHES = 5;
const MAX_PEOPLE = 5;

export type RecentPerson = {
	id: string;
	name: string;
	handle: string | null;
	headline: string | null;
	avatarUrl: string | null;
	avatarFrame?: string | null;
};

function readJson<T>(key: string): T[] {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function writeJson<T>(key: string, items: T[]) {
	try {
		localStorage.setItem(key, JSON.stringify(items));
	} catch {}
}

export function getRecentSearches(): string[] {
	return readJson<string>(SEARCHES_KEY);
}

export function addRecentSearch(query: string) {
	const trimmed = query.trim();
	if (!trimmed) return;
	const existing = getRecentSearches().filter(
		(s) => s.toLowerCase() !== trimmed.toLowerCase(),
	);
	writeJson(SEARCHES_KEY, [trimmed, ...existing].slice(0, MAX_SEARCHES));
}

export function removeRecentSearch(query: string) {
	writeJson(
		SEARCHES_KEY,
		getRecentSearches().filter((s) => s.toLowerCase() !== query.toLowerCase()),
	);
}

export function clearRecentSearches() {
	localStorage.removeItem(SEARCHES_KEY);
}

export function getRecentPeople(): RecentPerson[] {
	return readJson<RecentPerson>(PEOPLE_KEY);
}

export function addRecentPerson(person: RecentPerson) {
	const existing = getRecentPeople().filter((p) => p.id !== person.id);
	writeJson(PEOPLE_KEY, [person, ...existing].slice(0, MAX_PEOPLE));
}

export function removeRecentPerson(id: string) {
	writeJson(
		PEOPLE_KEY,
		getRecentPeople().filter((p) => p.id !== id),
	);
}

export function clearRecentPeople() {
	localStorage.removeItem(PEOPLE_KEY);
}
