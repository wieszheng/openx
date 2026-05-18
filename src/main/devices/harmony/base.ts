import { createLogger } from '../../log'
import { truncateUtf8 } from '../device-ref'
import { getHdcClient } from './client'

const logger = createLogger('hdcBase')
const SEPARATOR = 'openx_separator'

export async function shell(connectKey: string, cmd: string): Promise<string>
export async function shell(connectKey: string, cmd: string[]): Promise<string[]>
export async function shell(
  connectKey: string,
  cmd: string | string[]
): Promise<string | string[]> {
  logger.debug('shell', cmd)

  const target = getHdcClient().getTarget(connectKey)
  const cmds = typeof cmd === 'string' ? [cmd] : cmd

  const connection = await target.shell(cmds.join(`\necho "${SEPARATOR}"\n`))
  const output = (await connection.readAll()).toString()

  if (typeof cmd === 'string') {
    const result = output.trim()
    logger.debug('shell result', truncateUtf8(result, 512))
    return result
  }

  return output.split(SEPARATOR).map((val) => val.trim())
}
