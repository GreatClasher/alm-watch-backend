process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://dummy:dummy@localhost:5432/dummy';
process.env.JWT_PRIVATE_KEY_PATH = 'test/dummy.pem';
process.env.JWT_PUBLIC_KEY_PATH = 'test/dummy.pem';
process.env.JWT_EXPIRES_IN = '86400';
process.env.LOG_LEVEL = 'info';
