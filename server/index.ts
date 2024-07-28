import { existsSync, copyFileSync } from 'fs'
import Koa from 'koa'
import cors from '@koa/cors'
import koaBody from 'koa-body'
import serveStatic from 'koa-static'
import Router from 'koa-router'
import logger from './logger'
import UI from './UI'
import { MajsoulGameController } from './gameRecords/MajsoulGameController'
import { ReactiveConfig } from './utils/ReactiveConfig'
import { ConfigType } from './types/config'
import { CoyoteController } from './coyote/CoyoteController'
import { Game, GamePlayerInfo } from './gameRecords/Game'
import { MajsoulMitmServer } from './mitm/MajsoulMitmServer'
import { ProxyInjector } from './mitm/ProxyInjector'
import { SchemaInvalidError, validator } from './utils/validator'
import deepcopy from 'deepcopy'

if (!existsSync('config.json5')) {
  copyFileSync('config-example.json5', 'config.json5')
}

const config = new ReactiveConfig<ConfigType>('config.json5', {
  coyote: []
}, { autoInit: false })

config.setLoadFilter((value: any) => {
  if (!validator.validateConfig(value)) {
    throw new SchemaInvalidError(validator.validateConfig.errors)
  }

  return value as ConfigType
})

const app = new Koa()
const router = new Router()
const mitmServer = new MajsoulMitmServer()
const proxyInjector = new ProxyInjector('127.0.0.1:56555', 'Jantama_MahjongSoul')

const majsoulGame = new MajsoulGameController()
let coyoteGameList: CoyoteController[] = []

function initCoyoteGame(game: Game) {
  let createdAccountIds = new Set<number>()
  config.value.coyote.forEach((item) => {
    let player: GamePlayerInfo | undefined = undefined
    if (item.accountId) {
      player = game.getPlayerByAccountId(item.accountId)
    } else if (item.nickname) {
      player = game.getPlayerByNickname(item.nickname)
    } else if (item.isMe) {
      const meSeat = game.meSeat
      player = game.getPlayerBySeat(meSeat)
      if (player) {
        item.accountId = player.account_id // 为了让CoyoteController能够正确识别当前用户
      }
    }

    if (player) {
      if (createdAccountIds.has(player.account_id)) {
        logger.warn(`[Coyote] 重复初始化郊狼控制器 ${player.nickname}`)
        return
      }

      logger.info(`[Coyote] 初始化郊狼控制器 ${player.nickname}`)
      const coyoteController = new CoyoteController(majsoulGame, player, config.value.coyote)
      coyoteGameList.push(coyoteController)
      createdAccountIds.add(player.account_id)
    }
  })
}

function updateCoyoteGameConfig() {
  coyoteGameList.forEach((coyoteGame) => {
    coyoteGame.setConfig(config.value.coyote)
  })
}
config.on('change', (newConfig) => {
  logger.info('[Config] 更新配置')
  updateCoyoteGameConfig()
})
config.on('saved', () => {
  logger.info('[Config] 更新配置')
  updateCoyoteGameConfig()
})

majsoulGame.on('startGame', (game) => {
  logger.info('[MajsoulGameController] 游戏开始')
  console.log(game.players, game.meSeat)
  initCoyoteGame(game)
})

majsoulGame.on('zhongju', (result) => {
  logger.info('[MajsoulGameController] 游戏结束')
  coyoteGameList = []
})

const msgQueue = {
  cur: Promise.resolve(),
  async add (promise: Promise<void>) {
    msgQueue.cur = msgQueue.cur.then(async () => await promise)
    await msgQueue.cur
  }
}

mitmServer.on('request', (data, _) => {
  logger.debug('<server-base> Server received req buffer: ' + data.toString('hex'))
  majsoulGame.onReqPackage(data)
})

mitmServer.on('response', (data, meId) => {
  logger.debug('<server-base> Server received res buffer')
  majsoulGame.onResPackage(data, meId)
})

router.post('/api/event', async function (ctx, next) {
  const params: Buffer[] = []
  await msgQueue.add(new Promise<void>((resolve, reject) => {
    ctx.req.on('data', (chunk: Buffer) => {
      params.push(chunk)
    })
    ctx.req.on('end', () => {
      const meID = parseInt(ctx.query.meID as string)
      const buffer = Buffer.concat(params)
      const msgType = ctx.query.msg as 'req' | 'res'
      let handleFuncPromise: Promise<void> = Promise.resolve()
      if (msgType === 'res') {
        logger.debug('<server-base> Server received res buffer')
        majsoulGame.onResPackage(buffer, meID)
      } else if (msgType === 'req') {
        logger.debug('<server-base> Server received req buffer: ' + buffer.toString('hex'))
        majsoulGame.onReqPackage(buffer)
      }
      handleFuncPromise.then(() => {
        ctx.status = 200
        resolve()
      }).catch(() => null)
    })
  }))
  await next()
})

// 配置文件API
router.get('/api/game_config', async function (ctx, next) {
  ctx.body = {
    status: 1,
    gameConfig: config.value.coyote,
  }

  await next()
})

router.post('/api/game_config', async function (ctx, next) {
  const data = ctx.request.body

  if (!data || !data.gameConfig) {
    ctx.body = {
      status: 0,
      message: 'Invalid request'
    }
    ctx.status = 400
    return
  }

  let newConfig = deepcopy(config.value)
  newConfig.coyote = data.gameConfig

  // validate
  if (!validator.validateConfig(newConfig)) {
    ctx.body = {
      status: 0,
      message: 'Invalid config',
      errors: validator.validateConfig.errors
    }
    return
  }

  config.value = newConfig
  config.lazySave()

  ctx.body = {
    status: 1,
    message: 'Config updated'
  }

  await next()
})

app
  .use(cors())
  .use(serveStatic('frontend/dist'))
  .use(koaBody())
  .use(router.routes())
  .use(router.allowedMethods())

process.on('uncaughtException', function (err) {
  console.error(err)
  logger.error(`<server-base> Server service shutdown: ${err.message}`)
  process.exit(1)
})

async function main() {
  await validator.initialize()
  await config.initialize()

  await mitmServer.listen(56555)

  app.listen(56556, () => {
    UI.clear()
    logger.info('<server-base> Socks5 MITM started at port 56555')
    logger.info('<server-base> Server started at port 56556')
    logger.info('<server-base> Config dashboard: http://127.0.0.1:56556')
    proxyInjector.run()
  })
}

main().catch((err) => {
  console.error(err)
})