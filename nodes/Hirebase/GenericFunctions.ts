import {
	NodeApiError,
	sleep,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
	type JsonObject,
} from 'n8n-workflow';

export const BASE_URL = 'https://api.hirebase.org';

// The API allows 4 requests per second per key.
const REQUEST_SPACING_MS = 300;
const MAX_ATTEMPTS = 4;

// Page size is capped by the API at 100 (it rejects larger pages).
export const PAGE_LIMIT = 100;

interface FullResponse {
	statusCode: number;
	body: unknown;
}

function detailOf(body: unknown): string {
	if (body && typeof body === 'object' && 'detail' in body) {
		const { detail } = body as { detail: unknown };
		if (typeof detail === 'string') return detail;
		// FastAPI validation errors: [{ loc: ['body', 'keywords'], msg: '...' }]
		if (Array.isArray(detail)) {
			return detail
				.map((d: IDataObject) => {
					const loc = Array.isArray(d.loc) ? d.loc.filter((p) => p !== 'body').join('.') : '';
					return loc ? `${loc}: ${d.msg as string}` : String(d.msg);
				})
				.join('; ');
		}
		return JSON.stringify(detail);
	}
	if (typeof body === 'string') return body.slice(0, 300);
	return '';
}

export async function hirebaseApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${BASE_URL}${endpoint}`,
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};
	if (body) options.body = body;
	if (qs) options.qs = qs;

	for (let attempt = 1; ; attempt++) {
		const response = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'hirebaseApi',
			options,
		)) as FullResponse;
		const { statusCode } = response;
		const responseBody = response.body;

		if (statusCode >= 200 && statusCode < 300) return responseBody as IDataObject;

		const detail = detailOf(responseBody);
		// A query the search backend can't parse fails the same way every time,
		// so it is reported straight away instead of being retried.
		const deterministic = /cannot parse/i.test(detail);
		const retryable = (statusCode === 429 || statusCode >= 500) && !deterministic;
		if (retryable && attempt < MAX_ATTEMPTS) {
			await sleep(1000 * 2 ** (attempt - 1));
			continue;
		}

		let message = `Hirebase API error (HTTP ${statusCode})`;
		let description = detail || undefined;
		if (statusCode === 401 || statusCode === 403) {
			message = 'Hirebase rejected the API key';
			description = 'Check the API key in the Hirebase credential (app.hirebase.org → Settings → API).';
		} else if (statusCode === 404) {
			message = 'Not found in Hirebase';
		} else if (statusCode === 422 || deterministic) {
			message = 'Hirebase rejected the request parameters';
		} else if (statusCode === 429) {
			message = 'Hirebase rate limit or plan allowance reached';
		}

		throw new NodeApiError(this.getNode(), (responseBody ?? {}) as JsonObject, {
			message,
			description,
			httpCode: String(statusCode),
		});
	}
}

/**
 * Fetches pages of a list endpoint until `max` items are collected or the
 * results run out. The page size stays fixed for the whole run: changing it
 * mid-way shifts the page offsets and repeats or skips results. Items are
 * de-duplicated by `idKey`, since some Hirebase list endpoints repeat items
 * across pages.
 */
export async function hirebaseApiRequestAllItems(
	this: IExecuteFunctions,
	fetchPage: (page: number, limit: number) => Promise<IDataObject>,
	rootProperty: string,
	max: number,
	idKey: string,
): Promise<IDataObject[]> {
	const pageSize = Math.min(PAGE_LIMIT, max);
	const results: IDataObject[] = [];
	const seen = new Set<string>();

	for (let page = 1; results.length < max; page++) {
		if (page > 1) await sleep(REQUEST_SPACING_MS);
		const data = await fetchPage(page, pageSize);
		const items = (data[rootProperty] as IDataObject[] | undefined) ?? [];

		for (const item of items) {
			const id = item[idKey];
			if (typeof id === 'string') {
				if (seen.has(id)) continue;
				seen.add(id);
			}
			results.push(item);
			if (results.length >= max) break;
		}

		const totalPages = typeof data.total_pages === 'number' ? data.total_pages : undefined;
		if (items.length === 0 || (totalPages !== undefined && page >= totalPages)) break;
	}

	return results;
}

/** Splits a comma-separated field into trimmed, non-blank entries. */
export function splitList(value: unknown): string[] | undefined {
	if (value === undefined || value === null) return undefined;
	const raw = Array.isArray(value) ? value.map(String) : String(value).split(',');
	const list = raw.map((v) => v.trim()).filter((v) => v !== '');
	return list.length > 0 ? list : undefined;
}

/** Turns a location fixedCollection into Hirebase's { city, region, country } objects. */
export function toGeoLocations(value: unknown): IDataObject[] | undefined {
	const entries = ((value as IDataObject | undefined)?.location as IDataObject[] | undefined) ?? [];
	const geo = entries
		.map((entry) => {
			const loc: IDataObject = {};
			for (const key of ['city', 'region', 'country']) {
				const v = typeof entry[key] === 'string' ? (entry[key] as string).trim() : '';
				if (v) loc[key] = v;
			}
			return loc;
		})
		.filter((loc) => Object.keys(loc).length > 0);
	return geo.length > 0 ? geo : undefined;
}
