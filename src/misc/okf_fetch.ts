import Fs from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';
import { z } from 'zod';
import { OkfLink } from './okf_link.js';

/** Bundle entry points seeded into every crawl before following links. */
const SEED_FILES = ['index.md', 'log.md'];

/** The fields of a GitHub Contents API entry that the lister reads. */
const GithubEntrySchema = z.object({
	type: z.string(),
	name: z.string(),
	path: z.string(),
	download_url: z.string().nullable().optional(),
});

/** A GitHub Contents API directory listing. */
const GithubDirSchema = z.array(GithubEntrySchema);

/** Coordinates of a GitHub-hosted bundle parsed from its URL. */
type GithubCoords = {
	owner: string;
	repo: string;
	ref: string;
	path: string;
};

/** A bundle file to download: its bundle-relative path and the URL to fetch. */
type RemoteFile = {
	file: string;
	url: string;
};

/** Progress reported by {@link OkfFetch.materialize} after each file is downloaded. */
export type OkfFetchProgress = {
	downloaded: number;
	current: string;
};

/**
 * Materializes a remote OKF bundle into a local temp directory so the rest of the
 * toolchain — which only reads local directory trees ({@link OkfGraph.build} /
 * {@link OkfStore.walk}) — can treat it exactly like a local bundle.
 *
 * GitHub bundles are enumerated via the Contents API, so every `.md` is fetched —
 * including orphan concepts nothing links to, which `graph orphans` / `neighbors`
 * exist to surface. If the API is unavailable (rate limit, private repo, non-GitHub
 * host), it falls back to crawling.
 *
 * The crawl seeds with `index.md`/`log.md`, then follows every in-bundle `.md` link
 * (the same absolute/relative resolution the graph engine uses) until the reachable
 * file set is exhausted. Links that 404 are left unwritten, so the generator reports
 * them as broken exactly as for a local bundle. Under a pure crawl, orphan detection
 * is best-effort: a concept nothing links to is never reached, hence never fetched.
 *
 * GitHub `tree` URLs are rewritten to their `raw.githubusercontent.com`
 * equivalent as a convenience, then treated as an ordinary URL bundle.
 */
export class OkfFetch {
	/** Whether `bundle` is an http(s) URL rather than a local path. */
	static isUrl(bundle: string): boolean {
		return /^https?:\/\//i.test(bundle) === true;
	}

	/**
	 * Download the bundle at `url` into a fresh temp directory and return that
	 * directory. `onProgress`, when given, is invoked after each file is written,
	 * so callers can render download progress.
	 */
	static async materialize(url: string, onProgress?: (progress: OkfFetchProgress) => void): Promise<string> {
		const base = OkfFetch.normalizeBase(url);
		const outDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'okforge-fetch-'));
		try {
			const coords = OkfFetch.githubCoords(url);
			const listing = coords === null ? null : await OkfFetch.listGithubMarkdown(coords);
			const written = listing === null
				? await OkfFetch.crawl(outDir, base, onProgress)
				: await OkfFetch.download(outDir, listing, onProgress);
			if (written.has('index.md') === false) {
				throw new Error(`no OKF bundle at ${base}: index.md not reachable`);
			}
			return outDir;
		} catch (error: unknown) {
			Fs.rmSync(outDir, { recursive: true, force: true });
			throw error;
		}
	}

	/**
	 * Crawl the bundle from the seed files, following in-bundle `.md` links, writing
	 * each reachable file under `outDir`. Returns the set of bundle-relative files
	 * written. Orphan concepts (unreachable by link) are not discovered this way.
	 */
	static async crawl(outDir: string, base: string, onProgress?: (progress: OkfFetchProgress) => void): Promise<Set<string>> {
		const seen = new Set<string>();
		const written = new Set<string>();
		const queue = [...SEED_FILES];
		let downloaded = 0;
		while (queue.length > 0) {
			const file = queue.shift() as string;
			if (seen.has(file) === true) {
				continue;
			}
			seen.add(file);
			const content = await OkfFetch.fetchText(base + file);
			if (content === null) {
				continue;
			}
			OkfFetch.writeFile(outDir, file, content);
			written.add(file);
			downloaded += 1;
			if (onProgress !== undefined) {
				onProgress({ downloaded, current: file });
			}
			for (const target of OkfLink.extractLinkTargets(content)) {
				const next = OkfFetch.resolveTarget(target, file);
				if (next !== null && seen.has(next) === false) {
					queue.push(next);
				}
			}
		}
		return written;
	}

	/**
	 * Download an explicit list of bundle files under `outDir`, returning the set of
	 * bundle-relative files written. Files that fail to fetch are skipped (left
	 * unwritten), so they surface as broken links exactly as under a crawl.
	 */
	static async download(outDir: string, files: RemoteFile[], onProgress?: (progress: OkfFetchProgress) => void): Promise<Set<string>> {
		const written = new Set<string>();
		let downloaded = 0;
		for (const entry of files) {
			const content = await OkfFetch.fetchText(entry.url);
			if (content === null) {
				continue;
			}
			OkfFetch.writeFile(outDir, entry.file, content);
			written.add(entry.file);
			downloaded += 1;
			if (onProgress !== undefined) {
				onProgress({ downloaded, current: entry.file });
			}
		}
		return written;
	}

	/**
	 * Parse GitHub owner/repo/ref/path from a `github.com/<o>/<r>/tree/<ref>/<path>`
	 * or `raw.githubusercontent.com/<o>/<r>/[refs/heads/]<ref>/<path>` URL, or null
	 * when `url` is not a recognizable GitHub bundle.
	 */
	static githubCoords(url: string): GithubCoords | null {
		const tree = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/i);
		if (tree !== null) {
			const [, owner, repo, ref, path] = tree;
			return { owner, repo, ref, path: path.replace(/\/+$/, '') };
		}
		const raw = url.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(?:refs\/heads\/)?([^/]+)\/(.+)$/i);
		if (raw !== null) {
			const [, owner, repo, ref, path] = raw;
			return { owner, repo, ref, path: path.replace(/\/+$/, '') };
		}
		return null;
	}

	/**
	 * List every `.md` in the GitHub bundle at `coords` via the Contents API,
	 * recursing into sub-directories, as `{ file, url }` download targets. Returns
	 * null on any API failure so the caller can fall back to crawling.
	 */
	static async listGithubMarkdown(coords: GithubCoords): Promise<RemoteFile[] | null> {
		const files: RemoteFile[] = [];
		const ok = await OkfFetch.collectGithubDir(coords, coords.path, files);
		return ok === true ? files : null;
	}

	/** Recurse one Contents API directory into `out`; false on any failure. */
	static async collectGithubDir(coords: GithubCoords, dirPath: string, out: RemoteFile[]): Promise<boolean> {
		const encoded = dirPath.split('/').map((segment) => encodeURIComponent(segment)).join('/');
		const api = `https://api.github.com/repos/${coords.owner}/${coords.repo}/contents/${encoded}?ref=${encodeURIComponent(coords.ref)}`;
		const parsed = GithubDirSchema.safeParse(await OkfFetch.fetchJson(api));
		if (parsed.success === false) {
			return false;
		}
		for (const entry of parsed.data) {
			if (entry.type === 'dir') {
				const ok = await OkfFetch.collectGithubDir(coords, entry.path, out);
				if (ok === false) {
					return false;
				}
			} else if (entry.type === 'file' && entry.name.endsWith('.md') === true) {
				if (entry.download_url === null || entry.download_url === undefined) {
					return false;
				}
				out.push({ file: entry.path.slice(coords.path.length + 1), url: entry.download_url });
			}
		}
		return true;
	}

	/** GET `url` as parsed JSON with GitHub API headers, or null on any failure. */
	static async fetchJson(url: string): Promise<unknown> {
		let response: Response;
		try {
			response = await fetch(url, { headers: OkfFetch.githubHeaders() });
		} catch {
			return null;
		}
		if (response.ok === false) {
			return null;
		}
		try {
			return await response.json();
		} catch {
			return null;
		}
	}

	/** Headers for GitHub API requests, adding auth when `GITHUB_TOKEN` is set. */
	static githubHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			'Accept': 'application/vnd.github+json',
			'User-Agent': 'okforge',
		};
		const token = process.env.GITHUB_TOKEN;
		if (token !== undefined && token !== '') {
			headers['Authorization'] = `Bearer ${token}`;
		}
		return headers;
	}

	/**
	 * Normalize a bundle URL to a base ending in `/`, so `base + 'index.md'` is the
	 * URL of the bundle index. A GitHub `tree` URL
	 * (`https://github.com/<owner>/<repo>/tree/<ref>/<path>`) is rewritten to its
	 * `https://raw.githubusercontent.com/<owner>/<repo>/refs/heads/<ref>/<path>/`
	 * equivalent.
	 */
	static normalizeBase(url: string): string {
		const github = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/i);
		if (github !== null) {
			const [, owner, repo, ref, path] = github;
			const clean = path.replace(/\/+$/, '');
			return `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/${ref}/${clean}/`;
		}
		return url.endsWith('/') === true ? url : `${url}/`;
	}

	/** Friendly bundle name from a URL: the last path segment of the normalized base. */
	static bundleName(url: string): string {
		const base = OkfFetch.normalizeBase(url).replace(/\/+$/, '');
		const segment = base.slice(base.lastIndexOf('/') + 1);
		return segment === '' ? base : segment;
	}

	/**
	 * Resolve a markdown link `target` found in bundle file `fromFile` to a
	 * bundle-relative `.md` path, or null when it is not an in-bundle link (anchor,
	 * external URL, non-`.md` target, or a path escaping the bundle root). Thin
	 * wrapper over the shared, fs-free {@link OkfLink.resolveBundleLink} core.
	 */
	static resolveTarget(target: string, fromFile: string): string | null {
		return OkfLink.resolveBundleLink(target, fromFile)?.file ?? null;
	}

	/** GET `url` as UTF-8 text, or null on any non-200 response or network error. */
	static async fetchText(url: string): Promise<string | null> {
		let response: Response;
		try {
			response = await fetch(url);
		} catch {
			return null;
		}
		if (response.ok === false) {
			return null;
		}
		return await response.text();
	}

	/** Write bundle-relative `file` under `outDir`, creating parent directories. */
	static writeFile(outDir: string, file: string, content: string): void {
		const target = Path.join(outDir, ...file.split('/'));
		Fs.mkdirSync(Path.dirname(target), { recursive: true });
		Fs.writeFileSync(target, content, 'utf-8');
	}
}
