import { config as dotenv } from 'dotenv'
dotenv()

// Ensure NODE_ENV is test so we use DATABASE_URL_TEST
process.env['NODE_ENV'] = 'test'
