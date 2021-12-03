#!/usr/bin/env tsm
import * as os from 'os'
import * as stream from 'stream/promises'
import { promisify } from 'util'
import { Config, Logger as SplunkLogger } from 'splunk-logging'
import meow from 'meow'
import { splitter } from './splitter'
import { noop, createLogger } from './util'
import { stackTraceMerger } from './stackTraceMerger'

// todo help & version
const {
    showHelp,
    showVersion,
    flags: { source, sourcetype, host, quiet, silent },
} = meow(
    `
Usage:
splunk-stdio-collector [options]

Required Environment Variables:
SPLUNK_URL=<url>
SPLUNK_TOKEN=<token>

Options:
-sc, --source <str>      Set \`source\` field in logs [default: stdio]
-st, --sourcetype <str>  Set \`sourcetype\` field in logs
--host <str>             Set \`host\` field in logs [default: host name of the operating system]
-q, --quiet              Don't forward logs to stdout
-s, --silent             Mute all output

alias: ssc

Examples:
$ stdbuf -i0 -o0 -e0 npm start | ssc --sourcetype my-program
$ cat log.txt | ssc --quiet
`,
    {
        importMeta: import.meta,
        flags: {
            source: {
                type: 'string',
                alias: 'sc',
                default: 'stdio',
            },
            sourcetype: {
                type: 'string',
                alias: 'st',
            },
            host: {
                type: 'string',
                default: os.hostname(),
            },
            quiet: {
                type: 'boolean',
                default: false,
                alias: 'q',
            },
            silent: {
                type: 'boolean',
                default: false,
                alias: 's',
            },
        },
        autoHelp: true,
        autoVersion: true,
    }
)

if (process.stdin.isTTY) {
    showHelp()
}

const { output, message, error } = createLogger({ quiet, silent })

const SPLUNK_URL = process.env.SPLUNK_URL
const SPLUNK_TOKEN = process.env.SPLUNK_TOKEN

if (!SPLUNK_URL || !SPLUNK_TOKEN) {
    error(`SPLUNK_URL and SPLUNK_TOKEN environment variables are required`)
    process.exit(1)
}

const config: Config = {
    token: SPLUNK_TOKEN,
    url: SPLUNK_URL,
    batchInterval: 1000,
    maxBatchCount: 500,
    maxBatchSize: 10 * 1024 * 1024,
}

const splunkLogger = new SplunkLogger(config)
splunkLogger.eventFormatter = (log) => log
const send = promisify(splunkLogger.send)
const flush = promisify(splunkLogger.flush)
// splunk-logging library will log errors to console (can't be configured)
const handleSplunkError = () => error('error writing to splunk, check log above for details')

const sendToSplunk = (log: string) =>
    send({
        message: log,
        metadata: {
            source,
            sourcetype,
            host,
        },
    }).catch(handleSplunkError)

let counter = 0

// ignore ctrl+c, exit only when stdin ends
process.on('SIGINT', noop)

// @ts-ignore todo
await stream.pipeline(process.stdin, splitter, stackTraceMerger, async function (logs: string) {
    for await (const log of logs) {
        counter++
        sendToSplunk(log)
        output(log)
    }
})

// stdin ended, restore default ctrl+c behavior so even if splunk-logger hangs user can get out
process.removeListener('SIGINT', noop)

if (splunkLogger.serializedContextQueue.length > 0) {
    await flush().catch(handleSplunkError)
}
// @ts-ignore workaround an issue where splunk-logging library does not clear internal timers and prevent node from exiting
// https://github.com/splunk/splunk-javascript-logging/issues/13
splunkLogger._disableTimer?.()

message(`end of input (${counter} logs)`)
