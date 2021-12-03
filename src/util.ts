import { EOL } from 'os'

export function noop(input: string) {
    return input
}

export function createLogger({ packageName, quiet, silent }: { packageName: string | undefined; quiet: boolean; silent: boolean }) {
    return {
        output(...params: unknown[]) {
            if (!quiet && !silent) {
                console.log(...params)
            }
        },
        message(...params: unknown[]) {
            if (!silent) {
                console.error(`${[packageName]}`, ...params)
            }
        },
        error(...params: unknown[]) {
            if (!silent) {
                console.error(`${[packageName]}:`, ...params.map(getFirstLine))
            }
        },
    }
}

function getFirstLine(value: unknown) {
    if (value instanceof Error) {
        return value.message.split(EOL)[0]
    }

    if (typeof value === 'string') {
        return value.split(EOL)[0]
    }

    return value
}
