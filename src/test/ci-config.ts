import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// CI-specific test configuration
export const ciConfig = defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    
    // CI-specific settings
    reporter: ['verbose', 'junit', 'json'],
    outputFile: {
      junit: './test-results/junit.xml',
      json: './test-results/results.json'
    },
    
    // Coverage settings for CI
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'src/**/__tests__/',
        'vitest.config.ts',
        'next.config.js',
        'tailwind.config.ts',
        'postcss.config.js'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Specific thresholds for onboarding components
        'src/components/onboarding/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/app/api/onboarding/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    },
    
    // Performance settings
    testTimeout: 10000, // 10 seconds for CI
    hookTimeout: 5000,  // 5 seconds for setup/teardown
    
    // Retry failed tests in CI
    retry: 2,
    
    // Run tests in sequence for more predictable CI results
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../'),
    },
  },
})

// Test categories for different CI stages
export const testCategories = {
  unit: {
    include: [
      'src/**/*.test.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}'
    ],
    exclude: [
      'src/**/*integration*.test.{ts,tsx}',
      'src/**/*e2e*.test.{ts,tsx}',
      'src/**/*performance*.test.{ts,tsx}'
    ]
  },
  
  integration: {
    include: [
      'src/**/*integration*.test.{ts,tsx}',
      'src/app/__tests__/**/*.test.{ts,tsx}'
    ]
  },
  
  e2e: {
    include: [
      'src/**/*e2e*.test.{ts,tsx}'
    ]
  },
  
  performance: {
    include: [
      'src/**/*performance*.test.{ts,tsx}'
    ]
  }
}

// GitHub Actions workflow configuration
export const githubActionsConfig = {
  name: 'Onboarding Tests',
  
  on: {
    push: {
      branches: ['main', 'develop']
    },
    pull_request: {
      branches: ['main', 'develop']
    }
  },
  
  jobs: {
    'unit-tests': {
      'runs-on': 'ubuntu-latest',
      
      strategy: {
        matrix: {
          'node-version': ['18.x', '20.x']
        }
      },
      
      steps: [
        {
          uses: 'actions/checkout@v4'
        },
        {
          name: 'Use Node.js ${{ matrix.node-version }}',
          uses: 'actions/setup-node@v4',
          with: {
            'node-version': '${{ matrix.node-version }}',
            'cache': 'npm'
          }
        },
        {
          name: 'Install dependencies',
          run: 'npm ci'
        },
        {
          name: 'Run unit tests',
          run: 'npm run test:unit'
        },
        {
          name: 'Upload coverage reports',
          uses: 'codecov/codecov-action@v3',
          with: {
            file: './coverage/lcov.info'
          }
        }
      ]
    },
    
    'integration-tests': {
      'runs-on': 'ubuntu-latest',
      needs: 'unit-tests',
      
      steps: [
        {
          uses: 'actions/checkout@v4'
        },
        {
          name: 'Use Node.js 20.x',
          uses: 'actions/setup-node@v4',
          with: {
            'node-version': '20.x',
            'cache': 'npm'
          }
        },
        {
          name: 'Install dependencies',
          run: 'npm ci'
        },
        {
          name: 'Run integration tests',
          run: 'npm run test:integration'
        }
      ]
    },
    
    'e2e-tests': {
      'runs-on': 'ubuntu-latest',
      needs: 'integration-tests',
      
      steps: [
        {
          uses: 'actions/checkout@v4'
        },
        {
          name: 'Use Node.js 20.x',
          uses: 'actions/setup-node@v4',
          with: {
            'node-version': '20.x',
            'cache': 'npm'
          }
        },
        {
          name: 'Install dependencies',
          run: 'npm ci'
        },
        {
          name: 'Run E2E tests',
          run: 'npm run test:e2e'
        }
      ]
    },
    
    'performance-tests': {
      'runs-on': 'ubuntu-latest',
      needs: 'unit-tests',
      
      steps: [
        {
          uses: 'actions/checkout@v4'
        },
        {
          name: 'Use Node.js 20.x',
          uses: 'actions/setup-node@v4',
          with: {
            'node-version': '20.x',
            'cache': 'npm'
          }
        },
        {
          name: 'Install dependencies',
          run: 'npm ci'
        },
        {
          name: 'Run performance tests',
          run: 'npm run test:performance'
        },
        {
          name: 'Upload performance results',
          uses: 'actions/upload-artifact@v3',
          with: {
            name: 'performance-results',
            path: './test-results/performance.json'
          }
        }
      ]
    }
  }
}

// Test scripts for package.json
export const testScripts = {
  'test': 'vitest',
  'test:run': 'vitest run',
  'test:ui': 'vitest --ui',
  'test:coverage': 'vitest run --coverage',
  
  // Category-specific test scripts
  'test:unit': 'vitest run --config src/test/ci-config.ts src/**/*.test.{ts,tsx} --exclude src/**/*integration*.test.{ts,tsx} --exclude src/**/*e2e*.test.{ts,tsx} --exclude src/**/*performance*.test.{ts,tsx}',
  'test:integration': 'vitest run --config src/test/ci-config.ts src/**/*integration*.test.{ts,tsx}',
  'test:e2e': 'vitest run --config src/test/ci-config.ts src/**/*e2e*.test.{ts,tsx}',
  'test:performance': 'vitest run --config src/test/ci-config.ts src/**/*performance*.test.{ts,tsx}',
  
  // CI-specific scripts
  'test:ci': 'vitest run --config src/test/ci-config.ts --coverage',
  'test:ci:unit': 'npm run test:unit -- --coverage',
  'test:ci:integration': 'npm run test:integration -- --reporter=verbose',
  'test:ci:e2e': 'npm run test:e2e -- --reporter=verbose',
  'test:ci:performance': 'npm run test:performance -- --reporter=json --outputFile=./test-results/performance.json'
}

// Quality gates for CI
export const qualityGates = {
  coverage: {
    minimum: 80,
    onboarding: 90 // Higher standard for onboarding components
  },
  
  performance: {
    maxRenderTime: 100, // milliseconds
    maxValidationTime: 50, // milliseconds
    maxApiResponseHandling: 200 // milliseconds
  },
  
  accessibility: {
    wcagLevel: 'AA',
    colorContrast: 4.5,
    keyboardNavigation: true
  }
}

export default ciConfig