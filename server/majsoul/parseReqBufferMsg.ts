import { Root, AnyNestedObject } from 'protobufjs'
import liqi from './liqi.json'
import { ResAuthGame } from '../types/ParsedMajsoulJSON'
import { findSubArrayIndex } from '../utils/helper'
import logger from '../logger'

export function parseReqBufferMsg(binaryReq: Buffer): Array<{ index: number, name: string, reqName: string, resName: string, data: any }> {
  const binaryReqArr = new Uint8Array(binaryReq)

  // load('./liqi', (err, root) => {
  //   if (err !== null) { throw err }
  // })
  const root = Root.fromJSON(liqi as AnyNestedObject)
  const wrapper = root.lookupType('Wrapper')

  try {
    interface DecodeReq { data: Uint8Array, name: string }

    const { name, data } = wrapper.decode(binaryReqArr.slice(3)) as unknown as DecodeReq

    const service = root.lookup(name) as unknown as { requestType: string, responseType: string }
    const reqName = service.requestType
    const resName = service.responseType

    if (
      /(authGame)|(syncGame)|(oauth2Login)/i.test(name)
    ) {
      let dataJson = {}

      try {
        dataJson = root.lookupType('.lq.' + reqName).decode(data)
        logger.debug('<parser> req data: ' + JSON.stringify(dataJson))
      } catch (err) {
        console.error(err)
        console.log('Error buffer', Buffer.from(binaryReqArr).toString('hex'))
      }

      return [
        {
          name,
          reqName,
          resName,
          index: Buffer.from(binaryReqArr.slice(1, 3)).readUInt16LE(),
          data: dataJson,
        }
      ]
    } else {
      return []
    }
  } catch (err: any) {
    console.error(err);
    return []
  }
}