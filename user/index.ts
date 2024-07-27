import { wsHook } from './wshook'

const serverURL = 'http://localhost:56556/'

let isWindowFocus: boolean = window.document.hasFocus()
window.onfocus = () => {
  isWindowFocus = true
}
window.onblur = () => {
  isWindowFocus = false
}

if (window.location.host === 'game.maj-soul.com') {
  wsHook.before = (data, url) => {
    if (!url.includes('/game-gateway')) { return data }
    try {
      const req = new XMLHttpRequest()
      req.open('POST', `${serverURL}api/event?msg=req&meID=${window?.GameMgr?.Inst?.account_data?.account_id ?? ''}&game=majsoul`)
      req.send(data)
    } catch (err) {
      console.error(err)
    }
    return data
  }
  wsHook.after = (messageEvent, url) => {
    if (!url.includes('/game-gateway')) { return messageEvent }
    try {
      const binaryMsg = messageEvent.data as ArrayBuffer
      const screenX = window.screenX + (document.querySelector<HTMLCanvasElement>('#layaCanvas')?.offsetLeft ?? 0) / window.devicePixelRatio
      const screenY = window.screenY + window.outerHeight - window.innerHeight + (document.querySelector<HTMLCanvasElement>('#layaCanvas')?.getBoundingClientRect().y ?? 0)
      const w = (window.layaCanvas.width ?? 0) / window.devicePixelRatio
      const h = (window.layaCanvas.height ?? 0) / window.devicePixelRatio
      const dpi = window.devicePixelRatio
      const req = new XMLHttpRequest()
      req.open('POST', `${serverURL}api/event?msg=res&meID=${window?.GameMgr?.Inst?.account_data?.account_id ?? ''}&game=majsoul`)
      req.send(binaryMsg)
    } catch (err) {
      console.error(err)
    }
    return messageEvent
  }
}
