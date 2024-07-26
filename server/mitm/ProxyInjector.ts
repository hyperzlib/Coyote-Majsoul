import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { existsSync } from 'fs';
import logger from '../logger';
import { asleep } from '../utils/helper';

const INJECTOR_EXE = 'bin/proxinjector/proxinjector-cli.exe';
const START_IN_NEW_CONSOLE = false;

export class ProxyInjector {
    public proxyAddr: string;
    public targetProcName: string;

    private taskRunning: boolean = true;

    public constructor(proxyAddr: string, targetProcName: string) {
        this.proxyAddr = proxyAddr;
        this.targetProcName = targetProcName;
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
                let procRunning = await this.detectProcRunning(this.targetProcName);

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

    public detectProcRunning(targetProcName: string) {
        return new Promise<boolean>((resolve) => {
            const proc = spawn('tasklist', ['/FO', 'CSV', '/NH', '/FI', `IMAGENAME eq ${targetProcName}.exe`])
            proc.on('exit', (code) => {
                const output = proc.stdout.read().toString();
                if (output.includes(targetProcName)) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }

    public async inject() {
        let proc: ChildProcessWithoutNullStreams;
        
        if (START_IN_NEW_CONSOLE) {
            proc = spawn('cmd', ['/c', 'start', INJECTOR_EXE, '-p', this.proxyAddr, '-n', this.targetProcName, '-s'], {
                stdio: 'pipe'
            });
        } else {
            proc = spawn(INJECTOR_EXE, ['-p', this.proxyAddr, '-n', this.targetProcName, '-s'], {
                stdio: 'pipe'
            });
        }

        await new Promise<void>((resolve, reject) => {
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