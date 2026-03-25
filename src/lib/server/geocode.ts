import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";
import { z } from "zod";

const KomootPropertiesSchema = Schema.Struct({
	city: Schema.optional(Schema.String),
	name: Schema.optional(Schema.String),
	state: Schema.optional(Schema.String),
	country: Schema.optional(Schema.String),
});

const KomootResponseSchema = Schema.Struct({
	features: Schema.optional(
		Schema.Array(
			Schema.Struct({
				geometry: Schema.Struct({
					coordinates: Schema.Tuple(Schema.Number, Schema.Number),
				}),
				properties: KomootPropertiesSchema,
			}),
		),
	),
});

type KomootProperties = typeof KomootPropertiesSchema.Type;

function formatLocation(props: KomootProperties): string {
	const parts: string[] = [];
	if (props.city || props.name) parts.push(props.city ?? props.name ?? "");
	if (props.state) parts.push(props.state);
	if (props.country) parts.push(props.country);
	return parts.join(", ");
}

export type LocationSuggestion = {
	display: string;
	city: string | null;
	state: string | null;
	country: string | null;
	lat: number;
	lon: number;
};

export const searchLocationsFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ q: z.string().min(2) }))
	.handler(
		({ data }): Promise<LocationSuggestion[]> =>
			Effect.runPromise(
				Effect.gen(function* () {
					const res = yield* Effect.promise(() =>
						fetch(
							`https://photon.komoot.io/api/?q=${encodeURIComponent(data.q)}&limit=5&lang=en&osm_tag=place`,
						),
					);
					if (!res.ok) return [] as LocationSuggestion[];

					const raw = yield* Effect.promise(() => res.json());
					const { features = [] } =
						Schema.decodeUnknownSync(KomootResponseSchema)(raw);
					const seen = new Set<string>();
					return features
						.map((f) => ({
							display: formatLocation(f.properties),
							city: f.properties.city ?? f.properties.name ?? null,
							state: f.properties.state ?? null,
							country: f.properties.country ?? null,
							lat: f.geometry.coordinates[1],
							lon: f.geometry.coordinates[0],
						}))
						.filter((l) => {
							if (!l.display || seen.has(l.display)) return false;
							seen.add(l.display);
							return true;
						});
				}),
			),
	);
