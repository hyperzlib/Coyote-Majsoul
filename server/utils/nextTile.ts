import {Tile} from '../types/General'

function nextTile(tile: Tile, playerCount: number): Tile {
    if (tile.endsWith('z')) {
        if (Number(tile[0]) <= 4) {
            return String((Number(tile[0]) % 4) + 1) + 'z' as Tile
        } else {
            return String(((Number(tile[0]) - 4) % 3) + 5) + 'z' as Tile
        }
    } else if (tile.startsWith('0')) {
        return '6' + tile[1] as Tile
    } else if (playerCount === 3 && tile.endsWith('m')) {
        return (tile[0] === '1' ? '9' : '1') + 'm' as Tile
    } else {
        return String((Number(tile[0]) % 9) + 1) + tile[1] as Tile
    }
}

export {nextTile}
