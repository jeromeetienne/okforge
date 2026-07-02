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
	it('returns the first changed path matching any prefix', () => {
		assert.equal(OkfStore.firstMatch(['src/a.ts', 'docs/b.md'], ['docs/']), 'docs/b.md');
	});
	it('ignores empty prefixes and returns null when nothing matches', () => {
		assert.equal(OkfStore.firstMatch(['src/a.ts'], ['']), null);
		assert.equal(OkfStore.firstMatch(['src/a.ts'], ['lib/']), null);
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
	it('flags kebab-case, missing type, sub-folder frontmatter, and dangling links', () => {
		const root = makeTree({
			'.okf/index.md': '# Bundle\n',
			'.okf/bad-name.md': '---\ntype: concept\n---\n',
			'.okf/notype.md': '# no frontmatter\n',
			'.okf/sub/index.md': '---\ntype: nope\n---\n',
			'.okf/sub/c.md': '---\ntype: concept\n---\ndead [x](/missing.md)\n',
		});
		after(() => removeTree(root));
		const problems = OkfStore.check(root);
		assert.ok(problems.some((p) => p.startsWith('NAME:')));
		assert.ok(problems.some((p) => p.startsWith('TYPE:')));
		assert.ok(problems.some((p) => p.startsWith('INDEX:')));
		assert.ok(problems.some((p) => p.startsWith('LINK:')));
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
