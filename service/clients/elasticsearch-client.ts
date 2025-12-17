import { Client as ESClient } from '@elastic/elasticsearch';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ quiet: false });
//environment variables
const ES_URLS = process.env.ES_URLS;
const ES_USERNAME = process.env.ES_USERNAME;
const ES_PASSWORD = process.env.ES_PASSWORD;
const ES_CLIENT_KEY = process.env.ES_CLIENT_KEY;
const ES_CLIENT_CERT = process.env.ES_CLIENT_CERT;
const ES_SCA = process.env.ES_SCA;

export const esClient = new ESClient({
    node: ES_URLS?.split(',') || [],
    auth: {
        username: ES_USERNAME || '',
        password: ES_PASSWORD || '',
    },
    tls: {
        ca: fs.readFileSync(ES_SCA || ''),
        rejectUnauthorized: false,
    },
});