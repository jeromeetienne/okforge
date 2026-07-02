import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { OkfGraph } from '../src/misc/okf_graph.js';
import { makeTree, removeTree } from './helpers.js';

describe('OkfGraph.unquote', () => {
	it('strips a single pair of double quotes', () => {
		assert.equal(OkfGraph.unquote('"hello"'), 'hello');
	});
	it('strips a single pair of single quotes', () => {
		assert.equal(OkfGraph.unquote("'hello'"), 'hello');
	});
	it('leaves unquoted and mismatched values untouched', () => {
		assert.equal(OkfGraph.unquote('hello'), 'hello');
		assert.equal(OkfGraph.unquote('"hello'), '"hello');
	});
});

describe('OkfGraph.parseInlineTags', () => {
	it('parses an inline list with quotes and whitespace', () => {
		assert.deepEqual(OkfGraph.parseInlineTags('[a, "b", \'c\']'), ['a', 'b', 'c']);
	});
	it('returns an empty array for an empty list', () => {
		assert.deepEqual(OkfGraph.parseInlineTags('[]'), []);
		assert.deepEqual(OkfGraph.parseInlineTags('[  ]'), []);
	});
});

describe('OkfGraph.parseFrontmatter', () => {
	it('returns empties when there is no frontmatter', () => {
		assert.deepEqual(OkfGraph.parseFrontmatter('# just a heading\n'), {
			type: '',
			title: '',
			description: '',
			tags: [],
		});
	});
	it('parses scalar fields and inline tags', () => {
		const content = ['---', 'type: concept', "title: 'My Title'", 'description: "d"', 'tags: [x, y]', '---', 'body'].join('\n');
		assert.deepEqual(OkfGraph.parseFrontmatter(content), {
			type: 'concept',
			title: 'My Title',
			description: 'd',
			tags: ['x', 'y'],
		});
	});
	it('parses block-form tags', () => {
		const content = ['---', 'type: concept', 'tags:', '  - alpha', '  - beta', '---'].join('\n');
		const front = OkfGraph.parseFrontmatter(content);
		assert.deepEqual(front.tags, ['alpha', 'beta']);
	});
	it('ignores unknown keys', () => {
		const content = ['---', 'type: concept', 'weird: value', '---'].join('\n');
		assert.equal(OkfGraph.parseFrontmatter(content).type, 'concept');
	});
});

describe('OkfGraph.extractLinkTargets', () => {
	it('extracts markdown link targets in document order', () => {
		const content = 'see [a](./a.md) and [b](/b.md) and [ext](https://x.com)';
		assert.deepEqual(OkfGraph.extractLinkTargets(content), ['./a.md', '/b.md', 'https://x.com']);
	});
});

describe('OkfGraph.resolveLink', () => {
	const root = makeTree({ 'a.md': 'x', 'dir/b.md': 'y' });
	after(() => removeTree(root));

	it('resolves an absolute bundle link', () => {
		assert.deepEqual(OkfGraph.resolveLink('/a.md', 'dir/b.md', root), { id: 'a', file: 'a.md', exists: true });
	});
	it('resolves a relative link and flags a missing target', () => {
		const resolved = OkfGraph.resolveLink('../missing.md', 'dir/b.md', root);
		assert.deepEqual(resolved, { id: 'missing', file: 'missing.md', exists: false });
	});
	it('returns null for anchors, external, and non-md targets', () => {
		assert.equal(OkfGraph.resolveLink('#section', 'a.md', root), null);
		assert.equal(OkfGraph.resolveLink('https://x.com/y.md', 'a.md', root), null);
		assert.equal(OkfGraph.resolveLink('./img.png', 'a.md', root), null);
	});
	it('returns null for a target escaping the bundle root', () => {
		assert.equal(OkfGraph.resolveLink('../../outside.md', 'a.md', root), null);
	});
});

describe('OkfGraph.isReserved', () => {
	it('recognizes reserved filenames', () => {
		assert.equal(OkfGraph.isReserved('index.md'), true);
		assert.equal(OkfGraph.isReserved('log.md'), true);
		assert.equal(OkfGraph.isReserved('concept.md'), false);
	});
});

describe('OkfGraph.build and queries', () => {
	// a -> b -> c ; d is an orphan; b links to a broken target.
	const root = makeTree({
		'index.md': 'index',
		'log.md': 'log',
		'a.md': ['---', 'type: concept', 'title: A', '---', 'links to [b](/b.md)'].join('\n'),
		'b.md': ['---', 'type: concept', '---', 'to [c](/c.md) and [gone](/gone.md)'].join('\n'),
		'c.md': ['---', 'type: concept', '---', 'leaf'].join('\n'),
		'd.md': ['---', 'type: concept', '---', 'orphan'].join('\n'),
	});
	const graph = OkfGraph.build(root);
	after(() => removeTree(root));

	it('excludes reserved files from concepts', () => {
		assert.deepEqual([...graph.concepts.keys()].sort(), ['a', 'b', 'c', 'd']);
	});
	it('records outbound edges and frontmatter', () => {
		const a = graph.concepts.get('a');
		assert.deepEqual(a?.outbound, ['b']);
		assert.equal(a?.title, 'A');
	});
	it('records broken links', () => {
		assert.deepEqual(OkfGraph.broken(graph), [{ from: 'b', target: '/gone.md' }]);
	});
	it('computes inbound edges', () => {
		assert.deepEqual(OkfGraph.inbound(graph, 'b'), ['a']);
	});
	it('finds orphans', () => {
		assert.deepEqual(OkfGraph.orphans(graph), ['a', 'd']);
	});
	it('finds a directed shortest path', () => {
		assert.deepEqual(OkfGraph.path(graph, 'a', 'c'), ['a', 'b', 'c']);
		assert.equal(OkfGraph.path(graph, 'c', 'a'), null);
	});
	it('lists undirected neighbors by distance', () => {
		const neighbors = OkfGraph.neighbors(graph, 'b', 1).map((n) => n.id).sort();
		assert.deepEqual(neighbors, ['a', 'c']);
	});
	it('ranks hubs by inbound count', () => {
		const hubs = OkfGraph.hubs(graph, 10);
		assert.deepEqual(hubs, [
			{ id: 'b', inbound: 1 },
			{ id: 'c', inbound: 1 },
		]);
	});
});
