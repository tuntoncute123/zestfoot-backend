import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';

@Injectable()
export class QuestDbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QuestDbService.name);
  private questDbRestUrl: string;
  private questDbIlpHost: string;
  private questDbIlpPort: number;
  private clientSocket: net.Socket | null = null;

  constructor(private configService: ConfigService) {
    this.questDbRestUrl = this.configService.get<string>('QUESTDB_REST_URL') || 'http://localhost:9000';
    this.questDbIlpHost = this.configService.get<string>('QUESTDB_ILP_HOST') || '127.0.0.1';
    this.questDbIlpPort = parseInt(this.configService.get<string>('QUESTDB_ILP_PORT') || '9009', 10);
  }

  async onModuleInit() {
    this.connectIlp();
  }

  async onModuleDestroy() {
    if (this.clientSocket) {
      this.clientSocket.end();
    }
  }

  private connectIlp() {
    try {
      this.clientSocket = new net.Socket();
      this.clientSocket.connect(this.questDbIlpPort, this.questDbIlpHost, () => {
        this.logger.log(`Connected to QuestDB ILP at ${this.questDbIlpHost}:${this.questDbIlpPort}`);
      });

      this.clientSocket.on('error', (err) => {
        this.logger.warn(`QuestDB ILP socket error: ${err.message}. Retrying or falling back to HTTP.`);
        this.clientSocket = null;
      });

      this.clientSocket.on('close', () => {
        this.logger.warn(`QuestDB ILP socket closed.`);
        this.clientSocket = null;
      });
    } catch (error) {
      this.logger.error(`Could not connect to QuestDB ILP: ${error.message}`);
      this.clientSocket = null;
    }
  }

  /**
   * Ingests a record using InfluxDB Line Protocol (ILP).
   * Format: tableName,tag1=val1,tag2=val2 field1=val1,field2=val2 timestamp
   * QuestDB will auto-create the table if it does not exist.
   */
  async ingestLine(line: string): Promise<boolean> {
    try {
      if (this.clientSocket && !this.clientSocket.destroyed) {
        this.clientSocket.write(`${line}\n`);
        return true;
      } else {
        // Retry connection or fallback to HTTP ILP
        this.connectIlp();
        // Fallback: send via REST API (QuestDB supports posting ILP data directly)
        const response = await fetch(`${this.questDbRestUrl}/write`, {
          method: 'POST',
          body: `${line}\n`,
        });
        if (!response.ok) {
          throw new Error(`QuestDB HTTP Ingest status: ${response.status}`);
        }
        return true;
      }
    } catch (error) {
      this.logger.warn(`QuestDB Ingestion Fallback (Simulated): Failed to ingest line: ${line}. Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Executes a SQL query against QuestDB's REST API and returns rows.
   * @param sql SQL query string.
   */
  async querySql<T = any>(sql: string): Promise<T[]> {
    try {
      const url = `${this.questDbRestUrl}/exec?query=${encodeURIComponent(sql)}`;
      const response = await fetch(url);
      if (!response.ok) {
        return []; // Return empty dataset silently if QuestDB table is not initialized yet
      }
      const data = await response.json();
      
      // QuestDB REST returns data in format: { columns: [...], dataset: [[val1, val2], ...] }
      if (!data.dataset || !data.columns) {
        return [];
      }

      const columns = data.columns.map((col: any) => col.name);
      return data.dataset.map((row: any[]) => {
        const obj: any = {};
        columns.forEach((colName: string, index: number) => {
          obj[colName] = row[index];
        });
        return obj as T;
      });
    } catch {
      return []; // Return empty dataset on error
    }
  }
}
