export interface GamePlayerInfo {
  account_id: number,
  nickname: string,
  seat: number,
  isMe?: boolean,
};

export interface GameConstructorOptions {
  players: GamePlayerInfo
  meSeat: number // 0 | 1 | 2 | 3
}

export class Game {
  public meSeat: number; // 0 | 1 | 2 | 3
  public players: GamePlayerInfo[];
  public seatPlayerMap: Map<number, GamePlayerInfo> = new Map();

  public constructor(players: any[], seatList: number[], meAccountId: number) {
    this.meSeat = seatList.indexOf(meAccountId);

    this.players = players.map((player, index) => {
      return {
        account_id: player.account_id,
        nickname: player.nickname,
        seat: seatList.indexOf(player.account_id),
        isMe: player.account_id === meAccountId,
      }
    });

    this.seatPlayerMap.clear();
    this.players.forEach(player => {
      this.seatPlayerMap.set(player.seat, player);
    });
  }

  public getPlayerByAccountId(accountId: number) {
    return this.players.find(player => player.account_id === accountId);
  }

  public getPlayerByNickname(nickname: string) {
    return this.players.find(player => player.nickname === nickname);
  }

  public getPlayerBySeat(seat: number) {
    return this.seatPlayerMap.get(seat);
  }
}