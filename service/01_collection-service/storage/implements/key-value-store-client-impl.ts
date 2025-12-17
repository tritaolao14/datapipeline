import { StorageOptions } from "../../../shared/types/core/storage.type.ts";
import type {
    KeyValueStoreInfo,
    KeyValueStoreClientUpdateOptions,
    KeyValueStoreClientListOptions,
    KeyValueStoreClientListData,
    KeyValueStoreClientGetRecordOptions,
    KeyValueStoreRecord,
    KeyValueStoreRecordOptions,
    KeyValueStoreClient,
} from '@crawlee/types'
import { minioClient } from "../../../clients/minio-client.ts";
import {
    DeleteObjectCommand,
    ListObjectsV2Command,
    GetObjectCommand,
    PutObjectCommand,
    HeadObjectCommand
} from '@aws-sdk/client-s3';

export class KeyValueStoreClientImpl implements KeyValueStoreClient {
    private prefix: string;

    constructor(
        private id: string,
        private options: StorageOptions
    ) {
        this.prefix = `${this.options.minioBasePrefix}/metadata/key_value_stores/${this.id}`;
    }
    private key(recordKey: string): string {
        return `${this.prefix}/${recordKey}`;
    }

    async get(): Promise<KeyValueStoreInfo | undefined> {
        return {
            id: this.id,
            name: this.id,
            accessedAt: new Date(),
            createdAt: new Date(),
            modifiedAt: new Date(),
        }
    }

    async update(newFields: KeyValueStoreClientUpdateOptions): Promise<Partial<KeyValueStoreInfo>> {
        return {
            id: this.id,
            name: newFields.name,
            accessedAt: new Date(),
            modifiedAt: new Date(),
        }
    }

    async delete(): Promise<void> {
        const keys = await this.listAllKeys();
        for (const key of keys) {
            await minioClient.send(new DeleteObjectCommand({
                Bucket: this.options.minioBucket as string,
                Key: key,
            }));
        }
    }

    private async listAllKeys(): Promise<string[]> {
        const response = await minioClient.send(new ListObjectsV2Command({
            Bucket: this.options.minioBucket,
            Prefix: this.prefix,
        }));
        return (response.Contents || []).map(obj => obj.Key!);
    }

    async listKeys(options?: KeyValueStoreClientListOptions): Promise<KeyValueStoreClientListData> {
        const keys = await this.listAllKeys();
        return {
            count: keys.length,
            limit: options?.limit || 1000,
            isTruncated: false,
            items: keys.map(k => ({ key: k.replace(`${this.prefix}/`, ''), size: 0 })),
        };
    }

    async recordExists(key: string): Promise<boolean> {
        try {
            await minioClient.send(new HeadObjectCommand({
                Bucket: this.options.minioBucket,
                Key: this.key(key),
            }));
            return true;
        } catch {
            return false;
        }
    }

    async getRecord(key: string, options?: KeyValueStoreClientGetRecordOptions): Promise<KeyValueStoreRecord | undefined> {
        console.log(`[KVS] getRecord: ${key}`);
        console.log(`[KVS] Full path: ${this.key(key)}`);

        try {
            const response = await minioClient.send(new GetObjectCommand({
                Bucket: this.options.minioBucket,
                Key: this.key(key),
            }));

            const body = await response.Body?.transformToString();
            const contentType = response.ContentType;  // ← Lấy ContentType từ MinIO response

            console.log(`[KVS] ContentType from MinIO: ${contentType}`);
            console.log(`[KVS] Got body (first 100 chars): ${body?.substring(0, 100)}`);

            if (!body) return undefined;

            // Xử lý theo ContentType
            if (contentType === 'application/json' || contentType?.includes('json')) {
                // JSON → parse và trả về object
                try {
                    return {
                        key,
                        value: JSON.parse(body),  // ← Parse cho JSON
                        contentType: contentType || 'application/json'
                    };
                } catch {
                    // JSON parse failed, return as string
                    return { key, value: body, contentType: contentType || 'application/json' };
                }
            } else {
                // text/plain hoặc khác → trả về raw string
                return {
                    key,
                    value: body,  // ← Giữ nguyên string
                    contentType: contentType || 'text/plain'
                };
            }

        } catch (err: any) {
            if (err.name !== 'NoSuchKey' && err.$metadata?.httpStatusCode !== 404) {
                console.error(`[KVS] Error getting record:`, err);
            }
            return undefined;
        }
    }

    async setRecord(record: KeyValueStoreRecord, options?: KeyValueStoreRecordOptions): Promise<void> {
        console.log(`[KVS] setRecord: ${record.key}`);
        console.log(`[KVS] Value type: ${typeof record.value}`);
        console.log(`[KVS] ContentType: ${record.contentType}`);

        let value: string;

        if (typeof record.value === 'string') {
            value = record.value;  // Đã là string, giữ nguyên
        } else if (Buffer.isBuffer(record.value)) {
            value = record.value.toString('utf-8');
        } else if (record.value instanceof Uint8Array) {
            value = Buffer.from(record.value).toString('utf-8');
        } else {
            // Object - stringify
            value = JSON.stringify(record.value);
        }

        console.log(`[KVS] Saving (first 100 chars): ${value.substring(0, 100)}`);

        await minioClient.send(new PutObjectCommand({
            Bucket: this.options.minioBucket,
            Key: this.key(record.key),
            Body: value,
            ContentType: record.contentType || 'application/json',
        }));

        console.log(`[KVS] ✅ Saved: ${record.key}`);
    }

    async deleteRecord(key: string): Promise<void> {
        await minioClient.send(new DeleteObjectCommand({
            Bucket: this.options.minioBucket,
            Key: this.key(key),
        }));
    }
}