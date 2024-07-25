import { Root, AnyNestedObject } from 'protobufjs'
import liqi from './liqi.json'
import { ResAuthGame } from '../types/ParsedMajsoulJSON'

export function parseReqBufferMsg(binaryReq: Buffer): Array<{ index: number, name: string, resName: string, data: any }> {
  const binaryReqArr = new Uint8Array(binaryReq)

  // load('./liqi', (err, root) => {
  //   if (err !== null) { throw err }
  // })
  const root = Root.fromJSON(liqi as AnyNestedObject)
  const wrapper = root.lookupType('Wrapper')

  try {
    interface DecodeReq { data: Uint8Array, name: string }

    const { name } = wrapper.decode(binaryReqArr.slice(3)) as unknown as DecodeReq

    const service = root.lookup(name) as unknown as { requestType: string, responseType: string }
    const reqName = service.requestType
    const resName = service.responseType

    if (
      /(authGame)|(syncGame)|(oauth2Login)/i.test(name)
    ) {
      let data = {}

      try {
        let prefixPos = name.lastIndexOf('.')
        console.log(Buffer.from(binaryReqArr.slice(7 + prefixPos)).toString('hex'))
        data = root.lookupType(reqName).decode(binaryReqArr.slice(7 + prefixPos))
      } catch (err) {
        console.error(err)
      }

      return [
        {
          name,
          resName,
          index: Buffer.from(binaryReqArr.slice(1, 3)).readUInt16LE(),
          data,
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