import { StorageOptions } from '../../shared/types/core/storage.type.ts';
import { DatasetCollectionClientImpl } from './implements/dataset-collection-client-impl.ts';
import { DatasetClientImpl } from './implements/dataset-client-impl.ts';
import { KeyValueStoreCollectionClientImpl } from './implements/key-value-store-collection-client-impl.ts';
import { KeyValueStoreClientImpl } from './implements/key-value-store-client-impl.ts';
import { RequestQueueCollectionClientImpl } from './implements/request-queue-collection-client-impl.ts';
import { RequestQueueClientImpl } from './implements/request-queue-client-impl.ts';
import {
    ListBucketsCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { mongoClient } from '../../clients/mongodb-client.ts';
import { minioClient } from '../../clients/minio-client.ts';
import type {
    StorageClient,
    DatasetCollectionClient,
    DatasetClient,
    KeyValueStoreCollectionClient,
    KeyValueStoreClient,
    RequestQueueCollectionClient,
    RequestQueueClient,
    RequestQueueOptions
} from '@crawlee/types';
import dotenv from 'dotenv';

dotenv.config();

export class storageClient implements StorageClient {
    private options: StorageOptions;
    private isConnected = false;

    constructor(options?: StorageOptions) {
        this.options = {
            minioBucket: options?.minioBucket || process.env.MINIO_BUCKET,
            minioBasePrefix: options?.minioBasePrefix || process.env.MINIO_BASE_PREFIX,
            minioPrefix: options?.minioPrefix,
            mongoDbName: options?.mongoDbName || process.env.MONGODB_DB_NAME,
            mongoCollectionName: options?.mongoCollectionName,
            downloadFiles: options?.downloadFiles ?? true,
            ...options,
        };
        console.log('StorageClient options:', {
            minioBucket: this.options.minioBucket,
            minioBasePrefix: this.options.minioBasePrefix,
            minioPrefix: this.options.minioPrefix,
            mongoDbName: this.options.mongoDbName,
            mongoCollectionName: this.options.mongoCollectionName,
            downloadFiles: this.options.downloadFiles,
        });
    }
    async connect() {
        if (!this.isConnected) {
            try {
                await mongoClient.connect();
            } catch (error) {
                throw new Error('Failed to connect to MongoDB');
            }
            try {
                await minioClient.send(new ListBucketsCommand({}));
            } catch (error) {
                throw new Error('Failed to connect to MinIO');
            }
            this.isConnected = true;
        };
    }

    datasets(): DatasetCollectionClient {
        return new DatasetCollectionClientImpl();
    }

    dataset(id: string): DatasetClient {
        return new DatasetClientImpl(id, this.options);
    }

    keyValueStores(): KeyValueStoreCollectionClient {
        return new KeyValueStoreCollectionClientImpl();
    }

    keyValueStore(id: string): KeyValueStoreClient {
        return new KeyValueStoreClientImpl(id, this.options);
    }

    requestQueues(): RequestQueueCollectionClient {
        return new RequestQueueCollectionClientImpl();
    }

    requestQueue(id: string, options?: RequestQueueOptions): RequestQueueClient {
        return new RequestQueueClientImpl(id, this.options);
    }

    async purge(): Promise<void> {
        console.log('[StorageClient] Purging request queue...');

        // Purge default request queue (pending, handled, locked)
        // NOTE: Use 'metadata' folder (same as RequestQueueClientImpl)
        const rqPrefix = `${this.options.minioBasePrefix}/metadata/request_queues/default`;

        try {
            const response = await minioClient.send(new ListObjectsV2Command({
                Bucket: this.options.minioBucket,
                Prefix: rqPrefix,
            }));

            const keys = (response.Contents || []).map(obj => obj.Key!);
            console.log(`[StorageClient] Found ${keys.length} objects in request_queues/default to purge`);

            for (const key of keys) {
                await minioClient.send(new DeleteObjectCommand({
                    Bucket: this.options.minioBucket,
                    Key: key,
                }));
            }

            console.log(`[StorageClient] Purged ${keys.length} objects from request_queues/default`);
        } catch (err) {
            console.error('[StorageClient] Error purging request queue:', err);
        }

        // MongoDB data is NOT purged - crawled data is preserved
    }

    // Crawlee gọi method này - KHÔNG disconnect
    async teardown(): Promise<void> {
        console.log('[StorageClient] teardown() called by Crawlee (no-op)');
        // Không làm gì - để user tự quản lý lifecycle
    }

    // User gọi method này để thực sự disconnect
    async disconnect(): Promise<void> {
        if (this.isConnected) {
            await mongoClient.close();
            this.isConnected = false;
            console.log('StorageClient disconnected');
        }
    }
}
