import { StorageOptions } from "../../../shared/types/core/storage.type.ts";
import type {
    RequestQueueClient,
    RequestQueueInfo,
    ListOptions,
    QueueHead,
    QueueOperationInfo,
    RequestSchema,
    RequestOptions,
    BatchAddRequestsResult,
    UpdateRequestSchema,
    ListAndLockOptions,
    ListAndLockHeadResult,
    ProlongRequestLockOptions,
    ProlongRequestLockResult,
    DeleteRequestLockOptions,
} from '@crawlee/types'
import { minioClient } from "../../../clients/minio-client.ts";
import { ListObjectsV2Command, GetObjectCommand, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
export class RequestQueueClientImpl implements RequestQueueClient {
    private pendingPrefix: string;
    private handledPrefix: string;
    private lockedPrefix: string;

    constructor(
        private id: string,
        private options: StorageOptions
    ) {
        const base = `${options.minioBasePrefix}/metadata/request_queues/${id}`;
        this.pendingPrefix = `${base}/pending`;
        this.handledPrefix = `${base}/handled`;
        this.lockedPrefix = `${base}/locked`;
    }

    private requestKey(uniqueKey: string, handled = false): string {
        const base = handled ? this.handledPrefix : this.pendingPrefix;
        const safeKey = Buffer.from(uniqueKey).toString('base64url');
        return `${base}/${safeKey}.json`;
    }

    private async listKeys(prefix: string): Promise<string[]> {
        const response = await minioClient.send(new ListObjectsV2Command({
            Bucket: this.options.minioBucket,
            Prefix: prefix,
        }));
        return (response.Contents || []).map(obj => obj.Key!);
    }

    async get(): Promise<RequestQueueInfo | undefined> {
        const [pending, handled, locked] = await Promise.all([
            this.listKeys(this.pendingPrefix),
            this.listKeys(this.handledPrefix),
            this.listKeys(this.lockedPrefix),
        ]);
        return {
            id: this.id,
            name: this.id,
            createdAt: new Date(),
            modifiedAt: new Date(),
            accessedAt: new Date(),
            totalRequestCount: pending.length + handled.length + locked.length,
            handledRequestCount: handled.length,
            pendingRequestCount: pending.length + locked.length,
        };
    }

    async update(newFields: { name?: string }): Promise<Partial<RequestQueueInfo>> {
        return { id: this.id, name: newFields.name };
    }

    async delete(): Promise<void> {
        const keys = [
            ...await this.listKeys(this.pendingPrefix),
            ...await this.listKeys(this.handledPrefix),
        ];
        for (const key of keys) {
            await minioClient.send(new DeleteObjectCommand({
                Bucket: this.options.minioBucket,
                Key: key,
            }));
        }
    }

    async listHead(options?: ListOptions): Promise<QueueHead> {
        const limit = options?.limit || 100;

        console.log(`[RQ] listHead - Prefix: ${this.pendingPrefix}`);

        const keys = await this.listKeys(this.pendingPrefix);

        console.log(`[RQ] Found ${keys.length} pending requests`);

        const items: any[] = [];
        for (const key of keys.slice(0, limit)) {
            try {
                const response = await minioClient.send(new GetObjectCommand({
                    Bucket: this.options.minioBucket,
                    Key: key,
                }));
                const body = await response.Body?.transformToString();
                if (body) {
                    const parsed = JSON.parse(body);
                    console.log(`[RQ] Loaded request: ${parsed.url}`);
                    items.push(parsed);
                }
            } catch (err) {
                console.error(`[RQ] Error loading request ${key}:`, err);
            }
        }

        items.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0));

        return {
            limit,
            queueModifiedAt: new Date(),
            items,
        };
    }

    async addRequest(request: RequestSchema, options?: RequestOptions): Promise<QueueOperationInfo> {
        const requestId = request.id || crypto.randomUUID().toString();
        const uniqueKey = request.uniqueKey;

        console.log(`[RQ] Adding request: ${request.url}`);
        console.log(`[RQ] Bucket: ${this.options.minioBucket}, Prefix: ${this.pendingPrefix}`);

        // Check if already handled
        try {
            await minioClient.send(new HeadObjectCommand({
                Bucket: this.options.minioBucket,
                Key: this.requestKey(uniqueKey, true),
            }));
            console.log(`[RQ] Already handled: ${uniqueKey}`);
            return { wasAlreadyPresent: true, wasAlreadyHandled: true, requestId };
        } catch (err: any) {
            // Chỉ ignore NotFound error, không ignore các error khác
            if (err.name !== 'NotFound' && err.$metadata?.httpStatusCode !== 404) {
                console.error(`[RQ] Error checking handled:`, err);
            }
        }

        // Check if already pending
        try {
            await minioClient.send(new HeadObjectCommand({
                Bucket: this.options.minioBucket,
                Key: this.requestKey(uniqueKey, false),
            }));
            console.log(`[RQ] Already pending: ${uniqueKey}`);
            return { wasAlreadyPresent: true, wasAlreadyHandled: false, requestId };
        } catch (err: any) {
            if (err.name !== 'NotFound' && err.$metadata?.httpStatusCode !== 404) {
                console.error(`[RQ] Error checking pending:`, err);
            }
        }

        // Add to pending
        try {
            await minioClient.send(new PutObjectCommand({
                Bucket: this.options.minioBucket,
                Key: this.requestKey(uniqueKey, false),
                Body: JSON.stringify({
                    ...request,
                    id: requestId,
                    orderNo: options?.forefront ? 0 : Date.now(),
                }),
            }));
            console.log(`[RQ] Added to pending: ${request.url}`);
        } catch (err) {
            console.error(`[RQ] Failed to add request:`, err);
            throw err;
        }

        return { wasAlreadyPresent: false, wasAlreadyHandled: false, requestId };
    }

    async batchAddRequests(requests: RequestSchema[], options?: RequestOptions): Promise<BatchAddRequestsResult> {
        const results = await Promise.all(requests.map(r => this.addRequest(r, options)));
        return {
            processedRequests: results.map((r, i) => ({
                uniqueKey: requests[i].uniqueKey,
                requestId: r.requestId,
                wasAlreadyPresent: r.wasAlreadyPresent,
                wasAlreadyHandled: r.wasAlreadyHandled,
            })),
            unprocessedRequests: [],
        };
    }

    async getRequest(id: string): Promise<RequestOptions | undefined> {
        console.log(`[RQ] getRequest: ${id}`);

        // Search in all folders: locked, pending, handled
        for (const folder of ['locked', 'pending', 'handled']) {
            const prefix = `${this.options.minioBasePrefix}/metadata/request_queues/${this.id}/${folder}`;

            try {
                const response = await minioClient.send(new ListObjectsV2Command({
                    Bucket: this.options.minioBucket,
                    Prefix: prefix,
                }));

                for (const obj of response.Contents || []) {
                    try {
                        const getResponse = await minioClient.send(new GetObjectCommand({
                            Bucket: this.options.minioBucket,
                            Key: obj.Key!,
                        }));
                        const body = await getResponse.Body?.transformToString();
                        if (body) {
                            const parsed = JSON.parse(body);
                            if (parsed.id === id) {
                                console.log(`[RQ] Found request ${id} in ${folder}`);
                                return parsed as RequestOptions;
                            }
                        }
                    } catch (err) {
                        // Continue searching
                    }
                }
            } catch (err) {
                // Continue to next folder
            }
        }

        console.log(`[RQ] Request not found: ${id}`);
        return undefined;
    }

    async updateRequest(request: UpdateRequestSchema, options?: RequestOptions): Promise<QueueOperationInfo> {
        const uniqueKey = request.uniqueKey;
        const lockedKey = this.requestKey(uniqueKey, false).replace('/pending/', '/locked/');

        console.log(`[RQ] updateRequest: ${request.url}, handledAt: ${request.handledAt}`);

        if (request.handledAt) {
            // Move từ locked → handled
            await minioClient.send(new PutObjectCommand({
                Bucket: this.options.minioBucket,
                Key: this.requestKey(uniqueKey, true),  // handled
                Body: JSON.stringify(request),
            }));

            // Delete từ locked
            try {
                await minioClient.send(new DeleteObjectCommand({
                    Bucket: this.options.minioBucket,
                    Key: lockedKey,
                }));
            } catch { }

            // Also try delete from pending (backup)
            try {
                await minioClient.send(new DeleteObjectCommand({
                    Bucket: this.options.minioBucket,
                    Key: this.requestKey(uniqueKey, false),
                }));
            } catch { }

            console.log(`[RQ] Marked as handled: ${request.url}`);
        }

        return {
            wasAlreadyPresent: true,
            wasAlreadyHandled: !!request.handledAt,
            requestId: request.id || '',
        };
    }

    async deleteRequest(id: string): Promise<void> {
        await minioClient.send(new DeleteObjectCommand({
            Bucket: this.options.minioBucket,
            Key: this.requestKey(id, false),
        }));
        await minioClient.send(new DeleteObjectCommand({
            Bucket: this.options.minioBucket,
            Key: this.requestKey(id, true),
        }));
    }

    // Lock-related methods (simplified - MinIO doesn't support real locking)
    // Trong listAndLockHead, thay đổi phần return items:

    async listAndLockHead(options: ListAndLockOptions): Promise<ListAndLockHeadResult> {
        const limit = options?.limit || 100;
        const lockSecs = options.lockSecs;

        console.log(`[RQ] listAndLockHead - Prefix: ${this.pendingPrefix}, limit: ${limit}`);

        const keys = await this.listKeys(this.pendingPrefix);

        console.log(`[RQ] Found ${keys.length} pending requests to lock`);

        const items: any[] = [];

        for (const key of keys.slice(0, limit)) {
            try {
                const response = await minioClient.send(new GetObjectCommand({
                    Bucket: this.options.minioBucket,
                    Key: key,
                }));
                const body = await response.Body?.transformToString();
                if (body) {
                    const parsed = JSON.parse(body);

                    console.log(`[RQ] Request data:`, JSON.stringify({
                        id: parsed.id,
                        uniqueKey: parsed.uniqueKey,
                        url: parsed.url,
                        method: parsed.method,
                        retryCount: parsed.retryCount,
                        userData: parsed.userData,
                    }, null, 2));

                    // Move từ pending → locked
                    const lockedKey = key.replace('/pending/', '/locked/');

                    // Tạo locked request với lockExpiresAt là Date object
                    const lockExpiresAt = new Date(Date.now() + (lockSecs * 1000));

                    const lockedRequest = {
                        ...parsed,
                        lockExpiresAt: lockExpiresAt.toISOString(),  // Store as ISO string
                    };

                    // Save to locked
                    await minioClient.send(new PutObjectCommand({
                        Bucket: this.options.minioBucket,
                        Key: lockedKey,
                        Body: JSON.stringify(lockedRequest),
                    }));

                    // Delete from pending
                    await minioClient.send(new DeleteObjectCommand({
                        Bucket: this.options.minioBucket,
                        Key: key,
                    }));

                    console.log(`[RQ] Locked: ${parsed.url}`);

                    // Return với lockExpiresAt là Date object (Crawlee expects Date)
                    items.push({
                        ...parsed,
                        lockExpiresAt: lockExpiresAt,  // Date object, NOT string
                    });
                }
            } catch (err) {
                console.error(`[RQ] Error locking request ${key}:`, err);
            }
        }

        items.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0));

        console.log(`[RQ] Returning ${items.length} locked items to Crawlee`);
        if (items.length > 0) {
            console.log(`[RQ] First item:`, JSON.stringify(items[0], (key, value) => {
                // Handle Date objects
                if (value instanceof Date) return value.toISOString();
                return value;
            }, 2));
        }

        return {
            limit,
            queueModifiedAt: new Date(),
            hadMultipleClients: false,
            items,
            lockSecs,
            queueHasLockedRequests: items.length > 0,
        };
    }

    async prolongRequestLock(id: string, options: ProlongRequestLockOptions): Promise<ProlongRequestLockResult> {
        return { lockExpiresAt: new Date(Date.now() + options.lockSecs * 1000) };
    }

    async deleteRequestLock(id: string, options?: DeleteRequestLockOptions): Promise<void> {
        // No-op for MinIO
    }
}