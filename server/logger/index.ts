import winston from 'winston'
import path from 'path'

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      level: 'debug',
      filename: path.resolve(__dirname, '../../logs/server.log'),
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
