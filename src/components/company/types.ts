import type { getCompanyFn } from "#/lib/server/companies";

export type CompanyData = Awaited<ReturnType<typeof getCompanyFn>>;
