import Fs from 'node:fs';
import Path from 'node:path';
import { OkfStore } from './okf_store.js';

/** Reserved filenames that are never concept documents (at any level). */
const RESERVED_NAMES = ['index.md', 'log.md'];

/** A concept document parsed into a graph node. */
export type ConceptNode = {
	/** Concept ID: bundle-relative path with `.md` removed (POSIX separators). */
	id: string;
	/** Bundle-relative file path (POSIX separators). */
	file: string;
	/** Frontmatter `type` (empty string when absent). */
	type: string;
	/** Frontmatter `title` (empty string when absent). */
	title: string;
	/** Frontmatter `description` (empty string when absent). */
	description: string;
	/** Frontmatter `tags` (empty array when absent). */
	tags: string[];
	/** Concept IDs this concept links to (existing concept targets, de-duplicated). */
	outbound: string[];
	/** Raw `.md` link targets in this concept that resolve inside the bundle but to a missing file. */
	broken: string[];
};

/** A resolved bundle-relative `.md` link target. */
export type ResolvedLink = {
	/** Concept ID of the target (resolved path minus `.md`). */
	id: string;
	/** Bundle-relative file path of the target (POSIX separators). */
	file: string;
	/** Whether a file exists at the target path. */
	exists: boolean;
};

/** The whole bundle parsed into a directed, untyped concept graph. */
export type OkfGraphData = {
	/** Absolute path of the bundle root. */
	root: string;
	/** Concept nodes keyed by Concept ID. */
	concepts: Map<string, ConceptNode>;
	/** Concept IDs that have an inbound link from another concept. */
	linkedTo: Set<string>;
};

/**
 * Builds and queries the directed, untyped link graph of an OKF bundle. Pure
 * read-only mechanics: it parses frontmatter and markdown links, resolves both
 * the absolute (`/foo.md`) and relative (`./foo.md`) link forms to Concept IDs,
 * and answers the graph-heavy queries (neighbors, orphans, broken links, path)
 * that are awkward to compute with Glob/Grep alone.
 *
 * Reserved files (`index.md`, `log.md`) are not graph nodes and their links do
 * not form edges, so a concept listed only in an `index.md` still counts as an
 * orphan — which is what makes orphan detection meaningful.
 */
export class OkfGraph {
	/** Whether `name` is a reserved (non-concept) filename. */
	static isReserved(name: string): boolean {
		return RESERVED_NAMES.includes(name) === true;
	}

	/** Build the concept graph for the bundle rooted at `root`. */
	static build(root: string): OkfGraphData {
		const concepts = new Map<string, ConceptNode>();
		const conceptFiles: string[] = [];
		for (const entry of OkfStore.walk(root)) {
			if (entry.isDirectory === true || entry.path.endsWith('.md') === false) {
				continue;
			}
			if (OkfGraph.isReserved(Path.basename(entry.path)) === true) {
				continue;
			}
			conceptFiles.push(OkfGraph.toPosix(Path.relative(root, entry.path)));
		}

		for (const file of conceptFiles) {
			const content = Fs.readFileSync(Path.join(root, file), 'utf-8');
			const front = OkfGraph.parseFrontmatter(content);
			const outbound = new Set<string>();
			const broken: string[] = [];
			for (const target of OkfGraph.extractLinkTargets(content)) {
				const resolved = OkfGraph.resolveLink(target, file, root);
				if (resolved === null) {
					continue;
				}
				if (resolved.exists === false) {
					broken.push(target);
					continue;
				}
				if (concepts.has(resolved.id) === true || conceptFiles.includes(resolved.file) === true) {
					outbound.add(resolved.id);
				}
			}
			const id = file.replace(/\.md$/, '');
			concepts.set(id, {
				id,
				file,
				type: front.type,
				title: front.title,
				description: front.description,
				tags: front.tags,
				outbound: [...outbound].sort(),
				broken,
			});
		}

		const linkedTo = new Set<string>();
		for (const node of concepts.values()) {
			for (const target of node.outbound) {
				linkedTo.add(target);
			}
		}
		return { root, concepts, linkedTo };
	}

	/** Concept IDs that link to `id` (inbound edges), sorted. */
	static inbound(graph: OkfGraphData, id: string): string[] {
		const result: string[] = [];
		for (const node of graph.concepts.values()) {
			if (node.outbound.includes(id) === true) {
				result.push(node.id);
			}
		}
		return result.sort();
	}

	/** Concepts with no inbound link from any other concept, sorted. */
	static orphans(graph: OkfGraphData): string[] {
		const result: string[] = [];
		for (const id of graph.concepts.keys()) {
			if (graph.linkedTo.has(id) === false) {
				result.push(id);
			}
		}
		return result.sort();
	}

	/** Every broken `.md` link, as `{ from, target }`, grouped by source concept. */
	static broken(graph: OkfGraphData): { from: string; target: string }[] {
		const result: { from: string; target: string }[] = [];
		for (const node of graph.concepts.values()) {
			for (const target of node.broken) {
				result.push({ from: node.id, target });
			}
		}
		return result;
	}

	/**
	 * Concept IDs reachable from `id` within `hops` steps over undirected edges,
	 * grouped by distance (level 1 = direct neighbors). Excludes `id` itself.
	 */
	static neighbors(graph: OkfGraphData, id: string, hops: number): { distance: number; id: string }[] {
		if (graph.concepts.has(id) === false) {
			return [];
		}
		const seen = new Set<string>([id]);
		const result: { distance: number; id: string }[] = [];
		let frontier = [id];
		for (let distance = 1; distance <= hops; distance += 1) {
			const next: string[] = [];
			for (const current of frontier) {
				for (const neighbor of OkfGraph.undirectedNeighbors(graph, current)) {
					if (seen.has(neighbor) === true) {
						continue;
					}
					seen.add(neighbor);
					next.push(neighbor);
					result.push({ distance, id: neighbor });
				}
			}
			frontier = next;
			if (frontier.length === 0) {
				break;
			}
		}
		return result;
	}

	/** Shortest directed link path from `from` to `to` (inclusive), or null if none. */
	static path(graph: OkfGraphData, from: string, to: string): string[] | null {
		if (graph.concepts.has(from) === false || graph.concepts.has(to) === false) {
			return null;
		}
		const previous = new Map<string, string>();
		const seen = new Set<string>([from]);
		let frontier = [from];
		while (frontier.length > 0) {
			const next: string[] = [];
			for (const current of frontier) {
				if (current === to) {
					return OkfGraph.reconstruct(previous, from, to);
				}
				const node = graph.concepts.get(current);
				const outbound = node === undefined ? [] : node.outbound;
				for (const neighbor of outbound) {
					if (seen.has(neighbor) === true) {
						continue;
					}
					seen.add(neighbor);
					previous.set(neighbor, current);
					next.push(neighbor);
				}
			}
			frontier = next;
		}
		return null;
	}

	/** The most-linked-to concepts, as `{ id, inbound }`, highest first, capped at `limit`. */
	static hubs(graph: OkfGraphData, limit: number): { id: string; inbound: number }[] {
		const counts = new Map<string, number>();
		for (const id of graph.concepts.keys()) {
			counts.set(id, 0);
		}
		for (const node of graph.concepts.values()) {
			for (const target of node.outbound) {
				counts.set(target, (counts.get(target) ?? 0) + 1);
			}
		}
		return [...counts.entries()]
			.map(([id, inbound]) => ({ id, inbound }))
			.filter((entry) => entry.inbound > 0)
			.sort((a, b) => b.inbound - a.inbound || a.id.localeCompare(b.id))
			.slice(0, limit);
	}

	/** Concept counts grouped by top-level directory (or `<root>` for root concepts), sorted. */
	static groups(graph: OkfGraphData): { group: string; count: number }[] {
		const counts = new Map<string, number>();
		for (const node of graph.concepts.values()) {
			const slash = node.file.indexOf('/');
			const group = slash === -1 ? '<root>' : node.file.slice(0, slash);
			counts.set(group, (counts.get(group) ?? 0) + 1);
		}
		return [...counts.entries()]
			.map(([group, count]) => ({ group, count }))
			.sort((a, b) => a.group.localeCompare(b.group));
	}

	/** Union of inbound and outbound neighbors of `id`. */
	static undirectedNeighbors(graph: OkfGraphData, id: string): string[] {
		const node = graph.concepts.get(id);
		const outbound = node === undefined ? [] : node.outbound;
		return [...new Set([...outbound, ...OkfGraph.inbound(graph, id)])];
	}

	/** Walk `previous` back from `to` to `from`, returning the path front-to-back. */
	static reconstruct(previous: Map<string, string>, from: string, to: string): string[] {
		const path = [to];
		let current = to;
		while (current !== from) {
			const prior = previous.get(current);
			if (prior === undefined) {
				break;
			}
			path.unshift(prior);
			current = prior;
		}
		return path;
	}

	/**
	 * Resolve a markdown link `target` written in concept `file` to a bundle
	 * `.md` target. Returns null for anchors, external links, non-`.md` targets,
	 * and targets that resolve outside the bundle root — none of which are
	 * concept-graph edges.
	 */
	static resolveLink(target: string, file: string, root: string): ResolvedLink | null {
		const withoutAnchor = target.split('#')[0];
		if (withoutAnchor === '') {
			return null;
		}
		if (/^[a-z][a-z0-9+.-]*:/i.test(withoutAnchor) === true) {
			return null;
		}
		if (withoutAnchor.endsWith('.md') === false) {
			return null;
		}
		const relative = withoutAnchor.startsWith('/')
			? withoutAnchor.slice(1)
			: Path.posix.join(Path.posix.dirname(file), withoutAnchor);
		const normalized = Path.posix.normalize(relative);
		if (normalized.startsWith('..') === true || normalized.startsWith('/') === true) {
			return null;
		}
		const exists = Fs.existsSync(Path.join(root, normalized)) === true;
		return { id: normalized.replace(/\.md$/, ''), file: normalized, exists };
	}

	/** Distinct markdown link targets in `content`, in document order. */
	static extractLinkTargets(content: string): string[] {
		const pattern = /\]\(\s*([^)\s]+)/g;
		const targets: string[] = [];
		let match: RegExpExecArray | null = pattern.exec(content);
		while (match !== null) {
			targets.push(match[1]);
			match = pattern.exec(content);
		}
		return targets;
	}

	/**
	 * Parse the leading YAML frontmatter for the handful of fields the browser
	 * surfaces. Deliberately small: a line-oriented reader for `type`, `title`,
	 * `description`, and `tags` (inline `[a, b]` or `- item` block form). Unknown
	 * keys are ignored, never rejected.
	 */
	static parseFrontmatter(content: string): { type: string; title: string; description: string; tags: string[] } {
		const empty = { type: '', title: '', description: '', tags: [] as string[] };
		const lines = content.split('\n');
		if (lines.length === 0 || lines[0].trim() !== '---') {
			return empty;
		}
		const result = { type: '', title: '', description: '', tags: [] as string[] };
		let tagsMode = false;
		for (let index = 1; index < lines.length; index += 1) {
			const line = lines[index];
			if (line.trim() === '---') {
				return result;
			}
			const blockTag = line.match(/^\s*-\s+(.*)$/);
			if (tagsMode === true && blockTag !== null) {
				result.tags.push(OkfGraph.unquote(blockTag[1].trim()));
				continue;
			}
			tagsMode = false;
			const keyValue = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
			if (keyValue === null) {
				continue;
			}
			const key = keyValue[1];
			const value = keyValue[2].trim();
			if (key === 'type') {
				result.type = OkfGraph.unquote(value);
			} else if (key === 'title') {
				result.title = OkfGraph.unquote(value);
			} else if (key === 'description') {
				result.description = OkfGraph.unquote(value);
			} else if (key === 'tags') {
				if (value === '') {
					tagsMode = true;
				} else {
					result.tags = OkfGraph.parseInlineTags(value);
				}
			}
		}
		return empty;
	}

	/** Parse an inline YAML list `[a, b, c]` into trimmed, unquoted strings. */
	static parseInlineTags(value: string): string[] {
		const inner = value.replace(/^\[/, '').replace(/\]$/, '');
		if (inner.trim() === '') {
			return [];
		}
		return inner
			.split(',')
			.map((part) => OkfGraph.unquote(part.trim()))
			.filter((part) => part !== '');
	}

	/** Strip a single pair of surrounding single or double quotes. */
	static unquote(value: string): string {
		if (value.length >= 2) {
			const first = value[0];
			const last = value[value.length - 1];
			if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
				return value.slice(1, -1);
			}
		}
		return value;
	}

	/** Convert a possibly-Windows path to POSIX separators. */
	static toPosix(path: string): string {
		return path.split(Path.sep).join('/');
	}
}
