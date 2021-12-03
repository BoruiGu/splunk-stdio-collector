#!/usr/bin/env tsm
import * as os from 'os'
import * as stream from 'stream/promises'
import { promisify } from 'util'
import { Config, Logger as SplunkLogger } from 'splunk-logging'
import meow from 'meow'
import { name as packageName } from '../package.json'
import { splitter } from './splitter'
import { noop } from './util'
import { stackTraceMerger } from './stackTraceMerger'

// todo help & version
const {
    showHelp,
    showVersion,
    flags: { source, sourcetype, host },
} = meow(
    `
Usage:
splunk-stdio-collector [options]

Required Environment Variables:
SPLUNK_URL=<url>
SPLUNK_TOKEN=<token>

Options:
-s, --source <str>       Set \`source\` field in logs [default: stdio]
-st, --sourcetype <str>  Set \`sourcetype\` field in logs
--host <str>             Set \`host\` field in logs [default: host name of the operating system]

alias: ssc

Examples:
  $ stdbuf -i0 -o0 -e0 npm start | ssc -st my-program
  $ cat log.txt | ssc
`,
    {
        importMeta: import.meta,
        flags: {
            source: {
                type: 'string',
                alias: 's',
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
        },
        autoHelp: true,
        autoVersion: true,
    }
)

const message = (...params: any[]) => console.error(`${packageName}:`, ...params)

if (process.stdin.isTTY) {
    showHelp()
}

const SPLUNK_URL = process.env.SPLUNK_URL
const SPLUNK_TOKEN = process.env.SPLUNK_TOKEN

if (!SPLUNK_URL || !SPLUNK_TOKEN) {
    message(`SPLUNK_URL and SPLUNK_TOKEN environment variables are required`)
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

const sendToSplunk = (log: string) =>
    send({
        message: log,
        metadata: {
            source,
            sourcetype,
            host,
        },
    }).catch(message)

let counter = 0

// ignore ctrl+c, exit only when stdin is closed
process.on('SIGINT', noop)

// @ts-ignore
await stream.pipeline(process.stdin, splitter, stackTraceMerger, async function (logs: string) {
    for await (const log of logs) {
        counter++
        sendToSplunk(log)
        console.log(log)
    }
})

if (splunkLogger.serializedContextQueue.length > 0) {
    await flush().catch(message)
}
// @ts-ignore workaround an issue where splunk-logging library does not clear internal timers and prevent node from exiting
// https://github.com/splunk/splunk-javascript-logging/issues/13
splunkLogger._disableTimer?.()

message(`end of input (${counter} logs)`)
