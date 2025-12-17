import type {
    DatasetCollectionClient,
    PaginatedList,
} from '@crawlee/types'

export class DatasetCollectionClientImpl implements DatasetCollectionClient {
    async list(): Promise<PaginatedList<any>> {
        return { total: 0, count: 0, offset: 0, limit: 100, items: [] };
    }
    async getOrCreate(name?: string) {
        return { id: name || 'default', createdAt: new Date(), modifiedAt: new Date(), accessedAt: new Date() };
    }
}