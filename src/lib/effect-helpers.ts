import { Data } from "effect";

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
	readonly cause?: unknown;
}> {}

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
	readonly entity: string;
	readonly id?: string;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

export class NetworkError extends Data.TaggedError("NetworkError")<{
	readonly url?: string;
	readonly cause?: unknown;
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
	readonly operation?: string;
	readonly cause?: unknown;
}> {}

export class ParseError extends Data.TaggedError("ParseError")<{
	readonly input?: unknown;
	readonly cause?: unknown;
}> {}

export class ForbiddenError extends Data.TaggedError("ForbiddenError")<{
	readonly message: string;
}> {}

export class ConflictError extends Data.TaggedError("ConflictError")<{
	readonly message: string;
}> {}
