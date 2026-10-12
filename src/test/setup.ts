import 'fake-indexeddb/auto';

// BlockRegistry fetches its catalog on import with a relative URL, which Node's fetch cannot resolve.
// Tests get an empty catalog. Any other relative URL fails loudly instead of silently.
const BLOCK_CATALOG_URL = '/data/canonical-blocks.json';
const realFetch = globalThis.fetch;

const testFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url === BLOCK_CATALOG_URL) {
    return Promise.resolve(new Response('{}', { headers: { 'content-type': 'application/json' } }));
  }
  if (url.startsWith('/')) {
    return Promise.reject(new Error(`Test fetch has no fixture for ${url}`));
  }
  return realFetch(input, init);
};

globalThis.fetch = testFetch;
