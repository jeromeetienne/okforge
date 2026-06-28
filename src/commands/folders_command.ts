import { OkfStore } from '../misc/okf_store.js';

/** `folders` — list the OKF concept folders, one per line. */
export class FoldersCommand {
	/** The OKF concept folder names declared in `cwd`'s config, in declared order. */
	static folders(cwd: string): string[] {
		return OkfStore.folders(cwd);
	}
}
