#!/usr/bin/env tsm
import * as os from 'os'
import * as stream from 'stream/promises'
import { Config, Logger as SplunkLogger } from 'splunk-logging'
import { createColorizer } from './colorizer'
import { splitter } from './splitter'
import { noop } from './util'
import { stackTraceMerger } from './stackTraceMerger'

const argv = process.argv.slice(2)
const silent = argv.includes('-s')
const source = argv.pop()

const SPLUNK_URL = process.env.SPLUNK_URL
const SPLUNK_TOKEN = process.env.SPLUNK_TOKEN

if (!SPLUNK_URL || !SPLUNK_TOKEN) {
    console.log(`SPLUNK_URL or SPLUNK_TOKEN not found in env`)
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
const send = (log: string) => splunkLogger.send({
    message: log,
    metadata: {
        source,
        sourcetype: "stdout",
        host: os.hostname(),
    },
})

const colorizer = await createColorizer('./conf.log')
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
        ;(silent ? noop : console.log)(colorizer(log))
        send(log)
      }
    },
)

console.log(`end of input (${counter} logs), check logs in splunk then hit ctrl+c to exit`)
