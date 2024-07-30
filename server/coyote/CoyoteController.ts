import got from "got";
import { GamePlayerInfo } from "../gameRecords/Game";
import { MajsoulGameController, MajsoulGameResult } from "../gameRecords/MajsoulGameController";
import logger from "../logger";
import { EventStore } from "../utils/EventStore";
import { CoyoteAction, CoyoteGameConfig, CoyoteGameConfigItem } from "../types/CoyoteGameConfig";
import { asleep } from "../utils/helper";

export interface GameStrengthConfig {
    strength: number;
    randomStrength: number;
    minInterval: number;
    maxInterval: number;
    bChannelMultiplier?: number;
}

export interface CoyoteLiveGameConfig {
    strength: GameStrengthConfig;
    pulseId: string;
}

export type SetStrengthConfigRequest = {
    strength?: {
        add?: number;
        sub?: number;
        set?: number;
    },
    randomStrength?: {
        add?: number;
        sub?: number;
        set?: number;
    },
    minInterval?: {
        set?: number;
    },
    maxInterval?: {
        set?: number;
    },
};

export type FireRequest = {
    strength: number;
    time: number;
};

export type SetStrengthConfigResponse = {
    status: number,
    code: string,
    message: string,
    successClientIds: string[],
}

export type GetStrengthConfigResponse = {
    status: number,
    code: string,
    message: string,
    strengthConfig?: GameStrengthConfig,
}

export class CoyoteController {
    private targetPlayer: GamePlayerInfo;

    private eventStore = new EventStore();
    private majsoulGame: MajsoulGameController;
    private config!: CoyoteGameConfigItem;

    private isRiichi: boolean = false;
    private isRon: boolean = false;

    public constructor(majsoulGame: MajsoulGameController, playerInfo: GamePlayerInfo, config: CoyoteGameConfig) {
        this.majsoulGame = majsoulGame;
        this.targetPlayer = playerInfo;

        if (!this.setConfig(config)) {
            throw new Error('未找到配置: ' + playerInfo.nickname);
        }

        this.bindEvents();
    }

    public setConfig(config: CoyoteGameConfig) {
        const currentConfig = config.find((item) => {
            return item.accountId === this.targetPlayer.account_id ||
                item.nickname === this.targetPlayer.nickname ||
                item.isMe && this.targetPlayer.isMe;
        });
        if (!currentConfig) {
            logger.error(`未找到 ${this.targetPlayer.nickname} 的配置`);
            this.destroy();
            return false;
        }
        this.config = currentConfig;
        return true;
    }

    private bindEvents() {
        const majsoulGameEvents = this.eventStore.wrap(this.majsoulGame);

        majsoulGameEvents.on('newRound', () => {
            this.isRiichi = false;
            this.isRon = false; 
        });

        majsoulGameEvents.on('mingpai', (seat, targetSeat) => {
            if (seat !== this.targetPlayer.seat && targetSeat === this.targetPlayer.seat) {
                // 被吃碰杠
                setTimeout(() => {
                    this.doCoyoteAction(this.config.mingpai);
                }, 1000); // 延迟1s后更改强度
            }
        });

        majsoulGameEvents.on('riichi', (seat) => {
            if (seat === this.targetPlayer.seat) {
                // 自家立直
                this.isRiichi = true;
            } else if (!this.isRiichi) {
                setTimeout(() => {
                    this.doCoyoteAction(this.config.biejializhi);
                }, 1000); // 延迟1s后更改强度
            }
        });

        majsoulGameEvents.on('ron', (seat, targetSeat) => {
            if (seat === this.targetPlayer.seat) {
                // 自家和牌
                this.isRon = true;
            } else if (!this.isRon && targetSeat === this.targetPlayer.seat) {
                // 点炮
                setTimeout(() => {
                    this.doCoyoteAction(this.config.dianpao);
                }, 1000); // 延迟1s后更改强度
            }
        });

        majsoulGameEvents.on('zumo', (seat) => {
            if (seat === this.targetPlayer.seat) {
                // 自摸
                this.isRon = true;
            } else if (!this.isRon) {
                // 别家自摸
                setTimeout(() => {
                    this.doCoyoteAction(this.config.biejiazimo);
                }, 1000); // 延迟1s后更改强度
            }
        });

        majsoulGameEvents.on('liuju', (tingSeat) => {
            if (tingSeat.includes(this.targetPlayer.seat)) {
                // 听牌流局
                this.doCoyoteAction(this.config.tingpailiuju);
            } else {
                // 流局
                this.doCoyoteAction(this.config.liuju);
            }
        });

        majsoulGameEvents.on('zhongju', (result) => {
            this.onZhongJu(result);
        });
    }

    private doCoyoteAction(action?: CoyoteAction | null) {
        if (!action) return;

        if (typeof action.addBase === 'number') {
            logger.info(`[CoyoteController] ${this.targetPlayer.nickname} 增加基本强度：${action.addBase}`);
            this.callCoyoteGameApi({
                strength: {
                    add: action.addBase,
                },
            });
        } else if (typeof action.subBase === 'number') {
            logger.info(`[CoyoteController] ${this.targetPlayer.nickname} 降低基本强度：${action.subBase}`);
            this.callCoyoteGameApi({
                strength: {
                    sub: action.subBase,
                },
            });
        } else if (typeof action.addRandom === 'number') {
            logger.info(`[CoyoteController] ${this.targetPlayer.nickname} 增加随机强度：+${action.addRandom}`);
            this.callCoyoteGameApi({
                randomStrength: {
                    add: action.addRandom,
                },
            });
        } else if (typeof action.subRandom === 'number') {
            logger.info(`[CoyoteController] ${this.targetPlayer.nickname} 降低随机强度：-${action.subRandom}`);
            this.callCoyoteGameApi({
                randomStrength: {
                    sub: action.subRandom,
                },
            });
        } else if (typeof action.fire === 'number') {
            this.callCoyoteGameFireApi({
                strength: action.fire,
                time: action.time ? action.time * 1000 : 5000,
            });
        }
    }

    private async callCoyoteGameApi(request: SetStrengthConfigRequest): Promise<string | undefined> {
        let url = `${this.config.controllerUrl}/api/game/${this.config.targetClientId}/strength_config`;
        for (let i = 0; i < 3; i ++) {
            try {
                const res = await got.post(url, {
                    json: request,
                }).json<SetStrengthConfigResponse>();

                if (res.status !== 1) {
                    logger.error(`[CoyoteController] 调用郊狼控制器API失败: ${res.message}`);
                }

                return res.successClientIds[0];
            } catch (err: any) {
                logger.error(`[CoyoteController] 调用郊狼控制器API失败: ${err.message}`);
                if (err.response) {
                    logger.error('Response: ', err.response.body);
                }

                await asleep(200);
            }
        }

        logger.error(`[CoyoteController] 调用郊狼控制器API失败: ${url}`);
    }

    private async callCoyoteGameFireApi(request: FireRequest): Promise<string | undefined> {
        let url = `${this.config.controllerUrl}/api/game/${this.config.targetClientId}/fire`;
        for (let i = 0; i < 3; i ++) {
            try {
                const res = await got.post(url, {
                    json: request,
                }).json<SetStrengthConfigResponse>();

                if (res.status !== 1) {
                    logger.error(`[CoyoteController] 调用郊狼控制器API失败: ${res.message}`);
                }

                return res.successClientIds[0];
            } catch (err: any) {
                logger.error(`[CoyoteController] 调用郊狼控制器API失败: ${err.message}`);
                if (err.response) {
                    logger.error('Response: ', err.response.body);
                }

                await asleep(200);
            }
        }

        logger.error(`[CoyoteController] 调用郊狼控制器API失败: ${url}`);
    }

    private onZhongJu(result: MajsoulGameResult) {
        setTimeout(() => {
            const currentResult = result.find((item) => item.seat === this.targetPlayer.seat);
            if (!currentResult) {
                logger.error('未找到当前玩家的结果');
            } else {
                if (currentResult.point < 1 && this.config.jifei) {
                    // 被飞
                    this.doCoyoteAction(this.config.jifei);
                } else if (result.length === 3) {
                    switch (currentResult.rank) {
                        case 1:
                            this.doCoyoteAction(this.config.sanma.no1);
                            break;
                        case 2:
                            this.doCoyoteAction(this.config.sanma.no2);
                            break;
                        case 3:
                            this.doCoyoteAction(this.config.sanma.no3);
                            break;
                    }
                } else if (result.length === 4) {
                    switch (currentResult.rank) {
                        case 1:
                            this.doCoyoteAction(this.config.sima.no1);
                            break;
                        case 2:
                            this.doCoyoteAction(this.config.sima.no2);
                            break;
                        case 3:
                            this.doCoyoteAction(this.config.sima.no3);
                            break;
                        case 4:
                            this.doCoyoteAction(this.config.sima.no4);
                            break;
                    }
                }
            }

            this.destroy();
        }, 10000); // 延迟10s后更改强度
    }

    public destroy() {
        this.eventStore.removeAllListeners();
    }
}