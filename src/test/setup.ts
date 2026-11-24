const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => { store[k] = String(v) },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length },
}
// @ts-ignore
globalThis.localStorage = localStorageMock as any
// @ts-ignore
if (typeof window !== 'undefined') window.localStorage = localStorageMock as any