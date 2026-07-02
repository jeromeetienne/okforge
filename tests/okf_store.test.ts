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

describe('OkfStore.firstMatch', () => {
	it('returns the first changed path under a directory prefix', () => {
		assert.equal(OkfStore.firstMatch(['src/a.ts', 'docs/b.md'], ['docs/']), 'docs/b.md');
	});
	it('ignores empty prefixes and returns null when nothing matches', () => {
		assert.equal(OkfStore.firstMatch(['src/a.ts'], ['']), null);
		assert.equal(OkfStore.firstMatch(['src/a.ts'], ['lib/']), null);
	});
	// F1 regression (issue #24): matching is an unanchored substring test, so a
	// prefix matches unrelated paths. When F1 lands (path-boundary matching),
	// flip both of these to expect null.
	it('matches on substring, not path boundary (current behaviour)', () => {
		assert.equal(OkfStore.firstMatch(['vendor/mysrc.ts'], ['src']), 'vendor/mysrc.ts');
		assert.equal(OkfStore.firstMatch(['src/foobar.ts'], ['foo']), 'src/foobar.ts');
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

describe('OkfStore.bundleLinks', () => {
	// F2/F4 regression (issues #23, #22): only absolute `/x.md` links are matched;
	// relative links are ignored and fenced code is not stripped. When those land,
	// this returns both targets (and excludes the fenced one).
	it('collects only absolute bundle links (current behaviour)', () => {
		const root = makeTree({
			'a.md': 'abs [x](/dir/x.md) rel [y](./y.md) up [z](../z.md)\n',
		});
		after(() => removeTree(root));
		assert.deepEqual(OkfStore.bundleLinks(OkfStore.walk(root)), ['/dir/x.md']);
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
	// F2 regression (issue #23): CI `check` only lints absolute dead links, so a
	// dangling relative link passes. When F2 lands (shared resolver), this bundle
	// must report TWO LINK problems — flip the count and drop this comment then.
	it('catches only the absolute dangling link, not the relative one (current behaviour)', () => {
		const root = makeTree({
			'.okf/index.md': '# Bundle\n',
			'.okf/a.md': '---\ntype: concept\n---\nabs [x](/missing.md) rel [y](./gone.md)\n',
		});
		after(() => removeTree(root));
		const links = OkfStore.check(root).filter((p) => p.startsWith('LINK:'));
		assert.deepEqual(links, ['LINK: dangling bundle link: /missing.md']);
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
