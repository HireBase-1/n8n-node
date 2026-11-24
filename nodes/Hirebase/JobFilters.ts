import type { IDataObject, INodeProperties } from 'n8n-workflow';
import {
	ATS_PLATFORMS,
	COMPANY_SIZES,
	CURRENCIES,
	EXPERIENCE_LEVELS,
	INDUSTRIES,
	JOB_CATEGORIES,
	JOB_TYPES,
	LOCATION_TYPES,
} from './enums';
import { splitList, toGeoLocations } from './GenericFunctions';

export const locationCollection = (displayName: string, description: string): INodeProperties => ({
	displayName,
	name: 'locations',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	default: {},
	description,
	options: [
		{
			displayName: 'Location',
			name: 'location',
			values: [
				{
					displayName: 'City',
					name: 'city',
					type: 'string',
					default: '',
					placeholder: 'e.g. Austin',
				},
				{
					displayName: 'Region',
					name: 'region',
					type: 'string',
					default: '',
					placeholder: 'e.g. Texas',
					description: 'State or region, written out in full ("Texas", not "TX")',
				},
				{
					displayName: 'Country',
					name: 'country',
					type: 'string',
					default: '',
					placeholder: 'e.g. United States',
				},
			],
		},
	],
});

// Filters shared by Job → Search and the Market Insight operations. Both
// endpoints take the same filter names.
export const jobFilterOptions: INodeProperties[] = [
	{
		displayName: 'ATS Platforms',
		name: 'atsPlatforms',
		type: 'multiOptions',
		options: ATS_PLATFORMS,
		default: [],
		description: 'Only jobs posted through these applicant tracking systems',
	},
	{
		displayName: 'Company Names',
		name: 'companyNames',
		type: 'string',
		default: '',
		placeholder: 'e.g. Stripe, Ramp',
		description: 'Comma-separated company names',
	},
	{
		displayName: 'Company Sizes',
		name: 'companySizes',
		type: 'multiOptions',
		options: COMPANY_SIZES,
		default: [],
		description: 'Employee headcount of the hiring company',
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'options',
		options: CURRENCIES,
		default: 'USD',
		description: 'Currency of the salary range filter',
	},
	{
		displayName: 'Experience Levels',
		name: 'experienceLevels',
		type: 'multiOptions',
		options: EXPERIENCE_LEVELS,
		default: [],
	},
	{
		displayName: 'Hide Recruiting Agencies',
		name: 'hideRecruitingAgencies',
		type: 'boolean',
		default: false,
		description: 'Whether to leave out jobs posted by staffing and recruiting agencies',
	},
	{
		displayName: 'Include Jobs Without Salary',
		name: 'includeJobsWithoutSalary',
		type: 'boolean',
		default: true,
		description: 'Whether to keep jobs that don\'t publish pay when a salary range is set',
	},
	{
		displayName: 'Industries',
		name: 'industries',
		type: 'multiOptions',
		options: INDUSTRIES,
		default: [],
	},
	{
		displayName: 'Job Categories',
		name: 'jobCategories',
		type: 'multiOptions',
		options: JOB_CATEGORIES,
		default: [],
	},
	{
		displayName: 'Job Titles',
		name: 'jobTitles',
		type: 'string',
		default: '',
		placeholder: 'e.g. Data Engineer, Analytics Engineer',
		description: 'Comma-separated job titles to match',
	},
	{
		displayName: 'Job Types',
		name: 'jobTypes',
		type: 'multiOptions',
		options: JOB_TYPES,
		default: [],
	},
	{
		displayName: 'Keywords',
		name: 'keywords',
		type: 'string',
		default: '',
		placeholder: 'e.g. Python, Snowflake',
		description: 'Comma-separated keywords to find in the job title or description',
	},
	locationCollection('Locations', 'Where the job is based. Leave a part blank to match more widely.'),
	{
		displayName: 'Location Types',
		name: 'locationTypes',
		type: 'multiOptions',
		options: LOCATION_TYPES,
		default: [],
		description: 'Remote, hybrid or in-person',
	},
	{
		displayName: 'Max Salary',
		name: 'salaryMax',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		description: 'Annual pay upper bound. 0 means no upper bound.',
	},
	{
		displayName: 'Max Years of Experience',
		name: 'yoeMax',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		description: 'Years of experience the job asks for, upper bound. 0 means no upper bound.',
	},
	{
		displayName: 'Min Salary',
		name: 'salaryMin',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		description: 'Annual pay lower bound. 0 means no lower bound.',
	},
	{
		displayName: 'Min Years of Experience',
		name: 'yoeMin',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		description: 'Years of experience the job asks for, lower bound',
	},
	{
		displayName: 'Posted On or After',
		name: 'postedOnOrAfter',
		type: 'dateTime',
		default: '',
		description: 'Only jobs posted on or after this date. Overrides Posted Within (Days).',
	},
	{
		displayName: 'Posted Within (Days)',
		name: 'postedWithinDays',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 7,
		description: 'Only jobs posted in the last this many days',
	},
	{
		displayName: 'Visa Sponsorship',
		name: 'visaSponsorship',
		type: 'options',
		options: [
			{ name: 'Any', value: 'any' },
			{ name: 'Offers Sponsorship', value: 'yes' },
			{ name: 'No Sponsorship', value: 'no' },
		],
		default: 'any',
	},
];

// job_titles is compiled into a boolean query server-side: an upper-case
// OR/AND/NOT token (e.g. the real title "OR Nurse") breaks the parser.
// Matching is case-insensitive, so lower-casing those words finds the same jobs.
const defuseQueryOperators = (title: string) =>
	title.replace(/\b(OR|AND|NOT)\b/g, (word) => word.toLowerCase());

/** Maps the node's job filters to Hirebase API parameter names. */
export function buildJobFilters(filters: IDataObject): IDataObject {
	const payload: IDataObject = {};
	const set = (key: string, value: unknown) => {
		if (value === undefined || value === null || value === '') return;
		if (Array.isArray(value) && value.length === 0) return;
		payload[key] = value;
	};

	set('keywords', splitList(filters.keywords));
	set('job_titles', splitList(filters.jobTitles)?.map(defuseQueryOperators));
	set('job_category', filters.jobCategories);
	set('location_types', filters.locationTypes);
	set('job_types', filters.jobTypes);
	set('experience', filters.experienceLevels);
	set('industry', filters.industries);
	set('job_board', filters.atsPlatforms);
	set('company_names', splitList(filters.companyNames));
	set('company_types', filters.companySizes);
	set('geo_locations', toGeoLocations(filters.locations));

	const salaryMin = Number(filters.salaryMin) || 0;
	const salaryMax = Number(filters.salaryMax) || 0;
	if (salaryMin > 0 || salaryMax > 0) {
		const salary: IDataObject = {};
		if (salaryMin > 0) salary.min = salaryMin;
		if (salaryMax > 0) salary.max = salaryMax;
		payload.salary = salary;
		set('currency', filters.currency);
	}
	// The API takes these flags as the strings "true"/"false".
	if (filters.includeJobsWithoutSalary === false) payload.include_no_salary = 'false';

	const yoeMin = Number(filters.yoeMin) || 0;
	const yoeMax = Number(filters.yoeMax) || 0;
	if (yoeMin > 0 || yoeMax > 0) {
		const yoe: IDataObject = {};
		if (yoeMin > 0) yoe.min = yoeMin;
		if (yoeMax > 0) yoe.max = yoeMax;
		payload.yoe = yoe;
	}

	if (filters.postedOnOrAfter) {
		payload.date_posted = String(filters.postedOnOrAfter).slice(0, 10);
	} else if (filters.postedWithinDays !== undefined) {
		set('days_ago', filters.postedWithinDays);
	}

	if (filters.visaSponsorship === 'yes') payload.visa = 'true';
	if (filters.visaSponsorship === 'no') payload.visa = 'false';
	if (filters.hideRecruitingAgencies === true) payload.hide_recruiting_agencies = 'true';
	// filter_incomplete_jobs is never sent: the API applies it whenever the key
	// is present, even as "false", and drops most results.

	return payload;
}
