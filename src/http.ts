// Outgoing requests. GeonicDB's firewall (AWS WAF) refuses requests without a
// User-Agent with 403, and Workers send none by default, so every request
// from the demo carries one. A wrapper also keeps `fetch` unbound from any
// object ("Illegal invocation", see Broker).

export const USER_AGENT = 'pointsman-demo (+https://github.com/geolonia/pointsman-demo)';

export const fetchWithAgent: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  if (!headers.has('user-agent')) headers.set('user-agent', USER_AGENT);
  return fetch(input, { ...init, headers });
};
