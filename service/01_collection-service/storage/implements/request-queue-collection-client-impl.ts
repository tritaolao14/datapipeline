import type {
    RequestQueueCollectionClient,
    PaginatedList,
} from '@crawlee/types'
export class RequestQueueCollectionClientImpl implements RequestQueueCollectionClient {
    async list(): Promise<PaginatedList<any>> {
        return { total: 0, count: 0, offset: 0, limit: 100, items: [] };
    }
    async getOrCreate(name: string) {
        return {
            id: name,
            createdAt: new Date(),
            modifiedAt: new Date(),
            accessedAt: new Date(),
            totalRequestCount: 0,
            handledRequestCount: 0,
            pendingRequestCount: 0,
        };
    }
}