export async function concat(source: AsyncGenerator<string>) {
    return (await toArray(source)).join('\n')
}

export async function toArray(source: AsyncGenerator<string>) {
    const lines: string[] = []
    for await (const line of source) {
        lines.push(line)
    }
    return lines
}

/** returns all possible ways to divide a string
 * @example divide('abc') returns
 * ['a', 'b', 'c']
 * ['a', 'bc']
 * ['ab', 'c']
 * ['abc']
 */
export function* divide(str: string): Generator<string[], void, void> {
    if (str.length === 0) {
        yield []
    }

    for (let n = 1; n <= str.length; n++) {
        const curr = str.slice(0, n)
        const rest = str.slice(n)
        for (const d of divide(rest)) {
            yield [curr, ...d]
        }
    }
}
