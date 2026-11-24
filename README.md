# n8n-nodes-hirebase

This is an [n8n](https://n8n.io) community node for [Hirebase](https://www.hirebase.org). Use it in n8n workflows to:

- search job postings taken from employers' own career pages and ATS boards,
- find companies and see which ones are hiring,
- get job-market insights (pay, top employers, skills, remote share) for any search.

The node can also be used as a tool by n8n AI agents.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Usage](#usage) · [Resources](#resources)

## Installation

In n8n, open **Settings → Community Nodes → Install** and enter `n8n-nodes-hirebase`.
See the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) for details.

## Credentials

You need a Hirebase API key. It starts with `hb_`.

1. Sign in at [app.hirebase.org](https://app.hirebase.org) and open **Settings → API** to copy your key.
2. In n8n, create a **Hirebase API** credential and paste the key.
3. Click **Test**. The test reads your usage summary, which does not use any plan allowance.

## Operations

| Resource | Operation | What it does |
| --- | --- | --- |
| Job | Search | Search open postings by job title, keywords, location, remote/hybrid, salary, experience, industry, company, ATS platform, visa sponsorship and posting date. Results are paged automatically. |
| Job | Get | Get one posting by its Hirebase ID, with the full description and application link. |
| Company | Search | Find companies by name, industry, size, type, funding stage, headquarters or keywords. |
| Company | Get | Get one company by its slug (for example `stripe`) with a sample of its open jobs. |
| Company | Get Jobs | List a company's open jobs, optionally filtered by job category or ATS platform. |
| Market Insight | Get | Aggregate statistics for any job search: posting count, salary percentiles and histogram, pay by level, top companies, skills, locations and more. |
| Market Insight | Get for Company | The same statistics for one company's postings. |
| Account | Get Usage | Your plan meters: what you have used this period and what is left. |

### Plan usage

Each job returned (Job Search, Job Get, Company Get Jobs) uses one unit of your plan's jobs allowance. Each company returned by Company Search, and each Company Get, uses one companies unit.
Market Insight calls use the separate insights allowance, one per call.
**Return All** is capped at 10,000 jobs or 1,000 companies per run. Use **Limit** to keep scheduled workflows inside your plan.

## Usage

### Example: new remote Python jobs every morning

1. **Schedule Trigger**: every day at 08:00.
2. **Hirebase** → Job → Search
   - Limit: `50`
   - Filters → Job Titles: `Python Developer, Backend Engineer`
   - Filters → Location Types: `Remote`
   - Filters → Posted Within (Days): `1`
3. Send the results to Slack, Google Sheets or your CRM.

### Example: hiring signals for a list of accounts

1. Read company slugs or names from a Google Sheet.
2. **Hirebase** → Company → Get Jobs, with Company Slug set to `{{ $json.slug }}`.
3. Count the jobs per company to flag the ones that are hiring.

### Tips

- **Job Titles**, **Keywords** and **Company Names** take comma-separated lists. Blank entries are ignored.
- **Locations** takes city, region and country. Use full region names (`Texas`, not `TX`).
- **Posted On or After** overrides **Posted Within (Days)** when both are set.
- A job's ID is the `_id` field of a search result. A company's slug is its `company_slug` field.
- Hirebase allows 100 requests per minute per API key. The node spaces paged requests, waits and retries when it hits the rate limit, and retries server errors. It does not retry when your plan allowance is used up; it stops with a clear error instead.

## Compatibility

Built with `@n8n/node-cli` 0.56 against `n8n-workflow` 2.x. Requires an n8n version that supports community nodes.

## Resources

- [Hirebase API documentation](https://www.hirebase.org/docs)
- [Hirebase](https://www.hirebase.org)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE.md)
