import type { UnifiedDevice } from '../../../shared/unified-device'

const IOS_STATIC_DEVICES: UnifiedDevice[] = [
  {
    id: 'ios:00008140-00191D962283801C',
    platform: 'ios',
    state: 'online',
    displayName: 'iPhone',
    connectionKey: '00008140-00191D962283801C',
    label: 'iPhone (00008140-00191D962283801C)',
  },
]

export function listIosDevices(): UnifiedDevice[] {
  return IOS_STATIC_DEVICES
}
