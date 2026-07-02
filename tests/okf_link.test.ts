import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OkfLink } from '../src/misc/okf_link.js';

describe('OkfLink.resolveBundleLink', () => {
	it('resolves absolute in-bundle links from the bundle root', () => {
		assert.deepEqual(OkfLink.resolveBundleLink('/a.md', 'dir/b.md'), { id: 'a', file: 'a.md' });
	});
	it('resolves relative links against the source file directory', () => {
		assert.deepEqual(OkfLink.resolveBundleLink('./c.md', 'dir/b.md'), { id: 'dir/c', file: 'dir/c.md' });
		assert.deepEqual(OkfLink.resolveBundleLink('../e.md', 'dir/b.md'), { id: 'e', file: 'e.md' });
	});
	it('strips anchors before resolving', () => {
		assert.deepEqual(OkfLink.resolveBundleLink('/a.md#section', 'dir/b.md'), { id: 'a', file: 'a.md' });
	});
	it('returns null for anchors, external, non-md, and escaping targets', () => {
		assert.equal(OkfLink.resolveBundleLink('#x', 'a.md'), null);
		assert.equal(OkfLink.resolveBundleLink('https://x.com/y.md', 'a.md'), null);
		assert.equal(OkfLink.resolveBundleLink('./img.png', 'a.md'), null);
		assert.equal(OkfLink.resolveBundleLink('../../outside.md', 'a.md'), null);
	});
});
