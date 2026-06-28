import Fs from 'node:fs';
import Path from 'node:path';
import ChildProcess from 'node:child_process';
import { z } from 'zod';

/** Config file name read from the repository root. */
const CONFIG_FILENAME = '.okforge.config.json';

/**
 * The okforge config: the folder <-> source mapping for a repository. Each key
 * is an OKF concept folder; each value is the list of source path prefixes that
 * folder is derived from. A changed file under any prefix marks the folder stale.
 * This is per-repository data — okforge ships with none of it.
 */
const OkfConfigSchema = z
	.object({
		folders: z.record(z.string(), z.array(z.string())).default({}),
	})
	.passthrough();

/** Parsed okforge config. */
export type OkfConfig = z.infer<typeof OkfConfigSchema>;

/** A folder whose source changed without the folder itself being edited. */
export type StaleFolder = {
	folder: string;
	source: string;
};

/** A single file or directory yielded by {@link OkfStore.walk}. */
export type WalkEntry = {
	path: string;
	isDirectory: boolean;
};

/**
 * Primitive mechanics shared by the okf subcommands: loading the per-repository
 * folder <-> source mapping, git inspection, staleness detection, and the
 * conformance / dead-link lint. The command classes orchestrate these primitives.
 */
export class OkfStore {
	/** Absolute path of the config file for the repository at `cwd`. */
	static configPath(cwd: string): string {
		return Path.join(cwd, CONFIG_FILENAME);
	}

	/**
	 * The folder <-> source mapping for the repository at `cwd`. Returns an empty
	 * mapping when no config exists, so okforge is a no-op until a repo declares
	 * one. Throws when the config is present but malformed.
	 */
	static loadConfig(cwd: string): OkfConfig {
		const configPath = OkfStore.configPath(cwd);
		if (Fs.existsSync(configPath) === false) {
			return { folders: {} };
		}
		let parsed: unknown;
		try {
			parsed = JSON.parse(Fs.readFileSync(configPath, 'utf-8'));
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`invalid JSON in ${CONFIG_FILENAME}: ${message}`);
		}
		const result = OkfConfigSchema.safeParse(parsed);
		if (result.success === false) {
			throw new Error(`invalid ${CONFIG_FILENAME}: ${result.error.issues.map((issue) => issue.message).join('; ')}`);
		}
		return result.data;
	}

	/** The OKF concept folder names declared in `cwd`'s config, in declared order. */
	static folders(cwd: string): string[] {
		return Object.keys(OkfStore.loadConfig(cwd).folders);
	}

	/** The source path prefixes `folder` is derived from, or `[]` when undeclared. */
	static sources(cwd: string, folder: string): string[] {
		const prefixes = OkfStore.loadConfig(cwd).folders[folder];
		return prefixes === undefined ? [] : [...prefixes];
	}

	/** Run `git` in `cwd`, returning its stdout, or '' when the command fails. */
	static git(args: string[], cwd: string): string {
		try {
			return ChildProcess.execFileSync('git', args, {
				cwd,
				encoding: 'utf-8',
				stdio: ['ignore', 'pipe', 'ignore'],
				maxBuffer: 32 * 1024 * 1024,
			});
		} catch {
			return '';
		}
	}

	/** Whether `cwd` is inside a git working tree. */
	static isGitRepo(cwd: string): boolean {
		try {
			ChildProcess.execFileSync('git', ['rev-parse', '--git-dir'], { cwd, stdio: 'ignore' });
			return true;
		} catch {
			return false;
		}
	}

	/** Tracked-and-untracked paths changed since HEAD, sorted and de-duplicated. */
	static changedPaths(cwd: string): string[] {
		const tracked = OkfStore.git(['diff', '--name-only', 'HEAD'], cwd);
		const untracked = OkfStore.git(['ls-files', '--others', '--exclude-standard'], cwd);
		const paths = `${tracked}\n${untracked}`
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line !== '');
		return [...new Set(paths)].sort();
	}

	/**
	 * Folders whose source changed since HEAD while the folder itself was not
	 * edited this session. Folders already being edited under `okf/<folder>` are
	 * skipped so the user is not nudged about work in progress.
	 */
	static staleFolders(cwd: string): StaleFolder[] {
		if (OkfStore.isGitRepo(cwd) === false) {
			return [];
		}
		const config = OkfStore.loadConfig(cwd);
		const folders = Object.keys(config.folders);
		if (folders.length === 0) {
			return [];
		}
		const changed = OkfStore.changedPaths(cwd);
		if (changed.length === 0) {
			return [];
		}
		const stale: StaleFolder[] = [];
		for (const folder of folders) {
			if (OkfStore.git(['status', '--porcelain', '--', `okf/${folder}`], cwd) !== '') {
				continue;
			}
			const source = OkfStore.firstMatch(changed, config.folders[folder]);
			if (source !== null) {
				stale.push({ folder, source });
			}
		}
		return stale;
	}

	/** First path in `changed` containing any of `prefixes` (substring match), or null. */
	static firstMatch(changed: string[], prefixes: string[]): string | null {
		for (const prefix of prefixes) {
			if (prefix === '') {
				continue;
			}
			const match = changed.find((path) => path.includes(prefix));
			if (match !== undefined) {
				return match;
			}
		}
		return null;
	}

	/**
	 * Conformance + dead-link lint of the `okf/` bundle under `cwd`. Returns the
	 * list of problems (empty when conformant); throws when there is no bundle.
	 * Needs no mapping — it lints the bundle's markdown alone, so it is fully
	 * repository-agnostic.
	 */
	static check(cwd: string): string[] {
		const root = Path.join(cwd, 'okf');
		if (Fs.existsSync(root) === false || Fs.statSync(root).isDirectory() === false) {
			throw new Error(`no okf/ bundle at ${root}`);
		}
		const problems: string[] = [];
		const entries = OkfStore.walk(root);

		// 1. snake_case names only (no kebab-case in any file or directory name).
		for (const entry of entries) {
			if (Path.basename(entry.path).includes('-') === true) {
				problems.push(`NAME: kebab-case not allowed: ${Path.relative(cwd, entry.path)}`);
			}
		}

		// 2. every non-index .md has frontmatter with a non-empty type.
		for (const entry of entries) {
			if (entry.isDirectory === true) {
				continue;
			}
			const name = Path.basename(entry.path);
			if (name.endsWith('.md') === false || name === 'index.md' || name === 'log.md') {
				continue;
			}
			if (OkfStore.hasTypeFrontmatter(Fs.readFileSync(entry.path, 'utf-8')) === false) {
				problems.push(`TYPE: missing/empty frontmatter type: ${Path.relative(cwd, entry.path)}`);
			}
		}

		// 3. sub-folder index.md must carry no frontmatter (root index.md may).
		for (const entry of entries) {
			if (entry.isDirectory === true || Path.basename(entry.path) !== 'index.md') {
				continue;
			}
			if (entry.path === Path.join(root, 'index.md')) {
				continue;
			}
			if (OkfStore.firstLine(Fs.readFileSync(entry.path, 'utf-8')) === '---') {
				problems.push(`INDEX: sub-folder index.md must not have frontmatter: ${Path.relative(cwd, entry.path)}`);
			}
		}

		// 4. bundle-relative links (/foo/bar.md) must resolve to a file.
		for (const link of OkfStore.bundleLinks(entries)) {
			if (Fs.existsSync(Path.join(root, link)) === false) {
				problems.push(`LINK: dangling bundle link: ${link}`);
			}
		}

		return problems;
	}

	/** The count of concept docs (non-index, non-log `.md`) in the bundle under `cwd`. */
	static conceptCount(cwd: string): number {
		const root = Path.join(cwd, 'okf');
		let count = 0;
		for (const entry of OkfStore.walk(root)) {
			if (entry.isDirectory === true) {
				continue;
			}
			const name = Path.basename(entry.path);
			if (name.endsWith('.md') === true && name !== 'index.md' && name !== 'log.md') {
				count += 1;
			}
		}
		return count;
	}

	/** Whether `content` opens with a `---` block holding a non-empty `type:`. */
	static hasTypeFrontmatter(content: string): boolean {
		const lines = content.split('\n');
		if (lines.length === 0 || lines[0] !== '---') {
			return false;
		}
		let seenType = false;
		for (let index = 1; index < lines.length; index += 1) {
			const line = lines[index];
			if (line === '---') {
				return seenType;
			}
			if (/^type:[ \t]*[^ \t]+/.test(line) === true) {
				seenType = true;
			}
		}
		return false;
	}

	/** Distinct bundle-relative `.md` link targets across every doc, sorted. */
	static bundleLinks(entries: WalkEntry[]): string[] {
		const links = new Set<string>();
		const pattern = /\]\((\/[a-z0-9_./-]+\.md)\)/g;
		for (const entry of entries) {
			if (entry.isDirectory === true || entry.path.endsWith('.md') === false) {
				continue;
			}
			const content = Fs.readFileSync(entry.path, 'utf-8');
			let match: RegExpExecArray | null = pattern.exec(content);
			while (match !== null) {
				links.add(match[1]);
				match = pattern.exec(content);
			}
		}
		return [...links].sort();
	}

	/** The first line of `content` (without its trailing newline). */
	static firstLine(content: string): string {
		return content.split('\n', 1)[0] ?? '';
	}

	/** Every file and directory under `dir`, recursively (excluding `dir` itself). */
	static walk(dir: string): WalkEntry[] {
		const result: WalkEntry[] = [];
		if (Fs.existsSync(dir) === false) {
			return result;
		}
		for (const entry of Fs.readdirSync(dir, { withFileTypes: true })) {
			const childPath = Path.join(dir, entry.name);
			const isDirectory = entry.isDirectory();
			result.push({ path: childPath, isDirectory });
			if (isDirectory === true) {
				result.push(...OkfStore.walk(childPath));
			}
		}
		return result;
	}
}
