data-pipeline/
├── dataset/                    # Dữ liệu (đã có)
│
├── services/                    # Microservices architecture
│   │
│   ├── collection-service/     # TypeScript - Crawlee, Web Scraping
│   │   ├── src/
│   │   │   ├── crawlers/
│   │   │   │   ├── crawlee/
│   │   │   │   │   └── articleCrawler.ts
│   │   │   │   └── selenium/
│   │   │   │       └── dynamicCrawler.ts
│   │   │   ├── kafka/
│   │   │   │   ├── producers/
│   │   │   │   │   └── urlProducer.ts
│   │   │   │   └── consumers/
│   │   │   │       └── taskConsumer.ts
│   │   │   └── storage/
│   │   │       └── minioClient.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   ├── preprocessing-service/ # Python - Data Cleaning
│   │   ├── src/
│   │   │   ├── cleaners/
│   │   │   │   ├── structured_cleaner.py
│   │   │   │   ├── text_cleaner.py
│   │   │   │   └── image_cleaner.py
│   │   │   ├── normalizers/
│   │   │   │   └── data_normalizer.py
│   │   │   └── kafka/
│   │   │       └── consumer.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── processing-service/     # Python - Feature Engineering
│   │   ├── src/
│   │   │   ├── feature_engineering/
│   │   │   │   ├── user_features.py
│   │   │   │   └── product_features.py
│   │   │   └── aggregators/
│   │   │       └── time_aggregator.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── modeling-service/       # Python - ML/AI
│   │   ├── src/
│   │   │   ├── trainers/
│   │   │   │   ├── classification/
│   │   │   │   └── clustering/
│   │   │   └── models/
│   │   │       └── model_registry.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── evaluation-service/     # Python - Model Evaluation
│   │   ├── src/
│   │   │   ├── evaluators/
│   │   │   │   └── model_evaluator.py
│   │   │   └── report_generators/
│   │   │       └── report_generator.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   └── api-service/            # TypeScript - REST API
│       ├── src/
│       │   ├── routes/
│       │   │   ├── collection.ts
│       │   │   ├── models.ts
│       │   │   └── predictions.ts
│       │   ├── services/
│       │   │   └── modelService.ts
│       │   └── app.ts
│       ├── package.json
│       └── Dockerfile
│
├── shared/                      # Shared code & configs
│   ├── types/                   # TypeScript types (dùng chung)
│   │   ├── data.types.ts
│   │   ├── kafka.types.ts
│   │   └── api.types.ts
│   ├── schemas/                 # JSON schemas (dùng chung)
│   │   ├── data.schema.json
│   │   └── api.schema.json
│   ├── config/                  # Config files
│   │   ├── kafka.config.ts
│   │   ├── kafka.config.py
│   │   └── database.config.yaml
│   └── proto/                   # gRPC definitions (nếu dùng)
│       └── data.proto
│
├── scripts/                     # Utility scripts
│   ├── setup.sh
│   └── deploy.sh
│
├── docker-compose.yml           # Orchestration
├── kubernetes/                  # K8s configs (optional)
└── README.md