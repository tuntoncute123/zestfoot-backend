import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000',
}));
