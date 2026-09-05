import { describe, expect, it } from 'vitest';
import configText from '../public/staticwebapp.config.json?raw';

type StaticRoute = { route: string; headers?: Record<string, string> };
type StaticConfig = {
  globalHeaders: Record<string, string>;
  routes: StaticRoute[];
  navigationFallback?: unknown;
  responseOverrides?: Record<string, { rewrite?: string }>;
};

function deploymentConfig(): StaticConfig {
  return JSON.parse(configText) as StaticConfig;
}

describe('static deployment cache policy', () => {
  it('makes only fingerprinted build assets immutable and keeps the app shell revalidating', () => {
    const config = deploymentConfig();
    const headerFor = (route: string): string | undefined => config.routes.find(entry => entry.route === route)?.headers?.['Cache-Control'];

    expect(headerFor('/assets/*')).toBe('public, max-age=31536000, immutable');
    expect(config.globalHeaders['Cache-Control']).toBe('public, max-age=0, must-revalidate');
    expect(headerFor('/index.html')).toBe('public, max-age=0, must-revalidate');
    expect(headerFor('/sw.js')).toBe('public, max-age=0, must-revalidate');
    expect(headerFor('/offline.html')).toBe('public, max-age=0, must-revalidate');
  });

  it('serves security headers and preserves real 404 responses', () => {
    const config = deploymentConfig();
    expect(config.navigationFallback).toBeUndefined();
    expect(config.responseOverrides?.['404']?.rewrite).toBe('/404.html');
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(config.globalHeaders['Content-Security-Policy']).not.toContain('api.sociobot.in');
  });
});
