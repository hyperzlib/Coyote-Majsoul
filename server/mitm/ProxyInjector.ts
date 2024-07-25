import { spawn, exec } from 'child_process';
import { existsSync } from 'fs';
import logger from '../logger';

function asleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const INJECTOR_EXE = 'bin/proxinjector/proxinjector-cli.exe';

export class ProxyInjector {
    public proxyAddr: string;
    public targetProcNames: string;

    private taskRunning: boolean = true;

    public constructor(proxyAddr: string, targetProcName: string) {
        this.proxyAddr = proxyAddr;
        this.targetProcNames = targetProcName;
    }

    public async run() {
        if (!existsSync(INJECTOR_EXE)) {
            logger.warn('<ProxyInjector> proxinjector-cli.exe 未找到，请从 https://github.com/PragmaTwice/proxinject 下载后放到 bin/proxinjector 目录下');
            return;
        }

        if (process.platform !== 'win32') {
            logger.warn('<ProxyInjector> 仅支持 Windows 平台');
            return;
        }

        this.taskRunning = true;
        logger.info('<ProxyInjector> 已启动客户端代理注入器');
        let oldProcRunning = false
        while (this.taskRunning) {
            try {
                let procRunning = await this.detectProcRunning();

                if (procRunning && !oldProcRunning) {
                    await this.inject();
                }

                oldProcRunning = procRunning;

                await asleep(1000);
            } catch (err) {
                logger.error('<ProxyInjector> ', err);
                await asleep(3000);
            }
        }
    }

    public detectProcRunning() {
        return new Promise<boolean>((resolve) => {
            const proc = spawn('tasklist', ['/FO', 'CSV', '/NH', '/FI', `IMAGENAME eq ${this.targetProcNames}.exe`])
            proc.on('exit', (code) => {
                const output = proc.stdout.read().toString();
                if (output.includes(this.targetProcNames)) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }

    public inject() {
        return new Promise<void>((resolve, reject) => {
            const proc = spawn(INJECTOR_EXE, ['-p', this.proxyAddr, '-n', this.targetProcNames, '-s'], {
                stdio: 'pipe'
            });

            proc.on('spawn', () => {
                logger.info('<ProxyInjector> 代理注入成功');
            });

            proc.on('error', (err) => {
                reject(err);
            });

            proc.on('exit', (code) => {
                logger.info('<ProxyInjector> 代理注入器退出: ' + code);
                resolve();
            });
        });
    }

    public destroy() {
        this.taskRunning = false;
    }
}