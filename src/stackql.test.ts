import { assertStringIncludes } from 'https://deno.land/std@0.206.0/assert/mod.ts'
import { StackQL } from './stackql.ts'
import {
	isCsvString,
	isJsonString,
	startStackQLServer,
} from '../testing/utils.ts'
import {
	assertEquals,
	assertExists,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts'
import { Downloader } from './services/downloader.ts'
import {
	assertSpyCall,
	spy,
} from 'https://deno.land/std@0.207.0/testing/mock.ts'
import osUtils from './utils/os.ts'
import { assert } from 'https://deno.land/std@0.133.0/_util/assert.ts'
import { assertThrows } from 'https://deno.land/std@0.206.0/assert/assert_throws.ts'

const downloader = new Downloader()

const setupStackQL = async () => {
	await downloader.setupStackQL()
}

Deno.test('Query: Execute Registry Pull and Show Providers Queries', async () => {
	await setupStackQL()

	// Arrange
	const stackQL = new StackQL()
	await stackQL.initialize({ serverMode: false })

	const pullQuery = 'REGISTRY PULL github;'
	const providerQuery = 'SHOW PROVIDERS'
	const githubTestQuery =
		`SELECT id, name from github.repos.repos where org='stackql'`

	// Act
	await stackQL.execute(pullQuery)
	const result = await stackQL.execute(providerQuery)
	const githubResult = await stackQL.execute(githubTestQuery)

	// Assert
	assertStringIncludes(result, 'name')
	assertStringIncludes(result, 'version')
	assertStringIncludes(result, 'github')
	assertStringIncludes(githubResult, 'stackql')
})

Deno.test('Configuration: Apply Settings from Configs', async () => {
	await setupStackQL()
	const runCliSpy = spy(osUtils, 'runCommand')
	const stackQL = new StackQL()
	await stackQL.initialize({
		serverMode: false,
		maxResults: 100,
		pageLimit: 10,
		maxDepth: 5,
		apiTimeout: 5000,
	})
	const githubTestQuery =
		`SELECT id, name from github.repos.repos where org='stackql'`

	await stackQL.execute(githubTestQuery)

	const params = stackQL.getParams()
	assertEquals(params.length, 8)
	assertEquals(params, [
		'--http.response.maxResults',
		'100',
		'--http.response.pageLimit',
		'10',
		'--indirect.depth.max',
		'5',
		'--apirequesttimeout',
		'5000',
	])
	const binaryPath = stackQL.getBinaryPath()
	assert(binaryPath)
	assertSpyCall(runCliSpy, 0, {
		args: [binaryPath, ['exec', githubTestQuery, ...params]],
	})
	runCliSpy.restore()
})

Deno.test('Configuration: Apply Proxy Settings from Configs', async () => {
	await setupStackQL()
	const runCommandSpy = spy(osUtils, 'runCommand')
	const stackQL = new StackQL()
	await stackQL.initialize({
		serverMode: false,
		proxyHost: 'localhost',
		proxyPort: 8080,
		proxyUser: 'user',
		proxyPassword: 'password',
		proxyScheme: 'https',
	})
	const githubTestQuery =
		`SELECT id, name from github.repos.repos where org='stackql'`

	await stackQL.execute(githubTestQuery)

	const params = stackQL.getParams()
	assertEquals(params, [
		'--http.proxy.host',
		'localhost',
		'--http.proxy.port',
		'8080',
		'--http.proxy.user',
		'user',
		'--http.proxy.password',
		'password',
		'--http.proxy.scheme',
		'https',
	])
	const binaryPath = stackQL.getBinaryPath()
	assert(binaryPath)
	assertSpyCall(runCommandSpy, 0, {
		args: [binaryPath, ['exec', githubTestQuery, ...params]],
	})
	runCommandSpy.restore()
})

Deno.test('Query: json output', async () => {
	await setupStackQL()
	const stackQL = new StackQL()
	await stackQL.initialize({
		serverMode: false,
		outputFormat: 'json',
	})
	const githubTestQuery =
		`SELECT id, name from github.repos.repos where org='stackql'`

	const result = await stackQL.execute(githubTestQuery)

	const params = stackQL.getParams()

	assertEquals(params, [
		'--output',
		'json',
	])
	assert(isJsonString(result))
	assert(!(await isCsvString(result)))
})

Deno.test('Query: csv output', async () => {
	await setupStackQL()
	const stackQL = new StackQL()
	await stackQL.initialize({
		serverMode: false,
		outputFormat: 'csv',
	})
	const githubTestQuery =
		`SELECT id, name from github.repos.repos where org='stackql'`

	const result = await stackQL.execute(githubTestQuery)
	const params = stackQL.getParams()

	assertEquals(params, [
		'--output',
		'csv',
	])
	assert(!isJsonString(result))
	assert(await isCsvString(result))
})

Deno.test('Server mode: csv output throw error', async () => {
	const { closeProcess } = await startStackQLServer()
	const stackQL = new StackQL()
	try {
		await stackQL.initialize({
			serverMode: true,
			outputFormat: 'csv',
			connectionString:
				'postgres://postgres:password@localhost:5444/postgres',
		})
		const testQuery = 'SHOW SERVICES IN github LIKE \'%repos%\';' // Replace with a valid query for your context

		await stackQL.execute(testQuery)
	} catch (error) {
		assert(error)
		assert(
			error.message.includes(
				'csv output is not supported in server mode',
			),
		)
	} finally {
		await closeProcess()
		await stackQL.closeConnection()
	}
})

Deno.test('Server mode: Query', async () => {
	const { closeProcess } = await startStackQLServer()
	const stackQL = new StackQL()

	try {
		// Arrange
		await stackQL.initialize({
			serverMode: true,
			connectionString:
				'postgres://postgres:password@localhost:5444/postgres',
		})
		const pullQuery = 'REGISTRY PULL github;'
		const testQuery = 'SHOW SERVICES IN github LIKE \'%repos%\';' // Replace with a valid query for your context

		// Act
		await stackQL.execute(pullQuery)
		const results = await stackQL.execute(testQuery)

		assertExists(results)
		const resultObj = JSON.parse(results)
		assertEquals(resultObj.length, 1)
		const result = resultObj[0] as {
			name: string
		}
		assertEquals(result.name, 'repos')
	} finally {
		// Cleanup
		await closeProcess()
		await stackQL.closeConnection()
	}
})

Deno.test('GetVersion', async () => {
	await setupStackQL()
	const stackQL = new StackQL()
	await stackQL.initialize({ serverMode: false })
	const versionRegex = /^v?(\d+(?:\.\d+)*)$/
	const shaRegex = /^[a-f0-9]{7}$/

	const { version, sha } = await stackQL.getVersion()

	assert(version)
	assert(sha)
	assert(versionRegex.test(version))
	assert(shaRegex.test(sha))
})

Deno.test('GetVersion: getVersion when version and sha are undefined', async () => {
	await setupStackQL()
	const stackQL = new StackQL()
	await stackQL.initialize({ serverMode: false })
	const versionRegex = /^v?(\d+(?:\.\d+)*)$/
	const shaRegex = /^[a-f0-9]{7}$/ // deno-lint-ignore no-explicit-any
	;(stackQL as any).version = undefined // deno-lint-ignore no-explicit-any
	;(stackQL as any).sha = undefined
	// deno-lint-ignore no-explicit-any
	assert((stackQL as any).version === undefined)
	// deno-lint-ignore no-explicit-any
	assert((stackQL as any).sha === undefined)

	const { version, sha } = await stackQL.getVersion()

	assert(version)
	assert(sha)
	assert(versionRegex.test(version))
	assert(shaRegex.test(sha))
})

Deno.test('Upgrade: upgrade stackql', async () => {
	await setupStackQL()
	const stackQL = new StackQL()
	await stackQL.initialize({ serverMode: false }) // deno-lint-ignore no-explicit-any
	;(stackQL as any).version = undefined // deno-lint-ignore no-explicit-any
	;(stackQL as any).sha = undefined
	const versionRegex = /^v?(\d+(?:\.\d+)*)$/
	const shaRegex = /^[a-f0-9]{7}$/
	// deno-lint-ignore no-explicit-any
	assert((stackQL as any).version === undefined)
	// deno-lint-ignore no-explicit-any
	assert((stackQL as any).sha === undefined)
	const { version, sha } = await stackQL.upgrade()
	assert(version)
	assert(sha)
	assert(versionRegex.test(version))
	assert(shaRegex.test(sha))
})
