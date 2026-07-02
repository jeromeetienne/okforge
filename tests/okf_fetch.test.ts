import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OkfFetch } from '../src/misc/okf_fetch.js';

describe('OkfFetch.isUrl', () => {
	it('recognizes http(s) URLs', () => {
		assert.equal(OkfFetch.isUrl('https://x.com/bundle'), true);
		assert.equal(OkfFetch.isUrl('http://x.com'), true);
		assert.equal(OkfFetch.isUrl('/local/path'), false);
		assert.equal(OkfFetch.isUrl('./relative'), false);
	});
});

describe('OkfFetch.normalizeBase', () => {
	it('appends a trailing slash to a plain URL', () => {
		assert.equal(OkfFetch.normalizeBase('https://x.com/bundle'), 'https://x.com/bundle/');
		assert.equal(OkfFetch.normalizeBase('https://x.com/bundle/'), 'https://x.com/bundle/');
	});
	it('rewrites a GitHub tree URL to raw.githubusercontent.com', () => {
		assert.equal(
			OkfFetch.normalizeBase('https://github.com/owner/repo/tree/main/docs/.okf'),
			'https://raw.githubusercontent.com/owner/repo/refs/heads/main/docs/.okf/',
		);
	});
});

describe('OkfFetch.bundleName', () => {
	it('returns the last path segment of the normalized base', () => {
		assert.equal(OkfFetch.bundleName('https://x.com/foo/bar'), 'bar');
		assert.equal(OkfFetch.bundleName('https://github.com/owner/repo/tree/main/docs/kb'), 'kb');
	});
});

describe('OkfFetch.resolveTarget', () => {
	it('resolves absolute and relative in-bundle links', () => {
		assert.equal(OkfFetch.resolveTarget('/a.md', 'dir/b.md'), 'a.md');
		assert.equal(OkfFetch.resolveTarget('./c.md', 'dir/b.md'), 'dir/c.md');
		assert.equal(OkfFetch.resolveTarget('../e.md', 'dir/b.md'), 'e.md');
	});
	it('returns null for anchors, external, non-md, and escaping targets', () => {
		assert.equal(OkfFetch.resolveTarget('#x', 'a.md'), null);
		assert.equal(OkfFetch.resolveTarget('https://x.com/y.md', 'a.md'), null);
		assert.equal(OkfFetch.resolveTarget('./img.png', 'a.md'), null);
		assert.equal(OkfFetch.resolveTarget('../../outside.md', 'a.md'), null);
	});
});
