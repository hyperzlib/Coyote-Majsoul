import { Root, AnyNestedObject } from 'protobufjs'
import liqi from './liqi.json'
import { ParsedMajsoulJSON } from '../types/ParsedMajsoulJSON'
import logger from '../logger'

export function parseResBufferMsg (binaryMsg: Buffer, reqQueueMajsoul: Readonly<Map<number, { resName: string }>>): ParsedMajsoulJSON | null {
  const binaryMsgArr = new Uint8Array(binaryMsg)

  const msgType = { notify: 1, req: 2, res: 3 }
  const root = Root.fromJSON(liqi as AnyNestedObject)
  const wrapper = root.lookupType('Wrapper')
  interface DecodeMsg { data: Uint8Array, name: string }
  if (binaryMsgArr[0] === msgType.notify) {
    const { name, data } = wrapper.decode(binaryMsgArr.slice(1)) as unknown as DecodeMsg
    const parsedMajsoulJSON: any = { data: {}, name: name.slice(4) as ParsedMajsoulJSON['name'] }
    try {
      parsedMajsoulJSON.data = root.lookupType(name).decode(data)
    } catch (e) {
      return null
    }
    if (parsedMajsoulJSON.name === 'ActionPrototype') {
      // 2023年初，雀魂在 protobuf 的 ActionPrototype 中加入了下方的混淆
      const keys = [0x84, 0x5e, 0x4e, 0x42, 0x39, 0xa2, 0x1f, 0x60, 0x1c]
      for (let i = 0; i < parsedMajsoulJSON.data.data.length; i++) {
        const u = (23 ^ parsedMajsoulJSON.data.data.length) + 5 * i + keys[i % keys.length] & 255
        parsedMajsoulJSON.data.data[i] ^= u
      }
      // if this err happens, it will kill the whole process. I did it intendly
      logger.debug('<parser> buffer: ' + Buffer.from(parsedMajsoulJSON.data.data as Uint8Array).toString('hex'));
      parsedMajsoulJSON.data.data = root.lookupType(parsedMajsoulJSON.data.name).decode(parsedMajsoulJSON.data.data as Uint8Array)
    }
    return parsedMajsoulJSON
  }
  if (binaryMsgArr[0] === msgType.res) {
    try {
      const index = Buffer.from(binaryMsgArr.slice(1, 3)).readUInt16LE()
      const resName = reqQueueMajsoul.get(index)?.resName
      if (resName === undefined) { return null }
      const { data } = wrapper.decode(binaryMsgArr.slice(3)) as unknown as DecodeMsg
      const parsedMsg: any = { data: {}, name: resName as ParsedMajsoulJSON['name'] }
      // => resName === eg. 'ResSyncGame'
      parsedMsg.data = root.lookupType('.lq.' + resName).decode(data)
      switch (resName) {
        case 'ResSyncGame':
          if (Array.isArray(parsedMsg.data.game_restore?.actions)) {
            (parsedMsg.data.game_restore.actions).forEach(({ name: actionName, data }, index, list) => {
              list[index].data = root.lookupType(actionName as string).decode(data as Uint8Array)
            })
          }
          break
        case 'ResAuthGame':
          break
        case 'ResLogin':
          break
        default:
          return null
      }
      return parsedMsg
    } catch (e) {
      console.error(e)
      return null
    }
  }
  return null
}
