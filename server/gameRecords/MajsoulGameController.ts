import EventEmitter2 from "eventemitter2";
import {
    ActionBaBei,
    ActionChiPengGang,
    ActionDealTile,
    ActionDiscardTile,
    ActionHule,
    ActionHuleXueZhanMid,
    ActionNewRound,
    ActionNoTile,
    NotifyGameEndResult,
    ParsedMajsoulJSON,
    ResAuthGame
} from "../types/ParsedMajsoulJSON";
import { Game } from "./Game";
import { parseResBufferMsg } from "../majsoul/parseResBufferMsg";
import { parseReqBufferMsg } from "../majsoul/parseReqBufferMsg";
import logger from "../logger";
import {Tile} from "../types/General";

export type MajsoulGameResult = {
    seat: number,
    point: number,
    rank: number,
}[];

export type MajsoulGameEventListener = {
    (name: 'startGame', cb: (game: Game) => void): void;
    (name: 'newRound', cb: (dora: Tile[], playerCount: number) => void): void;
    (name: 'turn', cb: (seat: number, dora: Tile[]) => void): void;
    (name: 'riichi', cb: (seat: number, tile: Tile) => void): void;
    (name: 'chupai', cb: (seat: number, tile: Tile, dora: Tile[]) => void): void;
    (name: 'mingpai', cb: (seat: number, targetSeat: number | null) => void): void;
    (name: 'ron', cb: (seat: number, targetSeat: number | null, score: number) => void): void;
    (name: 'zumo', cb: (seat: number, score: number) => void): void;
    (name: 'liuju', cb: (tingSeat: number[]) => void): void;
    (name: 'zhongju', cb: (result: MajsoulGameResult) => void): void;
}

export class MajsoulGameController {
    public pkgList: ParsedMajsoulJSON[] = [];

    public game: Game | null = null;
    public requestQueue: Map<number, { resName: string }> = new Map();

    public events: EventEmitter2 = new EventEmitter2();

    public constructor() {

    }

    clear() {
        this.pkgList = [];
    }

    public on: MajsoulGameEventListener = this.events.on.bind(this.events);
    public once: MajsoulGameEventListener = this.events.once.bind(this.events);
    public off = this.events.off.bind(this.events);

    /**
     * 获取点铳的座位
     * @returns 
     */
    public getDianChongSeat() {
        if (this.pkgList.length === 0) {
            return null;
        }

        for (let i = this.pkgList.length - 1; i >= 0; i--) {
            const pkg = this.pkgList[i];
            if (pkg.name === 'ActionPrototype') {
                if (pkg.data.name === 'ActionDiscardTile') {
                    // 出牌点炮
                    const data = pkg.data.data as unknown as ActionDiscardTile;
                    return data.seat;
                } else if (pkg.data.name === 'ActionChiPengGang') {
                    const data = pkg.data.data as unknown as ActionChiPengGang;
                    if (data.tiles.length === 4) {
                        // 抢杠
                        return data.seat;
                    }
                } else if (pkg.data.name === 'ActionBaBei') {
                    // 胡北
                    const data = pkg.data.data as unknown as ActionBaBei;
                    return data.seat;
                }
            }
        }

        return null;
    }

    onReqPackage(buf: Buffer) {
        try {
            const msgList = parseReqBufferMsg(buf);
            if (!msgList) return;

            for (let i = 0; i < msgList.length; i++) {
                const msg = msgList[i]
                const { resName, index } = msg
                this.requestQueue.set(index, { resName });
            }
        } catch (e: any) {
            console.error(e);
        }
    }

    /**
     * 处理来自majsoul的数据包
     * @param pkg 
     */
    onResPackage(buf: Buffer, meId: number) {
        try {
            const pkg = parseResBufferMsg(buf, this.requestQueue);
            if (!pkg) return;

            this.pkgList.push(pkg);
            this.events.emit('package', pkg);

            logger.debug(`<parser> parsed ResMsg Buffer to JSON(majsoul): ${JSON.stringify(structuredClone(pkg))}`)

            // 检测pkg类型，触发事件
            switch (pkg.name) {
                case 'ActionPrototype':
                    switch (pkg.data.name) {
                        case 'ActionNewRound': // 新一局开始
                            this.clear();
                            const data = pkg.data.data as unknown as ActionNewRound;
                            this.events.emit('newRound', data.doras, data.scores.length);
                            break;
                        case 'ActionDealTile': { // 摸牌
                            const data = pkg.data.data as unknown as ActionDealTile;
                            this.events.emit('turn', data.seat, data.doras);
                            break;
                        }
                        case 'ActionDiscardTile': { // 出牌
                            const data = pkg.data.data as unknown as ActionDiscardTile;
                            if (data.is_liqi || data.is_wliqi) { // 立直
                                this.events.emit('riichi', data.tile ,data.seat);
                            }else{
                                this.events.emit('chupai', data.tile ,data.doras);
                            }
                            break;
                        }
                        case 'ActionChiPengGang': { // 鸣牌
                            const data = pkg.data.data as unknown as ActionChiPengGang;
                            let targetSeat: number | null = null;

                            for (let fromSeat of data.froms) {
                                if (fromSeat !== data.seat) {
                                    targetSeat = fromSeat;
                                    break;
                                }
                            }

                            this.events.emit('mingpai', data.seat, targetSeat);
                            break;
                        }
                        case 'ActionHule': {
                            const data = pkg.data.data as unknown as ActionHule;
                            for (const huleData of data.hules) {
                                const seat = huleData.seat;
                                const score = data.delta_scores[seat];
                                if (huleData.zimo) {
                                    this.events.emit('zumo', huleData.seat, score);
                                } else {
                                    let targetSeat: number | null = this.getDianChongSeat();
                                    this.events.emit('ron', huleData.seat, targetSeat, score);
                                }
                            }
                            break;
                        }
                        case 'ActionHuleXueZhanMid': {
                            const data = pkg.data.data as unknown as ActionHuleXueZhanMid;
                            for (const huleData of data.hules) {
                                const seat = huleData.seat;
                                const score = data.delta_scores[seat];
                                if (huleData.zimo) {
                                    this.events.emit('zumo', seat, score);
                                } else {
                                    let targetSeat: number | null = this.getDianChongSeat();
                                    this.events.emit('ron', seat, targetSeat, score);
                                }
                            }
                            break;
                        }
                        case 'ActionHuleXueZhanEnd': {
                            const data = pkg.data.data as unknown as ActionHuleXueZhanMid;
                            for (const huleData of data.hules) {
                                const seat = huleData.seat;
                                const score = data.delta_scores[seat];
                                if (huleData.zimo) {
                                    this.events.emit('zumo', seat, score);
                                } else {
                                    let targetSeat: number | null = this.getDianChongSeat();
                                    this.events.emit('ron', seat, targetSeat, score);
                                }
                            }
                            break;
                        }
                        case 'ActionNoTile': {
                            const data = pkg.data.data as unknown as ActionNoTile;
                            let tingSeat: number[] = [];
                            data.players.forEach((playerResult, seat) => {
                                if (playerResult.tingpai) {
                                    tingSeat.push(seat);
                                }
                            });

                            this.events.emit('liuju', tingSeat);
                            break;
                        }
                    }
                    break;
                case 'ResAuthGame': {
                    const data = pkg as unknown as ResAuthGame;
                    this.game = new Game(data.data.players, data.data.seat_list, meId);
                    this.events.emit('startGame', this.game);
                    break;
                }
                case 'NotifyGameEndResult': {
                    const data = pkg as unknown as NotifyGameEndResult;
                    let playerData = data.data.result.players.sort((a, b) => b.part_point_1 - a.part_point_1);

                    let gameResult = playerData.map((playerResult, index) => ({
                        seat: playerResult.seat,
                        point: playerResult.part_point_1,
                        rank: index + 1,
                    }));

                    this.events.emit('zhongju', gameResult);
                    break;
                }
            }

            // 存储数据包
            this.pkgList.push(pkg);
        } catch (e: any) {
            console.error(e);
        }
    }
}