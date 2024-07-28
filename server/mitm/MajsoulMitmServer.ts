import { createServer, Socks5Server } from '@pondwader/socks5-server';
import net from "net";
import Receiver from '../ws/receiver';
import EventEmitter2 from 'eventemitter2';
import { parseReqBufferMsg } from '../majsoul/parseReqBufferMsg';
import { ReqAuthGame } from '../types/ParsedMajsoulJSON';
import logger from '../logger';

export enum WebSocketDataState {
    HEAD,
    BODY,
}

export type WebSocketCaptureEventListener = {
    (name: 'request', cb: (data: Buffer) => any): void;
    (name: 'response', cb: (data: Buffer) => any): void;
}

export class WebSocketCapture {
    public reqParser: Receiver;
    public resParser: Receiver;

    public reqDataState: WebSocketDataState = WebSocketDataState.HEAD;
    public resDataState: WebSocketDataState = WebSocketDataState.HEAD;

    public reqUrl: string = '';
    public reqHeader: Record<string, string> = {};
    public resStatus: number = 0;
    public resHeader: Record<string, string> = {};

    public events = new EventEmitter2();

    constructor() {
        this.reqParser = new Receiver({
            allowSynchronousEvents: true,
            isServer: true,
            maxPayload: 100 * 1024 * 1024,
        });

        this.reqParser.on('message', (data) => {
            this.events.emit('request', data);
        });

        this.resParser = new Receiver({
            allowSynchronousEvents: true,
            isServer: false,
            maxPayload: 100 * 1024 * 1024,
        });

        this.resParser.on('message', (data) => {
            this.events.emit('response', data);
        });
    }

    public onWebSocketRequest(data: Buffer) {
        switch (this.reqDataState) {
            case WebSocketDataState.HEAD:
                const str = data.toString();
                const header = str.split('\r\n');
                header.forEach((line, index) => {
                    if (index === 0) {
                        this.reqUrl = line.split(' ')[1];
                    } else if (line !== '') {
                        let [key, value] = line.split(':');

                        key = key.trim();
                        value = value.trim();

                        if (key) {
                            this.reqHeader[key] = value;
                        }
                    }
                });

                this.reqDataState = WebSocketDataState.BODY;
                break;
            case WebSocketDataState.BODY:
                this.reqParser.write(data);
                break;
        }
    }

    public onWebSocketResponse(data: Buffer) {
        switch (this.resDataState) {
            case WebSocketDataState.HEAD:
                const str = data.toString();
                const header = str.split('\r\n');
                header.forEach((line, index) => {
                    if (index === 0) {
                        if (!line.includes('HTTP')) return;
                        this.resStatus = parseInt(line.split(' ')[1]);
                    } else if (line !== '') {
                        let [key, value] = line.split(':');

                        key = key.trim();
                        value = value.trim();

                        if (key) {
                            this.resHeader[key] = value;
                        }
                    }
                });

                this.resDataState = WebSocketDataState.BODY;
                break;
            case WebSocketDataState.BODY:
                this.resParser.write(data);
                break;
        }
    }

    public on: WebSocketCaptureEventListener = this.events.on.bind(this.events);
    public once: WebSocketCaptureEventListener = this.events.once.bind(this.events);
    public off = this.events.off.bind(this.events);

    public destroy() {
        this.reqParser.end();
        this.resParser.end();

        this.events.removeAllListeners();
    }
}

export type MajsoulMitmServerEventListener = {
    (name: 'request', cb: (data: Buffer, meId: number) => any): void;
    (name: 'response', cb: (data: Buffer, meId: number) => any): void;
}

export const AUTH_HEADER = '.lq.FastTest.authGame'

export class MajsoulMitmServer {
    public server: Socks5Server;

    public events = new EventEmitter2();

    public meId: number | null = null;

    constructor() {
        this.server = createServer();
    }

    public listen(port: number) {
        return new Promise<void>((resolve) => {
            this.server.listen(port, '127.0.0.1', function () {
                resolve();
            });

            this.initServer();
        });
    }

    private initServer() {
        this.server.setConnectionHandler((connection, sendStatus) => {
            if (connection.command !== 'connect') return sendStatus('COMMAND_NOT_SUPPORTED');

            logger.info('<MajsoulMitmServer> 代理连接 ' + connection.destAddress + ':' + connection.destPort);

            connection.socket.on('error', () => { }); // Ignore errors

            const stream = net.createConnection({
                host: connection.destAddress,
                port: connection.destPort
            });
            stream.setNoDelay();

            let streamOpened = false;
            stream.on('error', (err: Error & { code: string }) => {
                if (!streamOpened) {
                    switch (err.code) {
                        case 'EINVAL':
                        case 'ENOENT':
                        case 'ENOTFOUND':
                        case 'ETIMEDOUT':
                        case 'EADDRNOTAVAIL':
                        case 'EHOSTUNREACH':
                            sendStatus('HOST_UNREACHABLE');
                            break;
                        case 'ENETUNREACH':
                            sendStatus('NETWORK_UNREACHABLE')
                            break;
                        case 'ECONNREFUSED':
                            sendStatus('CONNECTION_REFUSED');
                            break;
                        default:
                            sendStatus('GENERAL_FAILURE');
                    }
                }
            })

            stream.on('ready', () => {
                streamOpened = true;
                sendStatus('REQUEST_GRANTED');
                let wsCapture: WebSocketCapture;

                const initWebSocket = (data: Buffer) => {
                    wsCapture = new WebSocketCapture();

                    const onRequest = (data: Buffer) => {
                        if (data.toString().includes(AUTH_HEADER)) {
                            console.log('Auth header detected, starting handler');

                            let parsedJsonData = parseReqBufferMsg(data)
                            let authData = parsedJsonData[0]?.data as ReqAuthGame | null;
                            
                            if (authData && authData.account_id) {
                                this.setGameWebSocketCapture(wsCapture, data, authData);

                                wsCapture.off('request', onRequest);
                            }
                        }
                    }

                    wsCapture.on('request', onRequest);

                    connection.socket.on('close', () => {
                        wsCapture.destroy();
                    });
                }

                let isFirstReq = true;

                connection.socket.on('data', (data: Buffer) => {
                    stream.write(data);

                    if (isFirstReq) {
                        isFirstReq = false;
                        if (this.isHTTPHeader(data)) {
                            const httpHeader = data.toString();
                            let isWebSocket = httpHeader.includes('Upgrade: websocket');
    
                            if (isWebSocket) {
                                console.log('Detected WebSocket connection');
    
                                initWebSocket(data);
                            }
                        }
                    }

                    if (wsCapture) {
                        wsCapture.onWebSocketRequest(data);
                    }
                });
                stream.on('data', (data) => {
                    connection.socket.write(data);

                    if (wsCapture) {
                        wsCapture.onWebSocketResponse(data);
                    }
                });
            })

            connection.socket.on('close', () => stream.destroy());

            return stream;
        });
    }

    private isHTTPHeader(buf: Buffer) {
        let str = buf.toString();
        if (str.startsWith('GET')
            || str.startsWith('POST')
            || str.startsWith('HEAD')
            || str.startsWith('PUT')
            || str.startsWith('DELETE')
            || str.startsWith('CONNECT')
            || str.startsWith('OPTIONS')
            || str.startsWith('TRACE')
            || str.startsWith('PATCH'))
            return true;
        return false;
    }

    private setGameWebSocketCapture(wsCapture: WebSocketCapture, authBuffer: Buffer, authData: ReqAuthGame) {
        logger.info('<MajsoulMitmServer> WebSocket connected to MITM server');
        this.meId = authData.account_id

        this.events.emit('request', authBuffer, this.meId);

        wsCapture.on('request', (data) => {
            this.events.emit('request', data, this.meId);
        });

        wsCapture.on('response', (data) => {
            this.events.emit('response', data, this.meId);
        });
    }

    public on: MajsoulMitmServerEventListener = this.events.on.bind(this.events);
    public once: MajsoulMitmServerEventListener = this.events.once.bind(this.events);
    public off = this.events.off.bind(this.events);
}