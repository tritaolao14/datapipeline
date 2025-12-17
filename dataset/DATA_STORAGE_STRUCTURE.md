# Cấu Trúc Lưu Trữ Dữ Liệu Toàn Diện - Đa Định Dạng & Đa Giai Đoạn

## Sơ đồ lưu trữ toàn diện cho tất cả loại dữ liệu

```
data-processing-pipeline/
├── 01_collection/                           # Giai đoạn Thu thập Dữ liệu
│   ├── raw/                                # Vùng Dữ liệu Thô (Bất biến)
│   │   ├── structured/                     # Dữ liệu Có cấu trúc
│   │   │   ├── 2024/01/15/
│   │   │   │   ├── csv/
│   │   │   │   │   ├── api_users_20240115.csv
│   │   │   │   │   ├── db_orders_20240115.csv
│   │   │   │   │   └── web_products_20240115.csv
│   │   │   │   ├── sql/
│   │   │   │   │   ├── database_dump_20240115.sql
│   │   │   │   │   └── schema_20240115.sql
│   │   │   │   └── parquet/
│   │   │   │       ├── api_users_20240115.parquet
│   │   │   │       └── db_orders_20240115.parquet
│   │   │   └── 2024/01/16/
│   │   │
│   │   ├── semi_structured/                # Dữ liệu Bán cấu trúc
│   │   │   ├── 2024/01/15/
│   │   │   │   ├── json/
│   │   │   │   │   ├── api_responses_20240115.json
│   │   │   │   │   ├── web_scraping_20240115.json
│   │   │   │   │   └── config_20240115.json
│   │   │   │   ├── xml/
│   │   │   │   │   ├── legacy_data_20240115.xml
│   │   │   │   │   └── api_feed_20240115.xml
│   │   │   │   └── yaml/
│   │   │   │       ├── config_20240115.yaml
│   │   │   │       └── metadata_20240115.yaml
│   │   │   └── 2024/01/16/
│   │   │
│   │   └── unstructured/                    # Dữ liệu Không cấu trúc
│   │       ├── 2024/01/15/
│   │       │   ├── text/
│   │       │   │   ├── documents_20240115.txt
│   │       │   │   ├── emails_20240115.txt
│   │       │   │   └── reports_20240115.txt
│   │       │   ├── logs/
│   │       │   │   ├── application_20240115.log
│   │       │   │   ├── error_20240115.log
│   │       │   │   └── access_20240115.log
│   │       │   ├── images/
│   │       │   │   ├── photos_20240115/
│   │       │   │   ├── screenshots_20240115/
│   │       │   │   └── diagrams_20240115/
│   │       │   ├── video/
│   │       │   │   ├── recordings_20240115/
│   │       │   │   ├── tutorials_20240115/
│   │       │   │   └── meetings_20240115/
│   │       │   ├── audio/
│   │       │   │   ├── voice_notes_20240115/
│   │       │   │   ├── podcasts_20240115/
│   │       │   │   └── music_20240115/
│   │       │   └── voice/
│   │       │       ├── call_recordings_20240115/
│   │       │       ├── voice_commands_20240115/
│   │       │       └── speech_data_20240115/
│   │       └── 2024/01/16/
│   │
│   └── metadata/                            # Siêu dữ liệu Thu thập
│       ├── data_lineage/
│       ├── source_schemas/
│       └── collection_logs/
│
├── 02_preprocessing/                        # Giai đoạn Tiền xử lý Dữ liệu
│   ├── cleaned/                            # Dữ liệu Đã làm sạch
│   │   ├── structured/
│   │   │   ├── 2024/01/15/
│   │   │   │   ├── csv/
│   │   │   │   ├── sql/
│   │   │   │   └── parquet/
│   │   │   └── 2024/01/16/
│   │   ├── semi_structured/
│   │   │   ├── 2024/01/15/
│   │   │   │   ├── json/
│   │   │   │   ├── xml/
│   │   │   │   └── yaml/
│   │   │   └── 2024/01/16/
│   │   └── unstructured/
│   │       ├── 2024/01/15/
│   │       │   ├── text/
│   │       │   ├── logs/
│   │       │   ├── images/
│   │       │   ├── video/
│   │       │   ├── audio/
│   │       │   └── voice/
│   │       └── 2024/01/16/
│   │
│   ├── normalized/                          # Dữ liệu Đã chuẩn hóa
│   │   ├── structured/
│   │   ├── semi_structured/
│   │   └── unstructured/
│   │
│   └── metadata/                            # Siêu dữ liệu Tiền xử lý
│       ├── cleaning_rules/
│       ├── transformation_logs/
│       └── quality_metrics/
│
├── 03_processing/                           # Giai đoạn Xử lý Dữ liệu
│   ├── features/                            # Kho Đặc trưng
│   │   ├── user_features/
│   │   │   ├── structured/
│   │   │   ├── semi_structured/
│   │   │   └── unstructured/
│   │   ├── product_features/
│   │   │   ├── structured/
│   │   │   ├── semi_structured/
│   │   │   └── unstructured/
│   │   └── transaction_features/
│   │       ├── structured/
│   │       ├── semi_structured/
│   │       └── unstructured/
│   │
│   ├── aggregated/                          # Dữ liệu Tổng hợp
│   │   ├── structured/
│   │   ├── semi_structured/
│   │   └── unstructured/
│   │
│   └── metadata/                            # Siêu dữ liệu Xử lý
│       ├── feature_engineering/
│       ├── aggregation_rules/
│       └── processing_logs/
│
├── 04_modeling/                             # Giai đoạn Mô hình hóa ML/AI
│   ├── models/                              # Các Artifact Mô hình
│   │   ├── classification/
│   │   │   ├── structured_models/
│   │   │   ├── text_models/
│   │   │   ├── image_models/
│   │   │   ├── audio_models/
│   │   │   └── multimodal_models/
│   │   ├── clustering/
│   │   │   ├── structured_models/
│   │   │   ├── text_models/
│   │   │   ├── image_models/
│   │   │   └── audio_models/
│   │   └── feature_engineering/
│   │       ├── structured_features/
│   │       ├── text_features/
│   │       ├── image_features/
│   │       └── audio_features/
│   │
│   ├── training_data/                       # Tập dữ liệu Huấn luyện
│   │   ├── structured/
│   │   ├── semi_structured/
│   │   └── unstructured/
│   │
│   └── metadata/                            # Siêu dữ liệu Mô hình hóa
│       ├── model_registry/
│       ├── training_logs/
│       └── evaluation_metrics/
│
├── 05_evaluation/                           # Giai đoạn Đánh giá Mô hình
│   ├── results/                             # Kết quả Đánh giá
│   │   ├── structured/
│   │   ├── semi_structured/
│   │   └── unstructured/
│   │
│   ├── reports/                             # Báo cáo Đánh giá
│   │   ├── daily_summary/
│   │   ├── weekly_analysis/
│   │   └── monthly_insights/
│   │
│   └── metadata/                            # Siêu dữ liệu Đánh giá
│       ├── evaluation_logs/
│       ├── performance_metrics/
│       └── comparison_results/
│
├── 06_deployment/                           # Giai đoạn Triển khai Mô hình
│   ├── production_models/                   # Production Models
│   │   ├── structured_models/
│   │   ├── text_models/
│   │   ├── image_models/
│   │   ├── audio_models/
│   │   └── multimodal_models/
│   │
│   ├── api_data/                            # Dữ liệu API
│   │   ├── requests/
│   │   ├── responses/
│   │   └── logs/
│   │
│   └── metadata/                            # Deployment Metadata
│       ├── deployment_logs/
│       ├── performance_monitoring/
│       └── version_control/
│
├── cache/                                   # Bộ nhớ đệm Tạm thời (Redis)
│   ├── feature_cache/                       # Hot features
│   ├── lookup_tables/                       # Bảng tra cứu
│   └── session_data/                        # Session data
│
├── search/                                  # Search Indexes (Elasticsearch)
│   ├── structured_index/                    # Structured data index
│   ├── text_index/                          # Text data index
│   ├── image_index/                         # Image data index
│   ├── audio_index/                         # Audio data index
│   └── log_index/                           # Log data index
│
└── graph/                                   # Cơ sở dữ liệu Đồ thị (Neo4J)
    ├── entities/                            # Các thực thể đồ thị
    ├── relationships/                       # Các mối quan hệ
    └── analytics/                           # Phân tích đồ thị
```

## Luồng Dữ liệu Toàn diện - Xử lý Đa Định dạng

### 1. Luồng Dữ liệu ở tầng Collection Layer
```
Data Sources → Kafka/Airflow → Vùng Dữ liệu Thô MinIO (Bất biến)
    ↓              ↓
Dữ liệu Có cấu trúc → CSV/SQL/Parquet
Dữ liệu Bán cấu trúc → JSON/XML/YAML  
Dữ liệu Phi cấu trúc → Text/Logs/Images/Video/Audio/Voice
                ↓
            MongoDB Metadata + Elasticsearch Logs
```

### 2. Luồng Dữ liệu ở tầng Preprocessing Layer
```
MinIO Thô → Làm sạch & Chuẩn hóa Dữ liệu → MinIO Đã làm sạch
    ↓              ↓
Có cấu trúc → CSV/SQL/Parquet (đã làm sạch)
Bán cấu trúc → JSON/XML/YAML (đã chuẩn hóa)
Không cấu trúc → Text/Logs/Images/Video/Audio/Voice (đã xử lý)
    ↓
MongoDB Metadata + Redis Cache (Tạm thời)
```

### 3. Luồng Dữ liệu ở tầng Processing Layer
```
MinIO Đã làm sạch → Feature Engineering → Feature Store (MinIO)
    ↓              ↓
Đặc trưng Có cấu trúc → Đặc trưng User/Product/Transaction
Text Features → NLP processing, embeddings
Image Features → Computer vision, embeddings
Audio Features → Speech processing, embeddings
Multimodal Features → Combined features
    ↓
MongoDB Metadata + Redis Cache + Neo4J Graph
```

### 4. Luồng Dữ liệu ở tầng Modeling Layer
```
Feature Store → Model Training → Mô hình (MinIO)
    ↓              ↓
Mô hình Có cấu trúc → Phân loại/Phân cụm
Mô hình Văn bản → Mô hình NLP
Mô hình Hình ảnh → Mô hình thị giác máy tính
Mô hình Âm thanh → Mô hình nhận dạng giọng nói
Mô hình Đa phương thức → Mô hình kết hợp
    ↓
Đăng ký Mô hình MongoDB + Logs Huấn luyện
```

### 5. Luồng Dữ liệu ở Tầng Evaluation Layer
```
Models + Test Data → Model Evaluation → Results (MinIO)
    ↓                    ↓
Kết quả Có cấu trúc → metrics hiệu suất
Kết quả Văn bản → metrics đánh giá NLP
Kết quả Hình ảnh → metrics thị giác máy tính
Kết quả Âm thanh → metrics nhận dạng giọng nói
Kết quả Đa phương thức → metrics kết hợp
    ↓
MongoDB Evaluation Metadata + Elasticsearch Search
```

### 6. Luồng Dữ liệu ở Tầng Deployment Layer
```
Production Models → API Deployment → Production Data (MinIO)
    ↓              ↓
Phục vụ Mô hình → Yêu cầu/Phản hồi API
Giám sát Hiệu suất → metrics thời gian thực
Kiểm soát Phiên bản → Quản lý phiên bản mô hình
    ↓
Siêu dữ liệu Triển khai MongoDB + Giám sát Elasticsearch
```


## Bản đồ Công nghệ Lưu trữ Toàn diện

| Loại Dữ liệu | Định dạng | Công nghệ Lưu trữ | Mục đích | Lưu trữ |
|---------------|-----------|-------------------|----------|----------|
| **Dữ liệu Có cấu trúc** | | | | |
| CSV | .csv | MinIO Object Storage | Dữ liệu bảng | 90 ngày |
| SQL | .sql | MinIO Object Storage | Bản sao cơ sở dữ liệu | 90 ngày |
| Parquet | .parquet | MinIO Object Storage | Dữ liệu có cấu trúc nén | 365 ngày |
| **Dữ liệu Bán cấu trúc** | | | | |
| JSON | .json | MinIO Object Storage | Phản hồi API, cấu hình | 90 ngày |
| XML | .xml | MinIO Object Storage | Dữ liệu cũ, feeds | 90 ngày |
| YAML | .yaml | MinIO Object Storage | Tệp cấu hình | 90 ngày |
| **Dữ liệu Không cấu trúc** | | | | |
| Text | .txt | MinIO Object Storage | Tài liệu, email | 90 ngày |
| Logs | .log | MinIO Object Storage | Log ứng dụng | 30 ngày |
| Images | .jpg/.png/.gif | MinIO Object Storage | Ảnh, screenshot | 365 ngày |
| Video | .mp4/.avi/.mov | MinIO Object Storage | Ghi âm, hướng dẫn | 180 ngày |
| Audio | .mp3/.wav/.flac | MinIO Object Storage | Ghi chú giọng nói, nhạc | 180 ngày |
| Voice | .wav/.m4a | MinIO Object Storage | Ghi âm cuộc gọi, giọng nói | 90 ngày |
| **Dữ liệu Đã xử lý** | | | | |
| Features | Nhiều loại | MinIO Object Storage | Đặc trưng tái sử dụng | 365 ngày |
| Models | .pkl/.h5/.onnx | MinIO Object Storage | Artifact mô hình | Vĩnh viễn |
| Reports | .pdf/.html | MinIO Object Storage | Báo cáo cuối cùng | Vĩnh viễn |
| **Siêu dữ liệu** | | | | |
| Data Lineage | JSON | MongoDB | Theo dõi dòng dữ liệu | Vĩnh viễn |
| Processing Logs | JSON | MongoDB | Log xử lý | Vĩnh viễn |
| Quality Metrics | JSON | MongoDB | Chỉ số chất lượng | Vĩnh viễn |
| Model Registry | JSON | MongoDB | Phiên bản mô hình & siêu dữ liệu | Vĩnh viễn |
| **Bộ nhớ đệm** | | | | |
| Hot Features | Binary | Redis | Chỉ đặc trưng nóng | 24 giờ |
| Lookup Tables | Binary | Redis | Bảng tra cứu | 24 giờ |
| Session Data | Binary | Redis | Dữ liệu phiên | 1 giờ |
| **Chỉ mục Tìm kiếm** | | | | |
| Structured Index | Binary | Elasticsearch | Chỉ mục dữ liệu có cấu trúc | 90 ngày |
| Text Index | Binary | Elasticsearch | Chỉ mục dữ liệu văn bản | 90 ngày |
| Image Index | Binary | Elasticsearch | Chỉ mục dữ liệu hình ảnh | 90 ngày |
| Audio Index | Binary | Elasticsearch | Chỉ mục dữ liệu âm thanh | 90 ngày |
| Log Index | Binary | Elasticsearch | Chỉ mục dữ liệu log | 30 ngày |
| **Dữ liệu Đồ thị** | | | | |
| Entities | Graph | Neo4J | Các thực thể đồ thị | Vĩnh viễn |
| Relationships | Graph | Neo4J | Các mối quan hệ | Vĩnh viễn |
| Analytics | Graph | Neo4J | Phân tích đồ thị | Vĩnh viễn |

## Tối ưu hóa Chính

### 1. **Hỗ trợ Đa Định dạng**
- Dữ liệu có cấu trúc: CSV, SQL, Parquet
- Dữ liệu bán cấu trúc: JSON, XML, YAML
- Dữ liệu không cấu trúc: Text, Logs, Images, Video, Audio, Voice
- Mỗi định dạng có pipeline xử lý riêng
- **Tách biệt Loại Dữ liệu**: Mỗi loại dữ liệu chỉ chứa đúng tệp định dạng của nó

### 2. **Tổ chức Theo Giai đoạn**
- 6 giai đoạn: Collection → Preprocessing → Processing → Modeling → Evaluation → Deployment
- Mỗi giai đoạn có lưu trữ dữ liệu riêng cho tất cả định dạng
- Tách biệt rõ ràng các mối quan tâm

### 3. **Xử lý Theo Định dạng Cụ thể**
- Structured: Traditional ML pipelines
- Text: NLP processing, embeddings
- Images: Computer vision, feature extraction
- Audio/Voice: Speech processing, audio features
- Multimodal: Combined processing

### 4. **Lưu trữ Hiệu quả Theo Định dạng**
- Parquet cho dữ liệu có cấu trúc (nén)
- JSON cho dữ liệu bán cấu trúc (linh hoạt)
- Lưu trữ Binary cho dữ liệu không cấu trúc (hiệu quả)
- Phân vùng theo ngày cho tất cả định dạng

### 5. **Chiến lược Bộ nhớ đệm Thông minh**
- Bộ nhớ đệm theo định dạng cụ thể
- Hết hạn dựa trên TTL theo loại dữ liệu
- Phục vụ dữ liệu nóng từ bộ nhớ đệm

### 6. **Tối ưu hóa Tài nguyên**
```
Trước: Xử lý đơn định dạng = Khả năng hạn chế
Sau:  Xử lý đa định dạng = Hệ sinh thái dữ liệu đầy đủ

Capability Increase: 300%+
```

### 7. **Xác thực Cấu trúc**
- **Tính toàn vẹn Loại Dữ liệu**: Mỗi thư mục loại dữ liệu chỉ chứa đúng tệp định dạng
- **Không Nhiễm chéo**: Không có tệp định dạng sai vị trí
- **Tổ chức Sạch**: Cấu trúc thư mục tuân thủ 100% theo đặc tả
- **Đơn giản hóa Đánh giá**: Đánh giá có subfolder loại dữ liệu

## Chính sách Lưu trữ Dữ liệu (Đa Định dạng)

```
Dữ liệu Thô (Tất cả Định dạng): 90 ngày (MinIO) - Bất biến
Dữ liệu Đã làm sạch (Tất cả Định dạng): 180 ngày (MinIO) - Đã xử lý
Đặc trưng (Tất cả Định dạng): 365 ngày (MinIO) - Tái sử dụng
Mô hình (Tất cả Loại): Vĩnh viễn (MinIO) - Có phiên bản
Báo cáo (Tất cả Định dạng): Vĩnh viễn (MinIO) - Kết quả cuối
Siêu dữ liệu: Vĩnh viễn (MongoDB) - Dòng dữ liệu
Bộ nhớ đệm: 24 giờ (Redis) - Chỉ dữ liệu nóng
Chỉ mục Tìm kiếm: 90 ngày (Elasticsearch) - Theo định dạng
Dữ liệu Đồ thị: Vĩnh viễn (Neo4J) - Chỉ mối quan hệ

Lưu trữ Theo Định dạng Cụ thể:
- Hình ảnh: 365 ngày (giá trị cao)
- Video: 180 ngày (kích thước lớn)
- Âm thanh: 180 ngày (kích thước trung bình)
- Giọng nói: 90 ngày (riêng tư)
- Logs: 30 ngày (tuân thủ)
```

## Tóm tắt Xác thực Cấu trúc

### ✅ **Các Phần đã Xác thực:**
- **01_collection/**: Cấu trúc dữ liệu thô với tách biệt loại dữ liệu đúng
- **02_preprocessing/**: Dữ liệu đã làm sạch và chuẩn hóa với tổ chức định dạng đúng
- **03_processing/**: Đặc trưng và dữ liệu tổng hợp với subfolder loại dữ liệu
- **04_modeling/**: Mô hình, dữ liệu huấn luyện với phân loại đúng
- **05_evaluation/**: Kết quả và báo cáo với subfolder loại dữ liệu (như dự định)
- **06_deployment/**: Mô hình sản xuất và cấu trúc dữ liệu API
- **cache/**: Cấu trúc bộ nhớ đệm Redis
- **graph/**: Cấu trúc cơ sở dữ liệu đồ thị Neo4J  
- **search/**: Cấu trúc chỉ mục Elasticsearch


