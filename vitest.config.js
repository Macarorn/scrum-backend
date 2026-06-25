import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    env: {
      NODE_ENV: 'test',
      DB_HOST: 'localhost',
      DB_USER: 'test_user',
      DB_PASSWORD: 'test_password',
      DB_NAME: 'scrum_test',
      DB_PORT: '3306',
      JWT_SECRET: 'test_jwt_secret_key_for_testing',
      JWT_EXPIRE: '1h',
      JWT_REFRESH_SECRET: 'test_refresh_secret_key_for_testing',
      JWT_REFRESH_EXPIRE: '7d',
      PORT: '3001',
      CORS_ORIGIN: 'http://localhost:5173,http://127.0.0.1:5173',
      RATE_LIMIT_WINDOW: '15',
      RATE_LIMIT_MAX: '100',
      USE_AUTH: 'true',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
