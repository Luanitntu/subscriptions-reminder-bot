import { Injectable, LoggerService, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class LogService implements LoggerService, OnModuleInit, OnModuleDestroy {
  // LOG_DIR cho phép trỏ sang Railway Volume (vd /data/logs) để log không bị xoá khi redeploy.
  private readonly dir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
  private readonly tz = process.env.TIMEZONE || 'Asia/Ho_Chi_Minh';
  private readonly retentionDays = 6; // giữ hôm nay + 5 ngày trước, cũ hơn thì xoá
  private cleanupTimer: NodeJS.Timeout;

  onModuleInit() {
    this.ensureDir();
    this.cleanup();
    // Dọn log cũ mỗi 24h (phòng trường hợp app chạy liên tục nhiều ngày).
    this.cleanupTimer = setInterval(() => this.cleanup(), 24 * 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  // ---------- LoggerService (Nest gọi) ----------

  log(message: any, context?: string) {
    this.emit('LOG', message, context);
  }

  error(message: any, ...optional: any[]) {
    const context = this.pickContext(optional);
    this.emit('ERROR', message, context);
    for (const extra of optional) {
      if (extra && extra !== context) this.write('ERROR', extra, context);
    }
  }

  warn(message: any, context?: string) {
    this.emit('WARN', message, context);
  }

  debug(message: any, context?: string) {
    this.emit('DEBUG', message, context);
  }

  verbose(message: any, context?: string) {
    this.emit('VERBOSE', message, context);
  }

  // ---------- Đọc log (cho lệnh /log) ----------

  /** Trả về các file log của N ngày gần nhất (hôm nay → trở về trước), chỉ file tồn tại. */
  getRecentLogFiles(days: number): { name: string; path: string }[] {
    this.ensureDir();
    const result: { name: string; path: string }[] = [];
    const today = dayjs().tz(this.tz);
    for (let i = 0; i < days; i++) {
      const d = today.subtract(i, 'day');
      const filePath = this.fileFor(d);
      if (fs.existsSync(filePath)) {
        result.push({ name: `${d.format('DD-MM-YYYY')}.log`, path: filePath });
      }
    }
    return result;
  }

  // ---------- Internal ----------

  private pickContext(optional: any[]): string | undefined {
    const last = optional[optional.length - 1];
    return typeof last === 'string' ? last : undefined;
  }

  private emit(level: string, message: any, context?: string) {
    const ts = dayjs().tz(this.tz).format('YYYY-MM-DD HH:mm:ss');
    const ctx = context ? ` [${context}]` : '';
    // Vẫn in ra console để Railway logs nhìn thấy.
    // eslint-disable-next-line no-console
    console.log(`${ts} [${level}]${ctx} ${this.stringify(message)}`);
    this.write(level, message, context);
  }

  private write(level: string, message: any, context?: string) {
    try {
      this.ensureDir();
      const now = dayjs().tz(this.tz);
      const ctx = context ? ` [${context}]` : '';
      const line = `${now.format('YYYY-MM-DD HH:mm:ss')} [${level}]${ctx} ${this.stringify(message)}\n`;
      fs.appendFileSync(this.fileFor(now), line, 'utf-8');
    } catch {
      // Không bao giờ để việc ghi log làm sập app.
    }
  }

  private stringify(message: any): string {
    if (typeof message === 'string') return message;
    if (message instanceof Error) return message.stack || message.message;
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  private fileFor(date: dayjs.Dayjs): string {
    return path.join(this.dir, `${date.format('DD-MM-YYYY')}.log`);
  }

  private ensureDir() {
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
  }

  private cleanup() {
    try {
      this.ensureDir();
      const cutoff = dayjs().tz(this.tz).subtract(this.retentionDays, 'day').startOf('day');
      for (const file of fs.readdirSync(this.dir)) {
        const m = file.match(/^(\d{2})-(\d{2})-(\d{4})\.log$/);
        if (!m) continue;
        const fileDate = dayjs(`${m[3]}-${m[2]}-${m[1]}`);
        if (fileDate.isBefore(cutoff)) {
          fs.unlinkSync(path.join(this.dir, file));
        }
      }
    } catch {
      // bỏ qua lỗi dọn dẹp
    }
  }
}
