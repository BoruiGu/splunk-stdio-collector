import * as path from 'path'
import * as url from 'url'
import * as fs from 'fs/promises'
import chalk from 'chalk'
import { noop } from './util'

type GrcConf = {
    regexp: RegExp;
    color: string;
}

/** returns a function to colorize log per grc config */
export async function createColorizer(confPath: string) {
    const confText = await fs.readFile(path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), confPath), 'utf-8')
    const conf = parse(confText)

    return (log: string) => {
        let colored = log
        conf.forEach(({ regexp, color }) => {
            // @ts-ignore
            const colorize = chalk[color] ?? noop
            new Set([...colored.matchAll(regexp)].map(g => g[0])).forEach(text => {
                colored = colored.replace(text, colorize(text))
            })
        })

        return colored
    }
}

function parse(confText: string) {
    return confText.split('======').map(parseRule).filter(Boolean) as GrcConf[]
}

function parseRule(ruleText: string) {
    const lines = ruleText.split(/[\r\n]/)

    const regexp = lines.find(l => l.startsWith('regexp='))?.replace('regexp=', '')
    const color = lines.find(l => l.startsWith('colours='))?.replace('colours=', '')
    if (!regexp || !color) {
        return undefined
    }

    return { regexp: new RegExp(regexp, 'g'), color }
}
