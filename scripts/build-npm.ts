// ex. scripts/build_npm.ts
import { build, emptyDir } from 'https://deno.land/x/dnt/mod.ts';

await emptyDir('./npm');

await build({
	typeCheck: false,
	test: false,
	declaration: false,
	scriptModule: false,
	entryPoints: ['./mod.ts'],
	outDir: './npm',
	shims: {
		// see JS docs for overview and more options
		deno: true,
	},
	package: {
		// package.json properties
		name: '@stackql/stackqljs',
		version: Deno.args[0],
		description:
			'StackQL client library for Deno and Node.js that exposes all features StackQL.',
		license: 'MIT',
		repository: {
			type: 'git',
			url: 'git+https://github.com/stackql/stackqljs.git',
		},
		bugs: {
			url: 'https://github.com/stackql/stackqljs/issues',
		},
	},
	postBuild() {
		// steps to run after building and before running the tests
		Deno.copyFileSync('LICENSE', 'npm/LICENSE');
		Deno.copyFileSync('README.md', 'npm/README.md');
	},
});
