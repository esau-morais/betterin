type CursorData = { rank: number; id: string } | { date: string; id: string };

export function encodeCursor(data: CursorData): string {
	return Buffer.from(JSON.stringify(data)).toString("base64url");
}

export function decodeCursor(cursor: string): CursorData | null {
	try {
		return JSON.parse(Buffer.from(cursor, "base64url").toString());
	} catch {
		return null;
	}
}
