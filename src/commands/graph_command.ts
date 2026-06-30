import Fs from 'node:fs';
import Path from 'node:path';
import { OkfGraph, OkfGraphData } from '../misc/okf_graph.js';

/** Number of top hub concepts surfaced by `overview`. */
const HUB_LIMIT = 10;

/**
 * `graph` — read-only concept-graph queries over an OKF bundle, emitted as JSON
 * for the okforge-query skill to format. Builds the graph once (via {@link OkfGraph})
 * and answers overview / concept / neighbors / orphans / broken / path. The skill
 * works without this command (falling back to Glob/Grep/Read); it is here so the
 * graph-heavy queries can be answered deterministically.
 */
export class GraphCommand {
	/** Run operation `op` against the bundle at `root`, returning a JSON-serialisable result. */
	static run(op: string, args: string[], root: string, hops: number): unknown {
		if (Fs.existsSync(root) === false || Fs.statSync(root).isDirectory() === false) {
			throw new Error(`no bundle directory at ${root}`);
		}
		const graph = OkfGraph.build(root);
		if (op === 'overview') {
			return GraphCommand.overview(graph);
		}
		if (op === 'concept') {
			return GraphCommand.concept(graph, GraphCommand.requireId(args, op));
		}
		if (op === 'neighbors') {
			return GraphCommand.neighbors(graph, GraphCommand.requireId(args, op), hops);
		}
		if (op === 'orphans') {
			return { root: graph.root, orphans: OkfGraph.orphans(graph) };
		}
		if (op === 'broken') {
			return { root: graph.root, broken: OkfGraph.broken(graph) };
		}
		if (op === 'path') {
			if (args.length < 2) {
				throw new Error('graph path needs two Concept IDs: graph path <from> <to>');
			}
			return { from: args[0], to: args[1], path: OkfGraph.path(graph, args[0], args[1]) };
		}
		throw new Error(`unknown graph operation: ${op} (expected overview|concept|neighbors|orphans|broken|path)`);
	}

	/** Bundle summary: counts, per-group counts, and the most-linked hub concepts. */
	static overview(graph: OkfGraphData): unknown {
		return {
			root: graph.root,
			conceptCount: graph.concepts.size,
			groups: OkfGraph.groups(graph),
			hubs: OkfGraph.hubs(graph, HUB_LIMIT),
			orphanCount: OkfGraph.orphans(graph).length,
			brokenCount: OkfGraph.broken(graph).length,
		};
	}

	/** One concept's frontmatter summary plus its inbound, outbound, and broken links. */
	static concept(graph: OkfGraphData, id: string): unknown {
		const node = graph.concepts.get(id);
		if (node === undefined) {
			return { id, found: false };
		}
		return {
			id: node.id,
			file: node.file,
			type: node.type,
			title: node.title,
			description: node.description,
			tags: node.tags,
			outbound: node.outbound,
			inbound: OkfGraph.inbound(graph, id),
			broken: node.broken,
		};
	}

	/** Neighbors of `id` up to `hops` over undirected edges, grouped by distance. */
	static neighbors(graph: OkfGraphData, id: string, hops: number): unknown {
		if (graph.concepts.has(id) === false) {
			return { id, found: false };
		}
		return { id, hops, neighbors: OkfGraph.neighbors(graph, id, hops) };
	}

	/** First positional argument as a Concept ID (its `.md` suffix stripped if present). */
	static requireId(args: string[], op: string): string {
		if (args.length === 0) {
			throw new Error(`graph ${op} needs a Concept ID: graph ${op} <id>`);
		}
		return args[0].replace(/\.md$/, '');
	}

	/** Resolve a `--bundle` value (or default `.`) to an absolute bundle root. */
	static resolveRoot(bundle: string): string {
		return Path.resolve(bundle);
	}
}
