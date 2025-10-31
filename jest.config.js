/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.jest.json',
        useESM: false,
      },
    ],
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  testMatch: ['<rootDir>/__tests__/**/*.(test|spec).(ts|tsx)'],
  collectCoverage: false,
  collectCoverageFrom: ['pages/api/stillbrook-search.ts', 'pages/stillbrook.tsx'],
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  testTimeout: 10000,
};

module.exports = config;
