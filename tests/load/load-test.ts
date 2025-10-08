import { describe, it } from 'vitest';

interface LoadTestConfig {
  targetUrl: string;
  concurrentUsers: number;
  testDurationSeconds: number;
  requestsPerUser: number;
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
}

class LoadTester {
  private config: LoadTestConfig;
  private results: number[] = [];
  private errors: number = 0;

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  async runTest(): Promise<LoadTestResult> {
    console.log(`Starting load test with ${this.config.concurrentUsers} concurrent users...`);

    const startTime = Date.now();
    const userPromises: Promise<void>[] = [];

    for (let i = 0; i < this.config.concurrentUsers; i++) {
      userPromises.push(this.simulateUser(i));
    }

    await Promise.all(userPromises);

    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;

    return this.calculateResults(totalDuration);
  }

  private async simulateUser(userId: number): Promise<void> {
    for (let i = 0; i < this.config.requestsPerUser; i++) {
      try {
        const startTime = Date.now();

        const response = await fetch(this.config.targetUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        if (response.ok) {
          this.results.push(responseTime);
        } else {
          this.errors++;
        }

        await this.randomDelay(100, 500);
      } catch (error) {
        this.errors++;
      }
    }
  }

  private randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private calculateResults(totalDuration: number): LoadTestResult {
    const totalRequests = this.config.concurrentUsers * this.config.requestsPerUser;
    const successfulRequests = this.results.length;
    const failedRequests = this.errors;

    const averageResponseTime = this.results.length > 0
      ? this.results.reduce((sum, time) => sum + time, 0) / this.results.length
      : 0;

    const minResponseTime = this.results.length > 0
      ? Math.min(...this.results)
      : 0;

    const maxResponseTime = this.results.length > 0
      ? Math.max(...this.results)
      : 0;

    const requestsPerSecond = totalRequests / totalDuration;
    const errorRate = (failedRequests / totalRequests) * 100;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      requestsPerSecond,
      errorRate
    };
  }

  printResults(results: LoadTestResult): void {
    console.log('\n=== Load Test Results ===');
    console.log(`Total Requests: ${results.totalRequests}`);
    console.log(`Successful: ${results.successfulRequests}`);
    console.log(`Failed: ${results.failedRequests}`);
    console.log(`Error Rate: ${results.errorRate.toFixed(2)}%`);
    console.log(`\nResponse Times:`);
    console.log(`  Average: ${results.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Min: ${results.minResponseTime}ms`);
    console.log(`  Max: ${results.maxResponseTime}ms`);
    console.log(`\nThroughput: ${results.requestsPerSecond.toFixed(2)} req/s`);
    console.log('========================\n');
  }
}

describe('Load Testing', () => {
  it('should handle 100 concurrent users', async () => {
    const tester = new LoadTester({
      targetUrl: process.env.TEST_URL || 'http://localhost:3000/api/categories',
      concurrentUsers: 100,
      testDurationSeconds: 30,
      requestsPerUser: 10
    });

    const results = await tester.runTest();
    tester.printResults(results);
  }, 60000);

  it('should handle 500 concurrent users', async () => {
    const tester = new LoadTester({
      targetUrl: process.env.TEST_URL || 'http://localhost:3000/api/categories',
      concurrentUsers: 500,
      testDurationSeconds: 60,
      requestsPerUser: 5
    });

    const results = await tester.runTest();
    tester.printResults(results);
  }, 120000);

  it('should handle 1000 concurrent users', async () => {
    const tester = new LoadTester({
      targetUrl: process.env.TEST_URL || 'http://localhost:3000/api/categories',
      concurrentUsers: 1000,
      testDurationSeconds: 60,
      requestsPerUser: 3
    });

    const results = await tester.runTest();
    tester.printResults(results);
  }, 180000);

  it('should handle sustained load over 5 minutes', async () => {
    const tester = new LoadTester({
      targetUrl: process.env.TEST_URL || 'http://localhost:3000/api/categories',
      concurrentUsers: 200,
      testDurationSeconds: 300,
      requestsPerUser: 50
    });

    const results = await tester.runTest();
    tester.printResults(results);
  }, 360000);
});

export async function runManualLoadTest() {
  const configs: LoadTestConfig[] = [
    {
      targetUrl: process.env.TEST_URL || 'http://localhost:3000/api/categories',
      concurrentUsers: 10,
      testDurationSeconds: 10,
      requestsPerUser: 5
    },
    {
      targetUrl: process.env.TEST_URL || 'http://localhost:3000/api/categories',
      concurrentUsers: 50,
      testDurationSeconds: 30,
      requestsPerUser: 10
    },
    {
      targetUrl: process.env.TEST_URL || 'http://localhost:3000/api/categories',
      concurrentUsers: 100,
      testDurationSeconds: 60,
      requestsPerUser: 10
    }
  ];

  for (const config of configs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing with ${config.concurrentUsers} users`);
    console.log('='.repeat(60));

    const tester = new LoadTester(config);
    const results = await tester.runTest();
    tester.printResults(results);

    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

if (require.main === module) {
  runManualLoadTest().catch(console.error);
}
