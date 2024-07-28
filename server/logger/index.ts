import winston from 'winston'
import { existsSync } from 'fs'

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      level: existsSync('.debug') ? 'debug' : 'info',
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

export default logger
