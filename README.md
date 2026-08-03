# OpsFactor Community Frontend

The OpsFactor Community frontend is a Vue and Vite single-page application
for the source-available Community edition of OpsFactor.

It is distributed under the [Sustainable Use License 1.0](LICENSE.md). This
is source-available software, not an OSI-approved open-source project.
Practical licensing examples are available in the
[Community licensing FAQ](https://docs.opsfactor.com/documentation/community/licensing-faq/).

## Version

The initial public baseline is **0.1.0**. The initial release source is
identified by the `v0.1.0` Git tag.

## Scope

- Community demand planning, heuristic supply planning, data upload, and
  material/location Planning Books.
- Simple login and Community runtime information.
- Enterprise-only choices may be displayed as disabled discovery affordances;
  they must not enable an Enterprise API call or bundle Enterprise components.

The backend is maintained separately in
[`opsfactor-community`](../opsfactor-community). Enterprise frontend routes
and components belong to the private Enterprise frontend repository.

## Development

```powershell
npm install
npm run typecheck
npm run test:contracts
npm run build
```

For local development, provide the backend target explicitly:

```powershell
$env:VITE_API_PROXY_TARGET = 'http://127.0.0.1:5010'
npm run dev -- --host 127.0.0.1 --port 5174
```

The backend Community configuration named `Community WebApplication - Dev
5010` uses only its `dev` profile and an isolated local port. Do not add
external datasource credentials to this configuration.
