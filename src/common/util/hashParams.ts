import * as crypto from 'crypto';

function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',')}}`;
}

export function hashParams(params: Record<string, any>): string {
  const s = stableStringify(params || {});
  return crypto.createHash('sha1').update(s).digest('hex');
}
