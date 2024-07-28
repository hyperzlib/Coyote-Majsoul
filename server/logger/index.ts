import winston from 'winston'
import { existsSync } from 'fs'

const DEBUG_MODE = existsSync('.debug')

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      level: DEBUG_MODE ? 'debug' : 'info',
      filename: 'logs/server.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple()
      )
    }),
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.simple()
      )
    })
  ]
})

if (DEBUG_MODE) {
  logger.info('Debug mode enabled')
}

export default logger
