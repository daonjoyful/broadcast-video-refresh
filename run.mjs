import { reserve } from './schedule.mjs';
const site = 'https://broadcast-channel-guide.pages.dev';
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const secret = process.env.REFRESH_SECRET;
if (!repo || !token || !secret || secret.length < 32) throw new Error('Required workflow settings are missing');
const api = `https://api.github.com/repos/${repo}/contents/quota-state.json`;
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'broadcast-video-refresh' };
const old = await fetch(api, { headers });
if (!old.ok && old.status !== 404) throw new Error(`Cannot read quota state (${old.status})`);
const entry = old.ok ? await old.json() : null;
const state = entry ? JSON.parse(Buffer.from(entry.content.replace(/\s/g, ''), 'base64').toString('utf8')) : null;
const reservation = reserve(state);
if (reservation.allowed) {
  const response = await fetch(api, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '[CI Skip] Reserve video search slot', content: Buffer.from(JSON.stringify(reservation.state)).toString('base64'), ...(entry ? { sha: entry.sha } : {}) }) });
  if (!response.ok) throw new Error(`Cannot reserve quota slot (${response.status})`);
}
let item = null;
if (reservation.allowed) {
  const chart = await fetch(site + '/weekly-rankings.json');
  if (chart.ok) {
    const body = await chart.json();
    const rows = (Array.isArray(body.rows) ? body.rows : []).filter(row => typeof row.title === 'string' && typeof row.channel === 'string');
    if (rows.length) item = rows[reservation.selection % rows.length];
  }
}
const refreshed = await fetch(site + '/api/scheduled-video-refresh', {
  method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ item: item && { title: item.title, channel: item.channel }, day: reservation.state.day, searchesReserved: reservation.state.used })
});
if (!refreshed.ok) throw new Error(`Video refresh failed (${refreshed.status})`);
console.log('Scheduled refresh completed');
