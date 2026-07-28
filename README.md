# ChatVerse

## Reliable international voice and video calls

WebRTC needs a TURN relay when callers are on restrictive mobile, corporate, or
carrier networks. STUN alone cannot reliably connect users in locations such as
China and Nigeria. Deploy a TURN server reachable from both countries (for
example, coturn in a nearby globally accessible region) and add these variables
to the API deployment:

```env
TURN_URLS=turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp,turns:turn.example.com:5349?transport=tcp
TURN_SHARED_SECRET=replace-with-a-long-random-coturn-static-auth-secret
TURN_CREDENTIAL_TTL_SECONDS=3600
STUN_URLS=stun:stun.cloudflare.com:3478,stun:stun.l.google.com:19302
```

Configure coturn with the same `TURN_SHARED_SECRET` using
`use-auth-secret` and `static-auth-secret`. Open TCP/UDP `3478`, TCP `5349`,
and the TURN UDP relay port range (commonly `49152-65535`) in its firewall.
The API issues short-lived TURN credentials only to signed-in users; do not put
the TURN secret or static credentials in `VITE_` variables.

For the best China connectivity, host or use a TURN provider that is reachable
from mainland China and offer both UDP and TCP/TLS TURN URLs. A server located
only in a blocked region cannot be fixed by frontend code alone.

### Managed TURN provider

If a provider gives you a static TURN username and credential, use these API
deployment variables instead of `TURN_SHARED_SECRET`:

```env
TURN_URLS=turn:provider-host:3478?transport=udp,turn:provider-host:3478?transport=tcp,turns:provider-host:443?transport=tcp
TURN_USERNAME=provider-issued-username
TURN_CREDENTIAL=provider-issued-password
```

Keep those values on the backend deployment only. Do not add them to Vercel or
any `VITE_` variable.

## Frontend development

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
