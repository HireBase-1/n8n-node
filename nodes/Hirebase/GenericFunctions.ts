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

// The API allows 100 requests per 60 seconds per key, so paged requests are
// spaced to stay under that on their own.
const REQUEST_SPACING_MS = 600;
// Server errors are retried with backoff (1s, 2s, 4s).
const MAX_SERVER_ERROR_ATTEMPTS = 4;
// Rate-limit 429s are retried after the Retry-After the API sends. A loop over
// many input items can keep hitting the limit, so allow more waits.
const MAX_RATE_LIMIT_ATTEMPTS = 8;
const MAX_RETRY_AFTER_SECONDS = 65;

// Page size is capped by the API at 100 (it rejects larger pages).
export const PAGE_LIMIT = 100;

interface FullResponse {
	statusCode: number;
	headers?: Record<string, unknown>;
	body: unknown;
}

function headerOf(response: FullResponse, name: string): string | undefined {
	const headers = response.headers ?? {};
	const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
	const value = key === undefined ? undefined : headers[key];
	if (Array.isArray(value)) return value.length > 0 ? String(value[0]) : undefined;
	return value === undefined || value === null ? undefined : String(value);
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
		// A 429 is either the request rate limit (comes with Retry-After) or a used-up
		// plan allowance (X-Billing-Code: limit_exceeded). Only the first is worth
		// retrying: the allowance won't come back until the billing period resets.
		const quotaExhausted =
			statusCode === 429 && headerOf(response, 'x-billing-code') === 'limit_exceeded';
		const rateLimited = statusCode === 429 && !quotaExhausted;
		// A query the search backend can't parse fails the same way every time,
		// so it is reported straight away instead of being retried.
		const deterministic = /cannot parse/i.test(detail);

		if (rateLimited && attempt < MAX_RATE_LIMIT_ATTEMPTS) {
			const retryAfter = Number(headerOf(response, 'retry-after'));
			const waitSeconds =
				Number.isFinite(retryAfter) && retryAfter > 0
					? Math.min(retryAfter, MAX_RETRY_AFTER_SECONDS)
					: 2 ** (attempt - 1);
			await sleep(waitSeconds * 1000);
			continue;
		}
		if (statusCode >= 500 && !deterministic && attempt < MAX_SERVER_ERROR_ATTEMPTS) {
			await sleep(1000 * 2 ** (attempt - 1));
			continue;
		}

		let message = `Hirebase API error (HTTP ${statusCode})`;
		let description = detail || undefined;
		if (statusCode === 403 && headerOf(response, 'x-billing-code') === 'feature_missing') {
			message = 'Your Hirebase plan does not include this operation';
			description = detail || undefined;
		} else if (statusCode === 401 || statusCode === 403) {
			message = 'Hirebase rejected the API key';
			description = 'Check the API key in the Hirebase credential (app.hirebase.org → Settings → API).';
		} else if (statusCode === 404) {
			message = 'Not found in Hirebase';
		} else if (statusCode === 422 || deterministic) {
			message = 'Hirebase rejected the request parameters';
		} else if (quotaExhausted) {
			message = 'Your Hirebase plan allowance is used up for this period';
			// The API's message says how many units are left, so a smaller Limit may still fit.
			description = detail || 'See your usage and upgrade at app.hirebase.org.';
		} else if (rateLimited) {
			message = 'Hirebase rate limit reached (100 requests per minute)';
			description = 'Space out the workflow, for example with a Wait node between batches.';
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
