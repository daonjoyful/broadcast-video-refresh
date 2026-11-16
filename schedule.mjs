// Executed only in the dedicated public repository's single-concurrency workflow.
// A quota slot is persisted to the repository before any API request is made.
export function pacificDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function reserve(state, now = new Date()) {
  const day = pacificDay(now);
  if (state && (typeof state.day !== 'string' || !Number.isInteger(state.used) || state.used < 0 || state.used > 20 || !Number.isInteger(state.next) || state.next < 0)) throw new Error('Invalid quota state');
  const used = state?.day === day ? state.used : 0;
  const next = state?.next || 0;
  if (used >= 20) return { allowed: false, state: { day, used, next } };
  return { allowed: true, state: { day, used: used + 1, next: next + 1 }, selection: next };
}
