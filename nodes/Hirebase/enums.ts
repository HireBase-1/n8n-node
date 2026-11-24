import type { INodePropertyOptions } from 'n8n-workflow';

// Values accepted by the Hirebase API, verified live against api.hirebase.org.

const asOptions = (values: string[]): INodePropertyOptions[] =>
	values.map((value) => ({ name: value, value }));

export const JOB_CATEGORIES = asOptions([
	'Accounting, Payroll & Financial Planning Jobs',
	'Administration Jobs',
	'Arts and Design Jobs',
	'Banking Jobs',
	'Business Development Jobs',
	'Business Operations & Strategy Jobs',
	'Community and Social Services Jobs',
	'Consulting Jobs',
	'Culinary Jobs',
	'Customer Support & Success Jobs',
	'Data Analyst Jobs',
	'Driver and Delivery Jobs',
	'Education Jobs',
	'Engineering Jobs',
	'Finance Jobs',
	'Healthcare Services Jobs',
	'Hospitality Jobs',
	'Human Resources Jobs',
	'Information Technology Jobs',
	'Insurance Jobs',
	'IT Support Jobs',
	'Legal Jobs',
	'Marketing Jobs',
	'Media and Communication Jobs',
	'Operations Jobs',
	'Product Jobs',
	'Project & Program Management Jobs',
	'Purchasing Jobs',
	'Quality Assurance Jobs',
	'Real Estate Jobs',
	'Recruitment Jobs',
	'Research Jobs',
	'Retail Jobs',
	'Risk and Compliance Jobs',
	'Sales Jobs',
	'Security Engineer Jobs',
	'Skilled Trade Jobs',
	'Software Engineer Jobs',
	'Support Engineer Jobs',
]);

export const INDUSTRIES = asOptions([
	'Agriculture',
	'Arts',
	'Construction',
	'Consumer Goods',
	'Corporate Services',
	'Design',
	'Education',
	'Energy & Mining',
	'Entertainment',
	'Finance',
	'Healthcare',
	'Legal',
	'Manufacturing',
	'Media & Communications',
	'Nonprofit',
	'Other',
	'Public Administration',
	'Public Safety',
	'Real Estate',
	'Recreation & Travel',
	'Retail',
	'Retail & Wholesale',
	// Comma, not a slash: the API rejects "Tech/Software & IT Services".
	'Tech, Software & IT Services',
	'Transportation & Logistics',
	'Wellness & Fitness',
]);

export const ATS_PLATFORMS: INodePropertyOptions[] = [
	{ name: 'ADP Workforce Now', value: 'adp' },
	{ name: 'Ashby', value: 'ashby' },
	{ name: 'BambooHR', value: 'bamboohr' },
	{ name: 'Dayforce', value: 'dayforce' },
	{ name: 'Eightfold', value: 'eightfold' },
	{ name: 'Greenhouse', value: 'greenhouse' },
	{ name: 'iCIMS', value: 'icims' },
	{ name: 'JazzHR', value: 'jazzhr' },
	{ name: 'Jobvite', value: 'jobvite' },
	{ name: 'Lever', value: 'lever' },
	{ name: 'Oracle Cloud (Taleo Cloud)', value: 'oraclecloud' },
	{ name: 'Paycom', value: 'paycom' },
	{ name: 'Paylocity', value: 'paylocity' },
	{ name: 'Personio', value: 'personio' },
	{ name: 'Recruitee', value: 'recruitee' },
	{ name: 'Rippling', value: 'rippling' },
	{ name: 'SAP SuccessFactors', value: 'successfactors' },
	{ name: 'SmartRecruiters', value: 'smartrecruiters' },
	{ name: 'Taleo', value: 'taleo' },
	{ name: 'Teamtailor', value: 'teamtailor' },
	{ name: 'Workable', value: 'workable' },
	{ name: 'Workday', value: 'workday' },
];

export const LOCATION_TYPES = asOptions(['Hybrid', 'In-Person', 'Remote']);

export const JOB_TYPES = asOptions(['Contract', 'Full Time', 'Internship', 'Part Time']);

export const EXPERIENCE_LEVELS = asOptions(['Entry', 'Executive', 'Junior', 'Mid', 'Senior']);

// Headcount buckets. The API doesn't validate these: an unknown bucket fails the
// search with a server error, so the list is fixed rather than free text.
export const COMPANY_SIZES = asOptions([
	'1-10',
	'11-50',
	'51-200',
	'201-500',
	'501-1000',
	'1001-5000',
	'5001-10000',
	'10000+',
]);

export const COMPANY_TYPES = asOptions([
	'Academic',
	'Enterprise',
	'Franchise',
	'Government',
	'Mid-Size',
	'Non-Profit',
	'Other',
	'Small Business',
	'Startup',
]);

export const FUNDING_TYPES = asOptions([
	'Angel',
	'Convertible note',
	'Corporate round',
	'Debt financing',
	'Equity crowdfunding',
	'Grant',
	'Non equity assistance',
	'Post IPO debt',
	'Post IPO equity',
	'Post IPO secondary',
	'Pre seed',
	'Private equity',
	'Secondary market',
	'Seed',
	'Series A',
	'Series B',
	'Series C',
	'Series D',
	'Series E',
	'Series F',
	'Series G',
	'Series H',
	'Series unknown',
	'Undisclosed',
]);

export const CURRENCIES = asOptions([
	'AUD',
	'BRL',
	'CAD',
	'CHF',
	'DKK',
	'EUR',
	'GBP',
	'INR',
	'JPY',
	'NOK',
	'PLN',
	'SEK',
	'SGD',
	'USD',
]);
