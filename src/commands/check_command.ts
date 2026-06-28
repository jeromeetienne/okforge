import { OkfStore } from '../misc/okf_store.js';

/** Outcome of a conformance run: the problems found and a summary line. */
export type CheckResult = {
	problems: string[];
	summary: string;
};

/** `check` — conformance + dead-link lint of the `okf/` bundle. */
export class CheckCommand {
	/**
	 * Lint the bundle under `cwd`. Returns the problems and a summary line:
	 * `OK: N concept docs conformant` when clean, `FAILED: N problem(s)` otherwise.
	 * Throws when there is no `okf/` bundle.
	 */
	static check(cwd: string): CheckResult {
		const problems = OkfStore.check(cwd);
		if (problems.length === 0) {
			return { problems, summary: `OK: ${OkfStore.conceptCount(cwd)} concept docs conformant` };
		}
		return { problems, summary: `FAILED: ${problems.length} problem(s)` };
	}
}
