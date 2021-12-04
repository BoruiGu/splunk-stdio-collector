import tty from 'tty'
import { execa, Options } from 'execa'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

describe('cli', () => {
    const cliPath = resolve(dirname(fileURLToPath(import.meta.url)), '../src/cli.ts')
    const env = { SPLUNK_URL: 'url', SPLUNK_TOKEN: 'token' }
    const options: Options = { env, preferLocal: true }

    test('prints help and version', async () => {
        let stdout = (await execa('tsm', [cliPath, '-h'], options)).stdout
        expect(stdout).toContain('Usage')

        stdout = (await execa('tsm', [cliPath, '--help'], options)).stdout
        expect(stdout).toContain('Usage')

        stdout = (await execa('tsm', [cliPath, '-v'], options)).stdout
        expect(stdout).toMatch(/\d{1,2}\.\d{1,2}\.\d{1,2}/)

        stdout = (await execa('tsm', [cliPath, '--version'], options)).stdout
        expect(stdout).toMatch(/\d{1,2}\.\d{1,2}\.\d{1,2}/)
    })

    test('prints help and exit if no data piped into command', async () => {
        const stdout = (await execa('tsm', [cliPath], options).catch((err) => err)).stdout
        expect(stdout).toContain('Usage')
    })

    test('prints help and exit if stdin is tty', async () => {
        const stdout = (await execa('tsm', [cliPath], { ...options, stdin: new tty.ReadStream(0) }).catch((err) => err)).stdout
        expect(stdout).toContain('Usage')
    })

    // test('prints help and exit if missing environment variables', async () => {
    //     const echo = execa('echo', ['abc'])
    //     const ssc = execa('tsm', [cliPath], { stdin: echo.stdout })
    //     let stdout = await execa(`echo abc | npx tsm ${cliPath}`, { ...options, env: { path: process.env.PATH } }).catch((err) => err)
    //     // expect(stdout.stdout).toContain('environment variables')
    // })

    // describe('no env var')
    // describe('options')
    // describe('logging and error handling')
    // describe('ctrl+c shutdown code')
    // describe('ctrl+c after stdin end')
})
