#!/usr/bin/env node
import { hostname } from 'os'
import { pipeline } from 'stream/promises'
import { fstatSync } from 'fs'
import { promisify } from 'util'
import { Config, Logger as SplunkLogger } from 'splunk-logging'
import meow from 'meow'
import { splitter } from './splitter.js'
import { noop, createLogger, attachErrorHandler } from './util.js'
import { stackTraceMerger } from './stackTraceMerger.js'

const {
    pkg: { name: packageName },
    showHelp,
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
-s, --silent             Mute outputs

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
                shortFlag: 'sc',
                default: 'stdio',
            },
            sourcetype: {
                type: 'string',
                shortFlag: 'st',
            },
            host: {
                type: 'string',
                default: hostname(),
            },
            quiet: {
                type: 'boolean',
                default: false,
                shortFlag: 'q',
            },
            silent: {
                type: 'boolean',
                default: false,
                shortFlag: 's',
            },
            help: {
                shortFlag: 'h',
            },
            version: {
                shortFlag: 'v',
            },
        },
        autoHelp: true,
        autoVersion: true,
    },
)

const isPipedIn = fstatSync(process.stdin.fd).isFIFO()
if (process.stdin.isTTY || !isPipedIn) {
    showHelp()
}

const { output, message, error } = createLogger({ packageName, quiet, silent })

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

// splunk-logger internally logs errors with `console.log`
// * use `error` method to make error easier to read and respect log level from options
// * catch and ignore rejections as error is logged already
const send = attachErrorHandler(promisify(splunkLogger.send), noop)
const flush = attachErrorHandler(promisify(splunkLogger.flush), noop)
console.log = error

const sendToSplunk = (log: string) =>
    send({
        message: log,
        metadata: {
            source,
            sourcetype,
            host,
        },
    })

let counter = 0

// ignore ctrl+c, exit only when stdin ends
process.on('SIGINT', noop)

await pipeline(process.stdin, splitter, stackTraceMerger, async function (logs: AsyncIterable<string>) {
    for await (const log of logs) {
        counter++
        sendToSplunk(log)
        output(log)
    }
})

// stdin ended, restore default ctrl+c behavior so even if splunk-logger hangs user can get out
process.removeListener('SIGINT', noop)

if (splunkLogger.serializedContextQueue.length > 0) {
    await flush()
}
// @ts-ignore workaround an issue where splunk-logging library does not clear internal timers and prevent node from exiting
// https://github.com/splunk/splunk-javascript-logging/issues/13
splunkLogger._disableTimer?.()

message(`end of input (${counter} logs)`)
