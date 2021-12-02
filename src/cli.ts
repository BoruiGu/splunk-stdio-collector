#!/usr/bin/env tsm
import * as os from 'os'
import * as stream from 'stream/promises'
import { Config, Logger as SplunkLogger } from 'splunk-logging'
import { name as packageName } from '../package.json'
import { splitter } from './splitter'
import { noop } from './util'
import { stackTraceMerger } from './stackTraceMerger'
import { promisify } from 'util'

process.title = packageName

if (process.stdin.isTTY) {
    console.log('todo help text here')
    process.exit(0)
}
const argv = process.argv.slice(2)
const silent = argv.includes('-s')
const source = argv.pop()

const SPLUNK_URL = process.env.SPLUNK_URL
const SPLUNK_TOKEN = process.env.SPLUNK_TOKEN

if (!SPLUNK_URL || !SPLUNK_TOKEN) {
    console.error(`SPLUNK_URL or SPLUNK_TOKEN not found in env`)
    process.exit(1)
}

const config: Config = {
    token: SPLUNK_TOKEN,
    url: SPLUNK_URL,
    batchInterval: 1000,
    maxBatchCount: 500,
    maxBatchSize: 10 * 1024 * 1024,
};

const splunkLogger = new SplunkLogger(config)
splunkLogger.eventFormatter = (log) => log
const send = promisify(splunkLogger.send)
const flush = promisify(splunkLogger.flush)

const sendToSplunk = (log: string) => send({
    message: log,
    metadata: {
        source,
        sourcetype: "stdout",
        host: os.hostname(),
    },
}).catch(console.error)

let counter = 0

// ignore ctrl+c, only exit when stdin is closed
process.on('SIGINT', noop)

// @ts-ignore
await stream.pipeline(
    process.stdin, 
    splitter,
    stackTraceMerger,
    async function (logs: string) {
      for await (const log of logs) {
        counter++
        sendToSplunk(log)
        if (!silent) {
            console.log(log)
        }
      }
    },
)

// @ts-ignore type mismatch with library
if (splunkLogger.serializedContextQueue.length > 0) {
    await flush().catch(console.error)
}
// @ts-ignore workaround an issue where splunk-logging library does not clear internal timers and prevent node from exiting
// https://github.com/splunk/splunk-javascript-logging/issues/13
splunkLogger._disableTimer?.()

console.error(`end of input (${counter} logs)`)