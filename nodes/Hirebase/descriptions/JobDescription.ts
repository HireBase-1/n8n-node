import type { INodeProperties } from 'n8n-workflow';
import { jobFilterOptions } from '../JobFilters';

export const jobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['job'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get one job posting with its full description and application link',
				action: 'Get a job posting',
			},
			{
				name: 'Search',
				value: 'search',
				description:
					'Search open job postings by title, keywords, location, salary, company and more',
				action: 'Search job postings',
			},
		],
		default: 'search',
	},
];

export const jobFields: INodeProperties[] = [
	// job:get
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 6af55e1e8dd6a035df301b67',
		description: "The job's Hirebase ID (the <code>_id</code> field of a search result)",
		displayOptions: { show: { resource: ['job'], operation: ['get'] } },
	},

	// job:search
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['job'], operation: ['search'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['job'], operation: ['search'], returnAll: [false] } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['job'], operation: ['search'] } },
		options: jobFilterOptions,
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['job'], operation: ['search'] } },
		options: [
			{
				displayName: 'Include Original Description HTML',
				name: 'includeRawDescription',
				type: 'boolean',
				default: false,
				description: "Whether to also return the posting's original HTML description",
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				options: [
					{ name: 'Company', value: 'company' },
					{ name: 'Date Posted', value: 'date_posted' },
					{ name: 'Relevance', value: 'relevance' },
					{ name: 'Salary', value: 'salary' },
					{ name: 'Years of Experience', value: 'yoe' },
				],
				default: 'relevance',
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'desc',
			},
		],
	},
];
