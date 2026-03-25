export function formatSalary(min: number, max: number, currency: string) {
	const fmt = (n: number) =>
		n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
	const sym = currency === "USD" ? "$" : currency;
	return `${sym}${fmt(min)}–${sym}${fmt(max)}`;
}
