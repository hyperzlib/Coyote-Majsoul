export function asleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function findSubArrayIndex(arr: Uint8Array, subArr: Uint8Array): number {
    let index = -1;
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < subArr.length; j++) {
            if (arr[i + j] !== subArr[j]) {
                break;
            }
            if (j === subArr.length - 1) {
                index = i;
            }
        }
        if (index !== -1) {
            break;
        }
    }
    return index;
}