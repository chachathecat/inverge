# Auth guidelines

- Do not change authentication endpoints, session handling, or RLS policies without a human-decision.
- Do not log or return user passwords, tokens, cookies, headers, or other sensitive credentials.
- Any change to authentication routes, token scopes, or permissions requires explicit human approval.
- Maintain strict separation between learner and instructor authentication flows.
