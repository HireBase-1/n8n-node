import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { accountOperations } from './descriptions/AccountDescription';
import { companyFields, companyOperations } from './descriptions/CompanyDescription';
import { insightFields, insightOperations } from './descriptions/InsightDescription';
import { jobFields, jobOperations } from './descriptions/JobDescription';
import {
	hirebaseApiRequest,
	hirebaseApiRequestAllItems,
	splitList,
	toGeoLocations,
} from './GenericFunctions';
import { buildJobFilters } from './JobFilters';

// Search results are paged; "Return All" still stops here so one run can't
// drain a plan. Company search never reports more than 1,000 matches.
const MAX_JOBS = 10000;
const MAX_COMPANIES = 1000;

const JOB_ID = /^[a-f0-9]{24}$/i;

function slugPath(this: IExecuteFunctions, itemIndex: number): string {
	const slug = (this.getNodeParameter('companySlug', itemIndex) as string).trim().toLowerCase();
	if (!slug) {
		throw new NodeOperationError(this.getNode(), 'Company Slug is empty', { itemIndex });
	}
	return encodeURIComponent(slug);
}

function resultLimit(this: IExecuteFunctions, itemIndex: number, max: number): number {
	const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
	if (returnAll) return max;
	return Math.min(this.getNodeParameter('limit', itemIndex) as number, max);
}

function buildCompanySearch(this: IExecuteFunctions, itemIndex: number): IDataObject {
	const query = (this.getNodeParameter('query', itemIndex) as string).trim();
	const filters = this.getNodeParameter('filters', itemIndex) as IDataObject;
	const payload: IDataObject = {};
	const set = (key: string, value: unknown) => {
		if (value === undefined || value === null || value === '') return;
		if (Array.isArray(value) && value.length === 0) return;
		payload[key] = value;
	};

	set('query', query);
	set(
		'company_name',
		typeof filters.companyName === 'string' ? filters.companyName.trim() : undefined,
	);
	set('keywords', splitList(filters.keywords));
	set('industries', filters.industries);
	set('company_types', filters.companySizes);
	set('types', filters.companyTypes);
	set('funding_types', filters.fundingTypes);
	set('hq_geolocations', toGeoLocations(filters.locations));
	set('company_link', typeof filters.website === 'string' ? filters.website.trim() : undefined);

	// With no filters the API returns an arbitrary slice of its whole company
	// index, which is never what a workflow wants and still uses plan units.
	if (Object.keys(payload).length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'Set a search query or at least one filter to search companies',
			{ itemIndex },
		);
	}
	payload.hide_recruiter_agencies = filters.hideRecruitingAgencies !== false;
	return payload;
}

export class Hirebase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hirebase',
		name: 'hirebase',
		icon: { light: 'file:../../icons/hirebase.svg', dark: 'file:../../icons/hirebase.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			"Search job postings from employers' own career pages, find hiring companies and get job-market insights",
		defaults: {
			name: 'Hirebase',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'hirebaseApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Company', value: 'company' },
					{ name: 'Job', value: 'job' },
					{ name: 'Market Insight', value: 'marketInsight' },
				],
				default: 'job',
			},
			...accountOperations,
			...companyOperations,
			...companyFields,
			...insightOperations,
			...insightFields,
			...jobOperations,
			...jobFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let results: IDataObject[] = [];

				if (resource === 'job' && operation === 'search') {
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					const options = this.getNodeParameter('options', i) as IDataObject;
					const body = buildJobFilters(filters);
					if (options.sortBy) body.sort_by = options.sortBy;
					if (options.sortOrder) body.sort_order = options.sortOrder;
					if (options.includeRawDescription === true) body.return_raw_description = 'true';

					const max = resultLimit.call(this, i, MAX_JOBS);
					results = await hirebaseApiRequestAllItems.call(
						this,
						async (page, limit) =>
							await hirebaseApiRequest.call(this, 'POST', '/v2/jobs/search', {
								...body,
								page,
								limit,
							}),
						'jobs',
						max,
						'_id',
					);
				} else if (resource === 'job' && operation === 'get') {
					const jobId = (this.getNodeParameter('jobId', i) as string).trim();
					if (!JOB_ID.test(jobId)) {
						throw new NodeOperationError(this.getNode(), `"${jobId}" is not a Hirebase job ID`, {
							itemIndex: i,
							description: 'A job ID is 24 letters and digits, like 6af55e1e8dd6a035df301b67.',
						});
					}
					results = [await hirebaseApiRequest.call(this, 'GET', `/v2/jobs/${jobId}`)];
				} else if (resource === 'company' && operation === 'search') {
					const body = buildCompanySearch.call(this, i);
					const max = resultLimit.call(this, i, MAX_COMPANIES);
					results = await hirebaseApiRequestAllItems.call(
						this,
						async (page, limit) =>
							await hirebaseApiRequest.call(this, 'POST', '/v2/hirebase/companies/search', {
								...body,
								page,
								limit,
							}),
						'companies',
						max,
						'company_slug',
					);
				} else if (resource === 'company' && operation === 'get') {
					const data = await hirebaseApiRequest.call(
						this,
						'GET',
						`/v2/hirebase/companies/${slugPath.call(this, i)}`,
					);
					results = [{ ...((data.company as IDataObject) ?? {}), jobs: data.jobs }];
				} else if (resource === 'company' && operation === 'getJobs') {
					const path = `/v2/hirebase/companies/${slugPath.call(this, i)}/jobs`;
					const jobFilters = this.getNodeParameter('jobFilters', i) as IDataObject;
					const qs: IDataObject = {};
					if (jobFilters.jobCategory) qs.job_category = jobFilters.jobCategory;
					if (jobFilters.atsPlatform) qs.job_board = jobFilters.atsPlatform;

					const max = resultLimit.call(this, i, MAX_JOBS);
					results = await hirebaseApiRequestAllItems.call(
						this,
						async (page, limit) =>
							await hirebaseApiRequest.call(this, 'GET', path, undefined, { ...qs, page, limit }),
						'jobs',
						max,
						'_id',
					);
				} else if (resource === 'marketInsight') {
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					const body = buildJobFilters(filters);
					if (filters.topCompaniesLimit) body.top_companies_limit = filters.topCompaniesLimit;
					const endpoint =
						operation === 'getForCompany'
							? `/v2/hirebase/companies/${slugPath.call(this, i)}/insights`
							: '/v2/jobs/insights';
					results = [await hirebaseApiRequest.call(this, 'POST', endpoint, body)];
				} else if (resource === 'account' && operation === 'getUsage') {
					results = [await hirebaseApiRequest.call(this, 'GET', '/v2/billing/usage/summary')];
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for "${resource}"`,
						{ itemIndex: i },
					);
				}

				for (const json of results) {
					returnData.push({ json, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Errors raised above are already NodeApiError/NodeOperationError; this
				// attaches the item index without losing their message or description.
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
