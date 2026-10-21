// One-click login: stores refresh tokens (never passwords) for recently used accounts.
const KEY = 'saved_accounts'
export function getAccounts() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
export function saveAccount(a) {
  const rest = getAccounts().filter((x) => x.id !== a.id)
  localStorage.setItem(KEY, JSON.stringify([a, ...rest].slice(0, 5)))
}
export function forgetAccount(id) {
  localStorage.setItem(KEY, JSON.stringify(getAccounts().filter((x) => x.id !== id)))
}
