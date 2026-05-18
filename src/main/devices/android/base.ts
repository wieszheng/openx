import { Adb } from '@devicefarmer/adbkit'
import { createLogger } from '../../log'
import { truncateUtf8 } from '../device-ref'
import { getAdbClient } from './client'

const logger = createLogger('adbBase')
const SEPARATOR = 'openx_separator'

export async function shell(serial: string, cmd: string): Promise<string>
export async function shell(serial: string, cmd: string[]): Promise<string[]>
export async function shell(serial: string, cmd: string | string[]): Promise<string | string[]> {
  logger.debug('shell', cmd)

  const device = getAdbClient().getDevice(serial)
  const cmds = typeof cmd === 'string' ? [cmd] : cmd

  const socket = await device.shell(cmds.join(`\necho "${SEPARATOR}"\n`))
  const output = (await Adb.util.readAll(socket)).toString()

  if (typeof cmd === 'string') {
    const result = output.trim()
    logger.debug('shell result', truncateUtf8(result, 512))
    return result
  }

  return output.split(SEPARATOR).map((val) => val.trim())
}
