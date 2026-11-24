import type { INodeProperties } from 'n8n-workflow';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['account'] } },
		options: [
			{
				name: 'Get Usage',
				value: 'getUsage',
				description: 'Get your Hirebase plan and how much of each allowance is used this period',
				action: 'Get account usage',
			},
		],
		default: 'getUsage',
	},
];
