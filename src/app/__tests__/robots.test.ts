import { describe, it, expect } from 'vitest';
import robots from '../robots';
import { SITE_URL } from '@/lib/site';

/**
 * The robots.txt must not block crawling – a page a crawler cannot read cannot be indexed either.
 * It is also the only place from which a crawler learns about the sitemap. What is checked here is
 * the delivery itself – the served headers and meta tags are checked by e2e/seo.spec.ts.
 */

describe('robots.txt', () => {
  it('allows everyone to crawl the whole site', () => {
    expect(robots().rules).toEqual([{ userAgent: '*', allow: '/' }]);
  });

  it('contains no disallow-all rule', () => {
    const rules = robots().rules as Array<{ disallow?: string | string[] }>;
    const excludedRules = rules.filter((rule) => {
      const value = rule.disallow;
      const list = Array.isArray(value) ? value : [value];

      return list.includes('/');
    });

    expect(excludedRules).toHaveLength(0);
  });

  it('points at the sitemap of the same host', () => {
    const { sitemap } = robots();

    expect(sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(new URL(String(sitemap)).origin).toBe(SITE_URL);
  });
});
