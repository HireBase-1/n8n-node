import type { INodeProperties } from 'n8n-workflow';
import { jobFilterOptions } from '../JobFilters';

export const insightOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['marketInsight'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description:
					'Get salary percentiles, pay by level, top hiring companies, top skills and posting volume for any set of job filters',
				action: 'Get job market insights',
			},
			{
				name: 'Get for Company',
				value: 'getForCompany',
				description: 'Get the same insights for one company\'s open jobs',
				action: 'Get job market insights for a company',
			},
		],
		default: 'get',
	},
];

export const insightFields: INodeProperties[] = [
	{
		displayName: 'Company Slug',
		name: 'companySlug',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. stripe',
		description:
			'The company\'s Hirebase slug (the <code>company_slug</code> field of a job or company result)',
		displayOptions: { show: { resource: ['marketInsight'], operation: ['getForCompany'] } },
	},
	{
		displayName:
			'Each call uses one insights query from your Hirebase plan, which has its own allowance separate from job searches',
		name: 'insightsNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { resource: ['marketInsight'] } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['marketInsight'] } },
		options: [
			...jobFilterOptions,
			{
				displayName: 'Top Companies Limit',
				name: 'topCompaniesLimit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 10,
				description: 'How many of the companies with the most open roles to list',
			},
		],
	},
];
