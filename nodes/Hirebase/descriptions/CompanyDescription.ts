import type { INodeProperties } from 'n8n-workflow';
import { ATS_PLATFORMS, COMPANY_SIZES, COMPANY_TYPES, FUNDING_TYPES, INDUSTRIES, JOB_CATEGORIES } from '../enums';
import { locationCollection } from '../JobFilters';

const companySlug: INodeProperties = {
	displayName: 'Company Slug',
	name: 'companySlug',
	type: 'string',
	required: true,
	default: '',
	placeholder: 'e.g. stripe',
	description:
		'The company\'s Hirebase slug (the <code>company_slug</code> field of a job or company result)',
};

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['company'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a company profile: website, LinkedIn, headquarters, size, industries and funding',
				action: 'Get a company',
			},
			{
				name: 'Get Jobs',
				value: 'getJobs',
				description: 'Get the jobs a company has open',
				action: 'Get a company s open jobs',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Find companies by industry, size, headquarters, funding or keywords',
				action: 'Search companies',
			},
		],
		default: 'search',
	},
];

export const companyFields: INodeProperties[] = [
	// company:get, company:getJobs
	{
		...companySlug,
		displayOptions: { show: { resource: ['company'], operation: ['get', 'getJobs'] } },
	},

	// company:search
	{
		displayName: 'Search Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'e.g. fintech payments',
		description: 'Free-text search across company names and descriptions',
		displayOptions: { show: { resource: ['company'], operation: ['search'] } },
	},

	// company:search, company:getJobs
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['company'], operation: ['search', 'getJobs'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: { resource: ['company'], operation: ['search', 'getJobs'], returnAll: [false] },
		},
	},

	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['company'], operation: ['search'] } },
		options: [
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				placeholder: 'e.g. Stripe',
			},
			{
				displayName: 'Company Sizes',
				name: 'companySizes',
				type: 'multiOptions',
				options: COMPANY_SIZES,
				default: [],
				description: 'Employee headcount',
			},
			{
				displayName: 'Company Types',
				name: 'companyTypes',
				type: 'multiOptions',
				options: COMPANY_TYPES,
				default: [],
			},
			{
				displayName: 'Funding Types',
				name: 'fundingTypes',
				type: 'multiOptions',
				options: FUNDING_TYPES,
				default: [],
				description: 'Latest funding round',
			},
			{
				displayName: 'Hide Recruiting Agencies',
				name: 'hideRecruitingAgencies',
				type: 'boolean',
				default: true,
				description: 'Whether to leave out staffing and recruiting agencies',
			},
			locationCollection(
				'Headquarters',
				'Where the company is headquartered. Use full region names ("Texas", not "TX").',
			),
			{
				displayName: 'Industries',
				name: 'industries',
				type: 'multiOptions',
				options: INDUSTRIES,
				default: [],
			},
			{
				displayName: 'Keywords',
				name: 'keywords',
				type: 'string',
				default: '',
				placeholder: 'e.g. payments, B2B',
				description: 'Comma-separated keywords describing the company',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				placeholder: 'e.g. stripe.com',
				description: 'Find the company with this website',
			},
		],
	},

	{
		displayName: 'Filters',
		name: 'jobFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['company'], operation: ['getJobs'] } },
		options: [
			{
				displayName: 'ATS Platform',
				name: 'atsPlatform',
				type: 'options',
				options: ATS_PLATFORMS,
				default: 'greenhouse',
				description: 'Only jobs posted through this applicant tracking system',
			},
			{
				displayName: 'Job Category',
				name: 'jobCategory',
				type: 'options',
				options: JOB_CATEGORIES,
				default: 'Software Engineer Jobs',
			},
		],
	},
];
