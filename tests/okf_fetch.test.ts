import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Fs from 'node:fs';
import Path from 'node:path';
import { OkfFetch } from '../src/misc/okf_fetch.js';
import { OkfGraph } from '../src/misc/okf_graph.js';

type MockEntry = { json?: unknown; text?: string };

/** Run `fn` with `globalThis.fetch` stubbed to serve `responses` by URL. */
async function withMockFetch(responses: Record<string, MockEntry>, fn: () => Promise<void>): Promise<void> {
	const original = globalThis.fetch;
	globalThis.fetch = (async (input: unknown) => {
		const url = String(input);
		const entry = responses[url];
		if (entry === undefined) {
			return { ok: false, status: 404, json: async () => null, text: async () => '' };
		}
		return {
			ok: true,
			status: 200,
			json: async () => entry.json,
			text: async () => entry.text ?? '',
		};
	}) as typeof globalThis.fetch;
	try {
		await fn();
	} finally {
		globalThis.fetch = original;
	}
}

const GH_URL = 'https://github.com/owner/repo/tree/main/docs/.okf';
const API = 'https://api.github.com/repos/owner/repo/contents';
const RAW = 'https://raw.githubusercontent.com/owner/repo/refs/heads/main/docs/.okf';

const CONTENTS: Record<string, MockEntry> = {
	[`${API}/docs/.okf?ref=main`]: {
		json: [
			{ type: 'file', name: 'index.md', path: 'docs/.okf/index.md', download_url: 'https://dl/index.md' },
			{ type: 'file', name: 'log.md', path: 'docs/.okf/log.md', download_url: 'https://dl/log.md' },
			{ type: 'file', name: 'a.md', path: 'docs/.okf/a.md', download_url: 'https://dl/a.md' },
			{ type: 'file', name: 'orphan.md', path: 'docs/.okf/orphan.md', download_url: 'https://dl/orphan.md' },
			{ type: 'dir', name: 'sub', path: 'docs/.okf/sub', download_url: null },
		],
	},
	[`${API}/docs/.okf/sub?ref=main`]: {
		json: [
			{ type: 'file', name: 'nested.md', path: 'docs/.okf/sub/nested.md', download_url: 'https://dl/sub/nested.md' },
		],
	},
	'https://dl/index.md': { text: '# Bundle\n[a](./a.md)\n' },
	'https://dl/log.md': { text: 'log\n' },
	'https://dl/a.md': { text: '---\ntype: concept\n---\nA\n' },
	'https://dl/orphan.md': { text: '---\ntype: concept\n---\nOrphan, nothing links here\n' },
	'https://dl/sub/nested.md': { text: '---\ntype: concept\n---\nNested\n' },
};

describe('OkfFetch.githubCoords', () => {
	it('parses tree and raw URLs, and returns null otherwise', () => {
		assert.deepEqual(OkfFetch.githubCoords(GH_URL), { owner: 'owner', repo: 'repo', ref: 'main', path: 'docs/.okf' });
		assert.deepEqual(OkfFetch.githubCoords(`${RAW}/`), { owner: 'owner', repo: 'repo', ref: 'main', path: 'docs/.okf' });
		assert.equal(OkfFetch.githubCoords('https://example.com/bundle'), null);
	});
});

describe('OkfFetch.materialize (GitHub listing)', () => {
	it('fetches every .md via the Contents API, including orphans', async () => {
		await withMockFetch(CONTENTS, async () => {
			const dir = await OkfFetch.materialize(GH_URL);
			try {
				assert.equal(Fs.existsSync(Path.join(dir, 'orphan.md')), true);
				assert.equal(Fs.existsSync(Path.join(dir, 'sub', 'nested.md')), true);
				const orphans = OkfGraph.orphans(OkfGraph.build(dir));
				assert.ok(orphans.includes('orphan'));
				assert.ok(orphans.includes('sub/nested'));
			} finally {
				Fs.rmSync(dir, { recursive: true, force: true });
			}
		});
	});

	it('falls back to crawling when the Contents API is unavailable, missing orphans', async () => {
		const crawlOnly: Record<string, MockEntry> = {
			[`${RAW}/index.md`]: { text: '# Bundle\n[a](./a.md)\n' },
			[`${RAW}/log.md`]: { text: 'log\n' },
			[`${RAW}/a.md`]: { text: '---\ntype: concept\n---\nA\n' },
		};
		await withMockFetch(crawlOnly, async () => {
			const dir = await OkfFetch.materialize(GH_URL);
			try {
				assert.equal(Fs.existsSync(Path.join(dir, 'index.md')), true);
				assert.equal(Fs.existsSync(Path.join(dir, 'a.md')), true);
				assert.equal(Fs.existsSync(Path.join(dir, 'orphan.md')), false);
			} finally {
				Fs.rmSync(dir, { recursive: true, force: true });
			}
		});
	});
});

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
	it('strips anchors before resolving', () => {
		assert.equal(OkfFetch.resolveTarget('/a.md#section', 'dir/b.md'), 'a.md');
	});
	it('returns null for anchors, external, non-md, and escaping targets', () => {
		assert.equal(OkfFetch.resolveTarget('#x', 'a.md'), null);
		assert.equal(OkfFetch.resolveTarget('https://x.com/y.md', 'a.md'), null);
		assert.equal(OkfFetch.resolveTarget('./img.png', 'a.md'), null);
		assert.equal(OkfFetch.resolveTarget('../../outside.md', 'a.md'), null);
	});
});
