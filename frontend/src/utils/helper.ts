export function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function asleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
    let timeout: NodeJS.Timeout | null = null;

    return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            fn.apply(this, args);
            timeout = null;
        }, delay);
    } as T;
}