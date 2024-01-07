import {
	assert,
	assertEquals,
	assertExists,
	assertSpyCall,
	assertStringIncludes,
	spy,
} from "../dev_deps.ts";

import { StackQL } from "./stackql.ts";
import { isCsvString, startStackQLServer } from "../../testing/utils.ts";
import { Downloader } from "./services/downloader.ts";
import osUtils from "./utils/os.ts";

const downloader = new Downloader();

const setupStackQL = async () => {
	await downloader.setupStackQL();
};

Deno.test("Query: Execute Statement and Query", async () => {
	await setupStackQL();

	// Arrange
	const stackQL = new StackQL();
	await stackQL.initialize({ serverMode: false });

	const pullQuery = "REGISTRY PULL github;";
	const providerQuery = "SHOW PROVIDERS";
	const githubTestQuery =
		`SELECT id, name from github.repos.repos where org='stackql' and name='stackql'`;

	// Act
	await stackQL.executeStatement(pullQuery);
	const result = await stackQL.executeStatement(providerQuery);
	const githubResult = await stackQL.execute(githubTestQuery) as unknown[];
	const githubResultObj = githubResult[0] as {
		id: string;
		name: string;
	};

	// Assert
	assertStringIncludes(result, "name");
	assertStringIncludes(result, "version");
	assertStringIncludes(result, "github");
	assertEquals(githubResultObj.name, "stackql");
});

Deno.test("Configuration: Apply Settings from Configs", async () => {
	await setupStackQL();
	const runCliSpy = spy(osUtils, "runCommand");
	const stackQL = new StackQL();
	await stackQL.initialize({
		serverMode: false,
		maxResults: 100,
		pageLimit: 10,
		maxDepth: 5,
		apiTimeout: 5000,
	});
	const githubTestQuery =
		`SELECT id, name from github.repos.repos where org='stackql'`;

	await stackQL.execute(githubTestQuery);

	const params = stackQL.getParams();
	assertEquals(params.length, 10);
	assertEquals(params, [
		"--http.response.maxResults",
		"100",
		"--http.response.pageLimit",
		"10",
		"--indirect.depth.max",
		"5",
		"--apirequesttimeout",
		"5000",
		"--output",
		"json",
	]);
	const binaryPath = stackQL.getBinaryPath();
	assert(binaryPath);
	assertSpyCall(runCliSpy, 0, {
		args: [binaryPath, ["exec", githubTestQuery, ...params]],
	});
	runCliSpy.restore();
});

Deno.test("Configuration: Apply Proxy Settings from Configs", async () => {
	await setupStackQL();
	const runCommandSpy = spy(osUtils, "runCommand");
	const stackQL = new StackQL();
	await stackQL.initialize({
		serverMode: false,
		proxyHost: "localhost",
		proxyPort: 8080,
		proxyUser: "user",
		proxyPassword: "password",
		proxyScheme: "https",
	});
	const githubTestQuery =
		`SELECT id, name from github.repos.repos where org='stackql'`;

	await stackQL.execute(githubTestQuery);

	const params = stackQL.getParams();
	assertEquals(params, [
		"--http.proxy.host",
		"localhost",
		"--http.proxy.port",
		"8080",
		"--http.proxy.user",
		"user",
		"--http.proxy.password",
		"password",
		"--http.proxy.scheme",
		"https",
		"--output",
		"json",
	]);
	const binaryPath = stackQL.getBinaryPath();
	assert(binaryPath);
	assertSpyCall(runCommandSpy, 0, {
		args: [binaryPath, ["exec", githubTestQuery, ...params]],
	});
	runCommandSpy.restore();
});

Deno.test("Query: json output", async () => {
	await setupStackQL();
	const stackQL = new StackQL();
	await stackQL.initialize({
		serverMode: false,
		outputFormat: "object",
	});
	const githubTestQuery =
		`SELECT id, name from github.repos.repos where org='stackql'`;

	const result = await stackQL.execute(githubTestQuery) as unknown[];

	const params = stackQL.getParams();

	assertEquals(params, [
		"--output",
		"json",
	]);
	assert(Array.isArray(result));
});

Deno.test("Query: csv output", async () => {
	await setupStackQL();
	const stackQL = new StackQL();
	await stackQL.initialize({
		serverMode: false,
		outputFormat: "csv",
	});
	const githubTestQuery =
		`SELECT id, name from github.repos.repos where org='stackql'`;

	const result = await stackQL.execute(githubTestQuery) as string;
	const params = stackQL.getParams();

	assertEquals(params, [
		"--output",
		"csv",
	]);
	assert(!Array.isArray(result));
	assert(await isCsvString(result));
});

Deno.test("Server mode: csv output throw error", async () => {
	const { closeProcess } = await startStackQLServer();
	const stackQL = new StackQL();
	try {
		await stackQL.initialize({
			serverMode: true,
			outputFormat: "csv",
			connectionString:
				"postgres://postgres:password@localhost:5444/postgres",
		});
		const testQuery = "SHOW SERVICES IN github LIKE '%repos%';"; // Replace with a valid query for your context

		await stackQL.execute(testQuery);
	} catch (error) {
		assert(error);
		assert(
			error.message.includes(
				"csv output is not supported in server mode",
			),
		);
	} finally {
		await closeProcess();
		await stackQL.closeConnection();
	}
});

Deno.test("Server mode: Query", async () => {
	const { closeProcess } = await startStackQLServer();
	const stackQL = new StackQL();

	try {
		// Arrange
		await stackQL.initialize({
			serverMode: true,
			connectionString:
				"postgres://postgres:password@localhost:5444/postgres",
		});
		const pullQuery = "REGISTRY PULL github;";
		const showServiceQuery = "SHOW SERVICES IN github LIKE '%repos%';"; // Replace with a valid query for your context

		// Act
		await stackQL.executeStatement(pullQuery);
		const showServiceResult = await stackQL.execute(showServiceQuery);

		assertExists(showServiceResult);
		assert(Array.isArray(showServiceResult));
		assertEquals(showServiceResult.length, 1);
		const result = showServiceResult[0] as {
			name: string;
		};
		assertEquals(result.name, "repos");
	} finally {
		// Cleanup
		await closeProcess();
		await stackQL.closeConnection();
	}
});

Deno.test("executeQueriesAsync: object format", async () => {
	await setupStackQL();
	const stackQL = new StackQL();
	await stackQL.initialize({ serverMode: false });

	const pullQuery = "REGISTRY PULL github;";
	const providerQuery = "SHOW PROVIDERS";
	const githubTestQuery =
		`SELECT id, name from github.repos.repos where org='stackql' and name='stackql'`;

	const results = await stackQL.executeQueriesAsync([
		pullQuery,
		providerQuery,
		githubTestQuery,
	]);

	assert(Array.isArray(results));
	assertEquals(results.length, 3);

	const githubResult = results[2] as unknown[];
	const githubResultObj = githubResult[0] as {
		id: string;
		name: string;
	};
	assertEquals(githubResultObj.name, "stackql");
});

Deno.test("executeQueriesAsync: csv format", async () => {
	await setupStackQL();
	const stackQL = new StackQL();
	await stackQL.initialize({
		serverMode: false,
		outputFormat: "csv",
	});

	const pullQuery = "REGISTRY PULL github;";
	const providerQuery = "SHOW PROVIDERS";
	const githubTestQuery =
		`SELECT id, name from github.repos.repos where org='stackql' and name='stackql'`;

	const results = await stackQL.executeQueriesAsync([
		pullQuery,
		providerQuery,
		githubTestQuery,
	]);

	assert(Array.isArray(results));
	assertEquals(results.length, 3);

	const githubResult = results[2] as string;
	assert(await isCsvString(githubResult));
});

Deno.test("GetVersion", async () => {
	await setupStackQL();
	const stackQL = new StackQL();
	await stackQL.initialize({ serverMode: false });
	const versionRegex = /^v?(\d+(?:\.\d+)*)$/;
	const shaRegex = /^[a-f0-9]{7}$/;

	const { version, sha } = await stackQL.getVersion();

	assert(version);
	assert(sha);
	assert(versionRegex.test(version));
	assert(shaRegex.test(sha));
});

Deno.test("GetVersion: getVersion when version and sha are undefined", async () => {
	await setupStackQL();
	const stackQL = new StackQL();
	await stackQL.initialize({ serverMode: false });
	const versionRegex = /^v?(\d+(?:\.\d+)*)$/;
	const shaRegex = /^[a-f0-9]{7}$/;
	// deno-lint-ignore no-explicit-any
	(stackQL as any).version = undefined;
	// deno-lint-ignore no-explicit-any
	(stackQL as any).sha = undefined;
	// deno-lint-ignore no-explicit-any
	assert((stackQL as any).version === undefined);
	// deno-lint-ignore no-explicit-any
	assert((stackQL as any).sha === undefined);

	const { version, sha } = await stackQL.getVersion();

	assert(version);
	assert(sha);
	assert(versionRegex.test(version));
	assert(shaRegex.test(sha));
});

Deno.test("Upgrade: upgrade stackql", async () => {
	await setupStackQL();
	const stackQL = new StackQL();
	await stackQL.initialize({ serverMode: false }) // deno-lint-ignore no-explicit-any
	;
	(stackQL as any).version = undefined // deno-lint-ignore no-explicit-any
	;
	(stackQL as any).sha = undefined;
	const versionRegex = /^v?(\d+(?:\.\d+)*)$/;
	const shaRegex = /^[a-f0-9]{7}$/;
	// deno-lint-ignore no-explicit-any
	assert((stackQL as any).version === undefined);
	// deno-lint-ignore no-explicit-any
	assert((stackQL as any).sha === undefined);
	const { version, sha } = await stackQL.upgrade();
	assert(version);
	assert(sha);
	assert(versionRegex.test(version));
	assert(shaRegex.test(sha));
});
