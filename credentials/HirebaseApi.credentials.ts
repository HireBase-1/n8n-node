import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HirebaseApi implements ICredentialType {
	name = 'hirebaseApi';

	displayName = 'Hirebase API';

	icon: Icon = { light: 'file:../icons/hirebase.svg', dark: 'file:../icons/hirebase.dark.svg' };

	documentationUrl = 'https://github.com/HireBase-1/n8n-node?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your Hirebase API key (starts with hb_). Find it in app.hirebase.org under Settings → API.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	// The usage summary is free (no plan units) and answers 401 to a bad key.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.hirebase.org',
			url: '/v2/billing/usage/summary',
			method: 'GET',
		},
	};
}
