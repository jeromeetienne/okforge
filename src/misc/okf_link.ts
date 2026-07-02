import { marked } from 'marked';
import Path from 'node:path';

/** A bundle-relative `.md` link target: `id` is the path minus `.md`, `file` keeps it. */
export type BundleTarget = {
	/** Concept ID of the target (resolved path minus `.md`). */
	id: string;
	/** Bundle-relative file path of the target (POSIX separators). */
	file: string;
};

/**
 * Pure, filesystem-free resolution of markdown links to bundle-relative `.md`
 * targets. The single source of truth for anchor stripping, scheme detection,
 * `.md` gating, and `..`-escape rejection shared by {@link OkfGraph.resolveLink}
 * (which layers on an existence check) and {@link OkfFetch.resolveTarget}. Also
 * the single markdown link-extraction point, so every consumer sees the same
 * set of links.
 */
export class OkfLink {
	/**
	 * Markdown link targets (hrefs) in `content`, in document order. Tokenises
	 * with `marked` and reads only real link tokens, so links inside fenced or
	 * inline code are excluded by construction and reference-style links are
	 * included. Not de-duplicated — callers that need a set build one.
	 */
	static extractLinkTargets(content: string): string[] {
		const targets: string[] = [];
		marked.walkTokens(marked.lexer(content), (token) => {
			if (token.type === 'link') {
				targets.push(token.href);
			}
		});
		return targets;
	}

	/**
	 * Resolve a markdown link `target` written in bundle file `fromFile` to a
	 * bundle-relative `.md` target, or null when it is not an in-bundle concept
	 * link (anchor, external URL, non-`.md` target, or a path escaping the bundle
	 * root). Pure: no filesystem access.
	 */
	static resolveBundleLink(target: string, fromFile: string): BundleTarget | null {
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
		const relative = withoutAnchor.startsWith('/') === true
			? withoutAnchor.slice(1)
			: Path.posix.join(Path.posix.dirname(fromFile), withoutAnchor);
		const normalized = Path.posix.normalize(relative);
		if (normalized.startsWith('..') === true || normalized.startsWith('/') === true) {
			return null;
		}
		return { id: normalized.replace(/\.md$/, ''), file: normalized };
	}
}
