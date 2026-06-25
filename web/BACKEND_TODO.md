# EasySyndic Web Backend TODO

The web dashboard reuses existing NestJS endpoints whenever available. Missing or incomplete backend support:

- Super Admin aggregate KPIs: no dedicated `GET /super-admin/dashboard/stats` endpoint.
- Super Admin syndic list/filter: `GET /users` exists, but filtering by role may need backend query support.
- Create syndic: `POST /users` exists if DTO supports password/role; verify production DTO behavior.
- Assign syndic to residence: residence update exists, but a dedicated assignment workflow may be useful.
- Payment declarations page: `GET /syndic/payments/declarations?residenceId=` exists, but web currently needs selected residence context.
- Documents upload: `POST /syndic/documents` exists; richer delete/update document endpoints are missing.
- Web-friendly pagination/filtering endpoints are not standardized yet.
