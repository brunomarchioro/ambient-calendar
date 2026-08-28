/** Workers reject `const f = fetch; f(url)` — call through global name instead. */
export const httpFetch: typeof fetch = (input, init) => fetch(input, init)
