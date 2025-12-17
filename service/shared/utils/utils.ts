import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import { minioClient } from '../../clients/minio-client.ts';
import { randomInt } from 'crypto';
import { Dictionary } from 'crawlee';
dotenv.config({ quiet: false });

export const normalizeData = (raw: Dictionary, minio_base_prefix: string, minio_prefix: string): Dictionary => {
    const currentDate = dayjs().format('DD-MM-YYYY');
    const fileName = raw.fileName; // Single file per document

    // Generate single storage path (not array)
    let storagePath: string | undefined;
    if (fileName) {
        const category = classifyFileByExtension(fileName);
        storagePath = `${minio_base_prefix}/${minio_prefix}/${currentDate}/${category}/${fileName}`;
    }

    return {
        //sourceId: raw.sourceId,
        file_name: raw.fileName,
        source: raw.sourceName,
        file_url: raw.fileUrl,
        file_extension: raw.fileType,
        file_size: raw.fileSize,
        storage_path: storagePath,
        general_description: null,
        //normalizedAt: new Date().toISOString(),
    };
}

export const downloadFilesToMinio = async (item: Dictionary, minio_prefix: string, minioBucket: string): Promise<void> => {
    const MAX_FILE_SIZE_MB = 100;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;  // 100MB

    // Support both raw (fileUrl) and normalized (file_url) fields
    const rawFileUrls = item.fileUrl || item.file_url;
    const fileUrls = Array.isArray(rawFileUrls) ? rawFileUrls : [rawFileUrls];
    const storagePath = item.storage_path;

    // Get file size from item (raw: fileSize, normalized: file_size)
    const fileSizeStr = item.fileSize || item.file_size;
    const fileSize = fileSizeStr ? parseInt(fileSizeStr, 10) : 0;

    for (let i = 0; i < fileUrls.length; i++) {
        const fileUrl = fileUrls[i];
        if (!fileUrl || !storagePath) continue;

        // Skip files larger than 100MB
        if (fileSize > MAX_FILE_SIZE_BYTES) {
            console.log(`Skip large file (${(fileSize / 1024 / 1024).toFixed(1)}MB > ${MAX_FILE_SIZE_MB}MB): ${storagePath}`);
            continue;
        }

        try {
            // Check exists
            try {
                await minioClient.send(new HeadObjectCommand({
                    Bucket: minioBucket as string,
                    Key: storagePath,
                }));
                console.log(`MinIO exists: ${storagePath}`);
                continue;
            } catch { }

            // Download
            await new Promise(r => setTimeout(r, randomInt(200, 500)));
            const response = await fetch(fileUrl);

            // Double-check size from response headers
            const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
            if (contentLength > MAX_FILE_SIZE_BYTES) {
                console.log(`Skip large file (${(contentLength / 1024 / 1024).toFixed(1)}MB > ${MAX_FILE_SIZE_MB}MB): ${storagePath}`);
                continue;
            }

            const buffer = await response.arrayBuffer();

            // Upload
            await minioClient.send(new PutObjectCommand({
                Bucket: minioBucket as string,
                Key: storagePath,
                Body: Buffer.from(buffer),
            }));
            console.log(`Saved to MinIO: ${storagePath}`);
        } catch (err) {
            console.error(`Failed to save to MinIO: ${fileUrl}`, err);
        }
    }
};
export const classifyFileByExtension = (file_name: string): string => {
    //Sử dụng os.path.splitext để tách tên file và phần mở rộng
    // Ví dụ: ('photo', '.jpg')
    const file_extension = file_name.split('.').pop()?.toLowerCase();

    //Ánh xạ các phần mở rộng sang danh mục
    const FILE_CATEGORIES: Record<string, string[]> = {
        //Phương tiện (Media)
        'images': ['jpg', 'jpeg', 'png', 'gif', 'bmp'],
        'videos': ['mp4', 'mov', 'avi', 'mkv'],
        'audios': ['mp3', 'wav', 'flac', 'aac'],

        //Tài liệu (Documents)
        'documents': ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf', 'md'],

        //Mã nguồn & Kịch bản (Code & Scripts)
        'codes': ['py', 'js', 'html', 'css', 'java', 'c', 'cpp', 'sh', 'sql'],

        //Gói & Lưu trữ (Packages & Archives)
        'archives': ['zip', 'rar', '7z', 'tar', 'gz', 'iso', 'apk', 'ipa'],

        //Dữ liệu & Cấu hình (Data & Config)
        'data_configs': ['json', 'xml', 'csv', 'db', 'sqlite'],

        //THÊM MỚI: Log Files
        'logs': ['log', 'trace', 'out'],

        //THÊM MỚI: Metrics Files (Phổ biến trong các hệ thống giám sát)
        'metrics': ['prom', 'rrd'],   // Round Robin Database (rrdtool)

        //Thực thi (Executables)
        'executables': ['exe', 'msi', 'bat', 'vbs'],

        //File Torrent
        'sharings': ['torrent'],
    }
    for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
        if (file_extension && extensions.includes(file_extension)) {
            return category;
        }
    }
    return 'unknown';
}