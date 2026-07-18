describe('configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should validate and return environment variables when correct', () => {
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
    process.env.JWT_PRIVATE_KEY_PATH = 'key1.pem';
    process.env.JWT_PUBLIC_KEY_PATH = 'key2.pem';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'test';

    const { config } = require('./configuration');
    
    expect(config.DATABASE_URL).toBe('postgres://test:test@localhost:5432/test');
    expect(config.PORT).toBe(3000);
    expect(config.NODE_ENV).toBe('test');
  });

  it('should throw an error if missing required DATABASE_URL', () => {
    delete process.env.DATABASE_URL;
    process.env.JWT_PRIVATE_KEY_PATH = 'key1.pem';
    process.env.JWT_PUBLIC_KEY_PATH = 'key2.pem';
    process.env.NODE_ENV = 'test';
    
    expect(() => {
      require('./configuration');
    }).toThrow();
  });
});
