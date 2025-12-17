import { StorageOptions } from "../../../shared/types/core/storage.type.ts";
import { Collection, Document } from "mongodb";
import type {
    DatasetClient,
    DatasetInfo,
    Dictionary,
    PaginatedList,
    DatasetClientUpdateOptions,
    DatasetClientListOptions,
} from '@crawlee/types'
import { normalizeData } from "../../../shared/utils/utils.ts";
import { downloadFilesToMinio } from "../../../shared/utils/utils.ts";
import { mongoClient } from "../../../clients/mongodb-client.ts";
export class DatasetClientImpl implements DatasetClient {
    constructor(
        private id: string,
        private options: StorageOptions,
    ) { }

    private getCollection(): Collection<Document> {
        return mongoClient
            .db(this.options.mongoDbName)
            .collection(this.options.mongoCollectionName!);
    }
    async get(): Promise<DatasetInfo | undefined> {
        const count = await this.getCollection().countDocuments({ _datasetId: this.id });
        return {
            id: this.id,
            name: this.id,
            accessedAt: new Date(),
            itemCount: count,
            createdAt: new Date(),
            modifiedAt: new Date(),
        }
    }

    async update(newFields: DatasetClientUpdateOptions): Promise<Partial<DatasetInfo>> {
        return {
            id: this.id,
            name: newFields.name
        }
    }

    async delete(): Promise<void> {
        await this.getCollection().deleteMany({ _datasetId: this.id });
    }

    async downloadItems(): Promise<Buffer> {
        const items = await this.getCollection()
            .find({ _datasetId: this.id })
            .toArray();
        return Buffer.from(JSON.stringify(items));
    }

    async listItems(options?: DatasetClientListOptions): Promise<PaginatedList<Dictionary>> {
        const limit = options?.limit || 10;
        const offset = options?.offset || 0;
        const total = await this.getCollection().countDocuments({ _datasetId: this.id });

        const cursor = this.getCollection()
            .find({ _datasetId: this.id })
            .skip(offset)
            .limit(limit);
        const items = await cursor.toArray();

        return {
            total,
            count: items.length,
            offset: offset,
            limit: limit,
            items: items as Dictionary[],
        };
    }

    async pushItems(items: Dictionary | Dictionary[] | string | string[]): Promise<void> {
        let itemArray: Dictionary[];
        if (typeof items === 'string') {
            itemArray = [JSON.parse(items)];
        } else if (Array.isArray(items)) {
            itemArray = items.map(item => typeof item === 'string' ? JSON.parse(item) : item);
        } else {
            itemArray = [items];
        }

        for (const rawItem of itemArray) {
            // 1. Check duplicate by file_url (normalized field name)
            // Note: raw data uses fileUrl, normalized data uses file_url
            const fileUrl = rawItem.fileUrl;
            if (fileUrl) {
                const existing = await this.getCollection().findOne({ file_url: fileUrl });
                if (existing) {
                    console.log(`Skip duplicate: ${rawItem.fileName || fileUrl}`);
                    continue;
                }
            }

            // 2. Normalize data
            const normalizedItem = normalizeData(rawItem, this.options.minioBasePrefix as string, this.options.minioPrefix as string);

            // 3. Save to MongoDB
            await this.getCollection().insertOne({
                ...normalizedItem,
                //_datasetId: this.id,
                //_crawledAt: new Date().toISOString(),
            });
            console.log(`Saved to MongoDB: ${normalizedItem.title || normalizedItem.sourceId}`);

            // 4. Download files to MinIO
            if (this.options.downloadFiles && rawItem.fileUrl) {
                await downloadFilesToMinio(normalizedItem, this.options.minioPrefix as string, this.options.minioBucket as string);
            }
        }
    }

}
