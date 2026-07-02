#!/usr/bin/env node
import Fs from 'node:fs';
import Path from 'node:path';
import { Command } from 'commander';
import Chalk from 'chalk';
import { MapCommand } from './commands/map_command.js';
import { FoldersCommand } from './commands/folders_command.js';
import { SourcesCommand } from './commands/sources_command.js';
import { StaleCommand } from './commands/stale_command.js';
import { CheckCommand } from './commands/check_command.js';
import { NudgeCommand } from './commands/nudge_command.js';
import { InstallCommand } from './commands/install_command.js';
import { GraphCommand } from './commands/graph_command.js';
import { WebviewCommand } from './commands/webview_command.js';

/** Wire up the subcommands and run them. */
async function main(): Promise<void> {
	const packageJsonPath = Path.join(import.meta.dirname, '..', 'package.json');
	const { version } = JSON.parse(Fs.readFileSync(packageJsonPath, 'utf8')) as { version: string };

	const program = new Command();
	program
		.name('okforge')
		.description('Deterministic mechanics and Stop-hook nudge for the okf (Open Knowledge Format) skill')
		.version(version, '-V, --version', 'output the version number');

	program
		.command('folders')
		.description('List the OKF concept folders declared in .okforge.config.json')
		.argument('[dir]', 'Repository root', '.')
		.action((dir: string) => {
			for (const folder of FoldersCommand.folders(Path.resolve(dir))) {
				console.log(folder);
			}
		});

	program
		.command('map')
		.description('Print the full folder -> sources mapping')
		.argument('[dir]', 'Repository root', '.')
		.action((dir: string) => {
			for (const line of MapCommand.map(Path.resolve(dir))) {
				console.log(line);
			}
		});

	program
		.command('sources')
		.description('Print the source paths a folder is derived from')
		.argument('<folder>', 'OKF concept folder')
		.argument('[dir]', 'Repository root', '.')
		.action((folder: string, dir: string) => {
			for (const source of SourcesCommand.sources(Path.resolve(dir), folder)) {
				console.log(source);
			}
		});

	program
		.command('stale')
		.description('List folders whose source changed while the folder was not updated')
		.argument('[dir]', 'Repository root', '.')
		.option('--since <ref>', 'Diff the committed range <ref>...HEAD (CI gate: exits non-zero when stale)')
		.action((dir: string, options: { since?: string }) => {
			const lines = StaleCommand.stale(Path.resolve(dir), options.since);
			for (const line of lines) {
				console.log(line);
			}
			if (options.since !== undefined && lines.length > 0) {
				process.exit(1);
			}
		});

	program
		.command('check')
		.description('Conformance + dead-link lint; exits non-zero on problems')
		.argument('[dir]', 'Repository root', '.')
		.action((dir: string) => {
			const cwd = Path.resolve(dir);
			let result;
			try {
				result = CheckCommand.check(cwd);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(message);
				process.exit(2);
			}
			for (const problem of result.problems) {
				console.log(problem);
			}
			if (result.problems.length === 0) {
				console.log(result.summary);
				return;
			}
			console.error(result.summary);
			process.exit(1);
		});

	program
		.command('graph')
		.description('Read-only concept-graph queries over an OKF bundle (JSON output for the okforge-query skill)')
		.argument('<op>', 'overview | concept <id> | neighbors <id> | orphans | broken | path <a> <b>')
		.argument('[args...]', 'Operation arguments (Concept IDs)')
		.option('-b, --bundle <dir>', 'Bundle root directory', '.')
		.option('-n, --hops <n>', 'Neighbor radius for the neighbors op', '1')
		.action((op: string, args: string[], options: { bundle: string; hops: string }) => {
			const root = GraphCommand.resolveRoot(options.bundle);
			const hops = Number.parseInt(options.hops, 10);
			const result = GraphCommand.run(op, args, root, Number.isNaN(hops) === true ? 1 : hops);
			console.log(JSON.stringify(result, null, 2));
		});

	const webview = program
		.command('webview')
		.description('Generate or serve a static website to browse an OKF bundle');
	webview
		.command('generate')
		.description('Generate a static OKF webview into an output folder')
		.argument('[bundle]', 'OKF bundle root directory or http(s) URL', '.okf')
		.option('-o, --output_folder <dir>', 'Output directory for the static site', 'okforge_webview')
		.action(async (bundle: string, options: { output_folder: string }) => {
			await WebviewCommand.generate(bundle, options.output_folder);
		});
	webview
		.command('show')
		.description('Generate the webview into a temp folder and serve it over HTTP')
		.argument('[bundle]', 'OKF bundle root directory or http(s) URL', '.okf')
		.action(async (bundle: string) => {
			await WebviewCommand.show(bundle);
		});

	program
		.command('nudge')
		.description('Stop-hook companion: read the hook payload on stdin and maybe remind')
		.action(async () => {
			await NudgeCommand.nudge();
		});

	program
		.command('install')
		.description('Copy the bundled okf skill into an AI agent folder (e.g. .claude)')
		.argument('[agent_folder]', 'Destination agent folder', '.')
		.action((agentFolder: string) => {
			const result = InstallCommand.install(agentFolder);
			for (const file of result.files) {
				console.log(`${Chalk.green(file.action)} ${file.destination}`);
			}
			if (result.hook.status === 'added') {
				console.log(`${Chalk.green('hook')} registered \`npx okforge nudge\` in ${result.hook.settingsPath}`);
			} else if (result.hook.status === 'present') {
				console.log(`${Chalk.dim('hook')} \`npx okforge nudge\` already registered in ${result.hook.settingsPath}`);
			} else {
				console.log(Chalk.dim('hook  skipped (target is not a .claude folder; pass a .claude path to register the Stop hook)'));
			}
			console.log(Chalk.bold(`\n${result.files.length} file(s) → ${result.destinationDir}`));
		});

	await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(Chalk.red(`error: ${message}`));
	process.exit(1);
});
