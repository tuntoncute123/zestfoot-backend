import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000',
  ghn: {
    apiUrl: process.env.GHN_API_URL || 'https://online-gateway.ghn.vn/shiip/public-api',
    token: process.env.GHN_API_TOKEN || 'c1b153e0-98a6-11f1-818a-1e26fdb85c7f',
    shopId: process.env.GHN_SHOP_ID ? Number(process.env.GHN_SHOP_ID) : undefined,
    fromDistrictId: Number(process.env.GHN_DEFAULT_FROM_DISTRICT_ID) || 1442,
    fromWardCode: process.env.GHN_DEFAULT_FROM_WARD_CODE || '21211',
  },
}));
