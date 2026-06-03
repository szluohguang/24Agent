import { execFile } from 'child_process'

export interface GuardOptions {
  timeout: number
}

export interface GuardResult {
  success: boolean
  stdout: string
  stderr: string
  error?: string
}

export class CometGuardScheduler {
  async runGuard(
    cmd: string,
    args: string[] = [],
    options: GuardOptions = { timeout: 30000 }
  ): Promise<GuardResult> {
    return new Promise((resolve) => {
      const proc = execFile(cmd, args, { timeout: options.timeout }, (err, stdout, stderr) => {
        if (err && (err as any).killed) {
          resolve({ success: false, stdout, stderr, error: 'timeout' })
        } else if (err) {
          resolve({ success: false, stdout, stderr, error: stderr || err.message })
        } else {
          resolve({ success: true, stdout, stderr })
        }
      })
    })
  }

  resolveGuard(guardSpec: string): string {
    if (guardSpec.startsWith('$')) {
      const envVar = guardSpec.slice(1)
      return process.env[envVar] || guardSpec
    }
    return guardSpec
  }
}
