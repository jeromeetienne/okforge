import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { OkfStore } from '../src/misc/okf_store.js';
import { makeTree, removeTree } from './helpers.js';

describe('OkfStore.hasTypeFrontmatter', () => {
	it('accepts frontmatter with a non-empty type', () => {
		assert.equal(OkfStore.hasTypeFrontmatter('---\ntype: concept\n---\n'), true);
	});
	it('rejects missing, empty, or absent frontmatter', () => {
		assert.equal(OkfStore.hasTypeFrontmatter('---\ntype:\n---\n'), false);
		assert.equal(OkfStore.hasTypeFrontmatter('---\ntitle: x\n---\n'), false);
		assert.equal(OkfStore.hasTypeFrontmatter('# heading\n'), false);
	});
});

describe('OkfStore.firstLine', () => {
	it('returns the first line without the newline', () => {
		assert.equal(OkfStore.firstLine('---\nrest\n'), '---');
		assert.equal(OkfStore.firstLine('only'), 'only');
	});
});

describe('OkfStore.uniqueLines', () => {
	it('trims, drops blanks, de-duplicates, and sorts', () => {
		assert.deepEqual(OkfStore.uniqueLines('b\n a \n\nb\nc\n'), ['a', 'b', 'c']);
		assert.deepEqual(OkfStore.uniqueLines(''), []);
	});
});

describe('OkfStore.firstMatch', () => {
	it('returns the first changed path under a directory prefix', () => {
		assert.equal(OkfStore.firstMatch(['src/a.ts', 'docs/b.md'], ['docs/']), 'docs/b.md');
	});
	it('ignores empty prefixes and returns null when nothing matches', () => {
		assert.equal(OkfStore.firstMatch(['src/a.ts'], ['']), null);
		assert.equal(OkfStore.firstMatch(['src/a.ts'], ['lib/']), null);
	});
	// F1 (issue #24): matching is on a path boundary, not an unanchored substring,
	// so a prefix no longer matches unrelated paths.
	it('does not match on substring across a path boundary', () => {
		assert.equal(OkfStore.firstMatch(['vendor/mysrc.ts'], ['src']), null);
		assert.equal(OkfStore.firstMatch(['src/foobar.ts'], ['foo']), null);
	});
	it('matches a bare prefix as the path itself or anything beneath it', () => {
		assert.equal(OkfStore.firstMatch(['src/a.ts'], ['src']), 'src/a.ts');
		assert.equal(OkfStore.firstMatch(['src'], ['src']), 'src');
		assert.equal(OkfStore.firstMatch(['src/config.ts'], ['src/config']), null);
	});
});

describe('OkfStore.loadConfig', () => {
	it('returns an empty mapping when no config exists', () => {
		const root = makeTree({ 'README.md': 'x' });
		after(() => removeTree(root));
		assert.deepEqual(OkfStore.loadConfig(root), { folders: {} });
	});
	it('parses a valid config', () => {
		const root = makeTree({ '.okforge.config.json': JSON.stringify({ folders: { config: ['src/config/'] } }) });
		after(() => removeTree(root));
		assert.deepEqual(OkfStore.folders(root), ['config']);
		assert.deepEqual(OkfStore.sources(root, 'config'), ['src/config/']);
	});
	it('throws on malformed JSON', () => {
		const root = makeTree({ '.okforge.config.json': '{ not json' });
		after(() => removeTree(root));
		assert.throws(() => OkfStore.loadConfig(root), /invalid JSON/);
	});
	it('throws on a schema violation', () => {
		const root = makeTree({ '.okforge.config.json': JSON.stringify({ folders: { config: 'not-an-array' } }) });
		after(() => removeTree(root));
		assert.throws(() => OkfStore.loadConfig(root), /invalid .okforge.config.json/);
	});
});

describe('OkfStore.walk', () => {
	it('returns every file and directory recursively', () => {
		const root = makeTree({ 'a.md': 'x', 'dir/b.md': 'y' });
		after(() => removeTree(root));
		const rels = OkfStore.walk(root)
			.map((e) => e.path.slice(root.length + 1).split(/[\\/]/).join('/'))
			.sort();
		assert.deepEqual(rels, ['a.md', 'dir', 'dir/b.md']);
	});
	it('returns an empty list for a missing directory', () => {
		assert.deepEqual(OkfStore.walk('/no/such/dir/okforge-test'), []);
	});
});

describe('OkfStore.brokenLinks', () => {
	it('flags absolute and relative dead links, ignores live and non-bundle ones', () => {
		const root = makeTree({
			'a.md': 'ok [x](/x.md) dead-abs [m](/missing.md) dead-rel [g](./gone.md) ext [e](https://x.com) fenced [f]\n\n```\n[z](/nope.md)\n```\n',
			'x.md': 'target\n',
		});
		after(() => removeTree(root));
		assert.deepEqual(OkfStore.brokenLinks(root, OkfStore.walk(root)), [
			{ from: 'a.md', target: '/missing.md' },
			{ from: 'a.md', target: './gone.md' },
		]);
	});
});

describe('OkfStore.check', () => {
	it('returns no problems for a conformant bundle', () => {
		const root = makeTree({
			'.okf/index.md': '# Bundle\n',
			'.okf/a.md': '---\ntype: concept\n---\nlink [b](/b.md)\n',
			'.okf/b.md': '---\ntype: concept\n---\nleaf\n',
		});
		after(() => removeTree(root));
		assert.deepEqual(OkfStore.check(root), []);
	});
	it('flags kebab-case, missing type, and sub-folder frontmatter', () => {
		const root = makeTree({
			'.okf/index.md': '# Bundle\n',
			'.okf/bad-name.md': '---\ntype: concept\n---\n',
			'.okf/notype.md': '# no frontmatter\n',
			'.okf/sub/index.md': '---\ntype: nope\n---\n',
			'.okf/sub/c.md': '---\ntype: concept\n---\nleaf\n',
		});
		after(() => removeTree(root));
		const problems = OkfStore.check(root);
		assert.ok(problems.some((p) => p.startsWith('NAME:')));
		assert.ok(problems.some((p) => p.startsWith('TYPE:')));
		assert.ok(problems.some((p) => p.startsWith('INDEX:')));
	});
	// F2 (issue #23): CI `check` now lints both absolute and relative dead links
	// via the shared resolver, so this bundle reports TWO LINK problems.
	it('catches both the absolute and the relative dangling link', () => {
		const root = makeTree({
			'.okf/index.md': '# Bundle\n',
			'.okf/a.md': '---\ntype: concept\n---\nabs [x](/missing.md) rel [y](./gone.md)\n',
		});
		after(() => removeTree(root));
		const links = OkfStore.check(root).filter((p) => p.startsWith('LINK:'));
		assert.deepEqual(links, [
			'LINK: dangling bundle link: /missing.md (in a.md)',
			'LINK: dangling bundle link: ./gone.md (in a.md)',
		]);
	});
	it('throws when there is no bundle', () => {
		const root = makeTree({ 'README.md': 'x' });
		after(() => removeTree(root));
		assert.throws(() => OkfStore.check(root), /no \.okf\/ bundle/);
	});
});

describe('OkfStore.conceptCount', () => {
	it('counts non-index, non-log markdown docs', () => {
		const root = makeTree({
			'.okf/index.md': 'x',
			'.okf/log.md': 'x',
			'.okf/a.md': 'x',
			'.okf/sub/b.md': 'x',
		});
		after(() => removeTree(root));
		assert.equal(OkfStore.conceptCount(root), 2);
	});
});
