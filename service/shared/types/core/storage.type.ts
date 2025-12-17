export interface StorageOptions {
    // minio
    minioEndpoint?: string;
    minioAccessKey?: string;
    minioSecretKey?: string;
    minioBucket?: string;
    minioCertPath?: string;
    minioBasePrefix?: string;
    minioPrefix?: string;

    // mongodb
    mongoUri?: string;
    mongoDbName?: string;
    mongoCollectionName?: string;

    // options
    downloadFiles?: boolean; //download files from minio

    //elasticsearch
    esUrls?: string[];
    esSca?: string;
    esUsername?: string;
    esPassword?: string;
    esIndex?: string;
}