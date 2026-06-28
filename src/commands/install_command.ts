import Fs from 'node:fs';
import Path from 'node:path';

/** Outcome of copying a single skill file into the destination folder. */
export type InstalledFile = {
	name: string;
	action: 'created' | 'updated';
	destination: string;
};

/** Summary returned by {@link InstallCommand.install}. */
export type InstallResult = {
	destinationDir: string;
	files: InstalledFile[];
};

/** `install` — copy the bundled okf skill into an AI agent folder (e.g. `.claude`). */
export class InstallCommand {
	/**
	 * Copy the bundled `skills/okf/` tree into `agentFolder` (the agent directory,
	 * e.g. `.claude`), preserving the `skills/okf/...` layout, to set the skill up
	 * in a target project. Machine-local settings are never copied.
	 * @param agentFolder Destination agent folder; the caller defaults it to `.`.
	 * @returns The destination directory and the per-file outcome.
	 */
	static install(agentFolder: string): InstallResult {
		const skillsDir = Path.join(import.meta.dirname, '..', '..', '.claude', 'skills');
		if (Fs.existsSync(skillsDir) === false) {
			throw new Error(`bundled skill files not found at ${skillsDir}`);
		}
		const destinationDir = Path.resolve(agentFolder);
		const files: InstalledFile[] = [];
		for (const relative of InstallCommand.listFiles(skillsDir)) {
			const name = Path.join('skills', relative);
			const destination = Path.join(destinationDir, name);
			const exists = Fs.existsSync(destination);
			Fs.mkdirSync(Path.dirname(destination), { recursive: true });
			Fs.copyFileSync(Path.join(skillsDir, relative), destination);
			files.push({ name, action: exists === true ? 'updated' : 'created', destination });
		}
		return { destinationDir, files };
	}

	/** Paths of every file under `dir`, relative to `dir`, recursively. */
	static listFiles(dir: string): string[] {
		const result: string[] = [];
		for (const entry of Fs.readdirSync(dir, { withFileTypes: true })) {
			if (entry.isDirectory() === true) {
				for (const nested of InstallCommand.listFiles(Path.join(dir, entry.name))) {
					result.push(Path.join(entry.name, nested));
				}
			} else {
				result.push(entry.name);
			}
		}
		return result;
	}
}
