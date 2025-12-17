import { HeadBucketCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { Agent } from 'https';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ quiet: false });
//environment variables
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
const MINIO_CERT_PATH = process.env.MINIO_CERT_PATH;

//init clients
const agent = new Agent({
    ca: fs.readFileSync(MINIO_CERT_PATH || ''),
    rejectUnauthorized: true,
});
export const minioClient = new S3Client({
    region: 'us-east-1',
    endpoint: MINIO_ENDPOINT,
    credentials: {
        accessKeyId: MINIO_ACCESS_KEY || '',
        secretAccessKey: MINIO_SECRET_KEY || '',
    },
    ...(agent && {
        requestHandler: new NodeHttpHandler({
            httpsAgent: agent,
            connectionTimeout: 10000,
        }) as any,
        forcePathStyle: true,
        retryMode: 'adaptive'
    })
});