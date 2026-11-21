import type { DnsRecordType } from '../types/dns';

const IPV4_REGEX =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

const HOSTNAME_REGEX =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

export interface SanitizedInputResult {
  domain: string;
  isValid: boolean;
  isIpAddress: boolean;
  wasModified: boolean;
  apexDomain: string;
  reason?: string;
}

export function sanitizeDomainInput(
  raw: string,
  recordType?: DnsRecordType
): SanitizedInputResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      domain: '',
      isValid: false,
      isIpAddress: false,
      wasModified: false,
      apexDomain: '',
      reason: 'Enter a domain name or paste a URL to look up.',
    };
  }

  let candidate = trimmed.toLowerCase();

  // Strip scheme (http://, https://, ftp://, mailto:)
  candidate = candidate.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  candidate = candidate.replace(/^mailto:/i, '');

  // Strip userinfo (user:pass@)
  const atIdx = candidate.lastIndexOf('@');
  if (atIdx !== -1 && candidate.indexOf('/') === -1) {
    candidate = candidate.slice(atIdx + 1);
  } else if (atIdx !== -1 && atIdx < candidate.indexOf('/')) {
    candidate = candidate.slice(atIdx + 1);
  }

  // Strip path, query string, and hash
  candidate = candidate.split(/[/?#]/)[0] ?? '';

  // Strip port if present (e.g., example.com:8443)
  if (!candidate.startsWith('[')) {
    candidate = candidate.replace(/:\d+$/, '');
  }

  // Strip trailing dots
  candidate = candidate.replace(/\.+$/, '');

  const wasModified = candidate !== trimmed.toLowerCase();

  if (IPV4_REGEX.test(candidate)) {
    if (recordType === 'PTR') {
      const reversed = candidate.split('.').reverse().join('.') + '.in-addr.arpa';
      return {
        domain: reversed,
        isValid: true,
        isIpAddress: true,
        wasModified: true,
        apexDomain: reversed,
      };
    }
    return {
      domain: candidate,
      isValid: false,
      isIpAddress: true,
      wasModified,
      apexDomain: candidate,
      reason: 'IPv4 addresses are supported in PTR (Reverse DNS) mode. Enter a domain name for forward records.',
    };
  }

  if (!HOSTNAME_REGEX.test(candidate)) {
    return {
      domain: candidate,
      isValid: false,
      isIpAddress: false,
      wasModified,
      apexDomain: candidate,
      reason: 'Enter a valid domain name such as www.dnslocator.online or dnslocator.online.',
    };
  }

  const parts = candidate.split('.');
  const apexDomain = parts.length > 2 ? parts.slice(-2).join('.') : candidate;

  return {
    domain: candidate,
    isValid: true,
    isIpAddress: false,
    wasModified,
    apexDomain,
  };
}

export function formatTtl(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const rem = seconds % 60;
    return rem ? `${mins}m ${rem}s` : `${mins}m`;
  }
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
}
