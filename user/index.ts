import { wsHook } from './wshook'

const serverURL = 'http://localhost:56556/'

let isWindowFocus: boolean = window.document.hasFocus()
window.onfocus = () => {
  isWindowFocus = true
}
window.onblur = () => {
  isWindowFocus = false
}

if (window.location.host === 'game.maj-soul.com' || window.location.host === 'game.mahjongsoul.com') {
  wsHook.before = (data, url) => {
    if (!url.includes('/game-gateway') && !url.includes('mjjpgs.')) { return data }
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
    if (!url.includes('/game-gateway') && !url.includes('mjjpgs.')) { return messageEvent }
    try {
      const binaryMsg = messageEvent.data as ArrayBuffer
      const req = new XMLHttpRequest()
      req.open('POST', `${serverURL}api/event?msg=res&meID=${window?.GameMgr?.Inst?.account_data?.account_id ?? ''}&game=majsoul`)
      req.send(binaryMsg)
    } catch (err) {
      console.error(err)
    }
    return messageEvent
  }
}
