export type CoyoteAction = {
    addBase?: number,
    subBase?: number,
    addRandom?: number,
    subRandom?: number,
    fire?: number,
    time?: number,
}

export type CoyoteGameConfigItem = {
    /** 雀魂账号ID（与雀魂昵称二选一） */
    accountId?: number | null,
    /** 雀魂昵称 */
    nickname?: string | null,
    /** 使用当前用户 */
    isMe?: boolean | null,
    /** 战败惩罚控制器URL */
    controllerUrl: string,
    /** 控制器ClientID */
    targetClientId: string,
    /** 被吃碰杠时 */
    mingpai?: CoyoteAction | null,
    /** 点炮时 */
    dianpao?: CoyoteAction | null,
    /** 别家自摸时 */
    biejiazimo?: CoyoteAction | null,
    /** 别家立直时 */
    biejializhi?: CoyoteAction | null,
    /** 流局（未听） */
    liuju?: CoyoteAction | null,
    /** 听牌流局 */
    tingpailiuju?: CoyoteAction | null,
    /** 三麻 */
    sanma: {
        /** 一位 */
        no1?: CoyoteAction | null,
        /** 二位 */
        no2?: CoyoteAction | null,
        /** 三位 */
        no3?: CoyoteAction | null,
    },
    /** 四麻 */
    sima: {
        /** 一位 */
        no1?: CoyoteAction | null,
        /** 二位 */
        no2?: CoyoteAction | null,
        /** 三位 */
        no3?: CoyoteAction | null,
        /** 四位 */
        no4?: CoyoteAction | null,
    },
    /** 被飞 */
    jifei?: CoyoteAction | null,
}

export type CoyoteGameConfig = CoyoteGameConfigItem[];