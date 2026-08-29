import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SeaweedFsService {
  private readonly logger = new Logger(SeaweedFsService.name);
  private readonly filerUrl: string;

  constructor(private configService: ConfigService) {
    this.filerUrl = this.configService.get<string>('SEAWEEDFS_FILER_URL') || 'http://localhost:8888';
  }

  
  async uploadFile(path: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      const targetUrl = `${this.filerUrl}${path.startsWith('/') ? '' : '/'}${path}`;
      this.logger.log(`Uploading file to SeaweedFS: ${targetUrl}`);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': mimeType,
        },
        body: fileBuffer as any,
      });

      if (!response.ok) {
        throw new Error(`SeaweedFS upload failed with status: ${response.status} ${response.statusText}`);
      }

      this.logger.log(`Successfully uploaded file to SeaweedFS: ${path}`);
      return targetUrl;
    } catch (error) {
      this.logger.error(`Error uploading to SeaweedFS: ${error.message}`, error.stack);
      
      this.logger.warn(`Fallback to mock upload URL for development`);
      return `http://localhost:3001/uploads/${path}`;
    }
  }

  
  async deleteFile(path: string): Promise<boolean> {
    try {
      const targetUrl = `${this.filerUrl}${path.startsWith('/') ? '' : '/'}${path}`;
      this.logger.log(`Deleting file from SeaweedFS: ${targetUrl}`);

      const response = await fetch(targetUrl, {
        method: 'DELETE',
      });

      if (response.status === 404) {
        this.logger.warn(`File not found in SeaweedFS: ${path}`);
        return true;
      }

      if (!response.ok) {
        throw new Error(`SeaweedFS delete failed with status: ${response.status}`);
      }

      this.logger.log(`Successfully deleted file from SeaweedFS: ${path}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting from SeaweedFS: ${error.message}`, error.stack);
      return false;
    }
  }
}
