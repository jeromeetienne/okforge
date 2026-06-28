import { OkfStore } from '../misc/okf_store.js';

/** `stale` — folders whose source changed since HEAD while the folder was not edited. */
export class StaleCommand {
	/** Printable lines, one per stale folder: `<folder> (source changed: <path>)`. */
	static stale(cwd: string): string[] {
		return OkfStore.staleFolders(cwd).map(({ folder, source }) => `${folder} (source changed: ${source})`);
	}
}
