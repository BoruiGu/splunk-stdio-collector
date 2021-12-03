import { EOL } from 'os'

export const noop = () => {
    /** noop */
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
                console.error(`[${packageName}]`, ...params)
            }
        },
        error(...params: unknown[]) {
            if (!silent) {
                console.error(`[${packageName}]`, ...params.map(getFirstLine))
            }
        },
    }
}

type AttachErrorHandlerFn = <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    errorHandler: (err: unknown) => void
) => (...args: Parameters<T>) => ReturnType<T>

export const attachErrorHandler: AttachErrorHandlerFn =
    (fn, errorHandler) =>
    (...args) =>
        fn(...args).catch(errorHandler) as ReturnType<typeof fn>

function getFirstLine(value: unknown) {
    if (value instanceof Error) {
        return value.message.split(EOL)[0]
    }

    if (typeof value === 'string') {
        return value.split(EOL)[0]
    }

    return value
}
