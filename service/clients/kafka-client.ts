// import os
// import traceback
//     from dotenv import load_dotenv
//     from confluent_kafka import Producer, Consumer

// load_dotenv(dotenv_path = ".env") # load tính theo path folder làm việc trên term

// KAFKA_CONFIG = {
//     'bootstrap.servers': os.getenv("KAFKA_BOOTSTRAP_SERVERS"),
//     'security.protocol': os.getenv("KAFKA_SECURITY_PROTOCOL"),
//     'sasl.mechanism': os.getenv("KAFKA_SASL_MECHANISM"),
//     'sasl.username': os.getenv("KAFKA_SASL_USERNAME"),
//     'sasl.password': os.getenv("KAFKA_SASL_PASSWORD"),
//     'ssl.ca.location': os.getenv("KAFKA_SSL_CA_LOCATION"),
//     'group.id': "data-pipeline",
//     "auto.offset.reset": "earliest",
//     "enable.auto.commit": False
// }

// class KafkaClient():
//     def __init__(self, kafka_config):
// self.kafka_config = kafka_config
        
//     def kafka_initialization(self):
// try:
// producer = Producer(self.kafka_config)
// consumer = Consumer(self.kafka_config)
// if producer and consumer:
// print(f"Kafka - [INFO] - Khởi tạo thành phần Kafka thành công")
// return producer, consumer
//         except Exception as e:
// print(f"Kafka - [ERROR] - Khởi tạo thành phần Kafka thất bại, lỗi: {e}")
// traceback.print_exc()

// if __name__ == "__main__":
//     print("[MAIN] --- Phiên test Kafka bắt đầu ---")
// try:
// print(f"[MAIN] - Kiểm tra config đầu vào: {KAFKA_CONFIG}")

// kafka_client = KafkaClient(KAFKA_CONFIG)
// producer, consumer = kafka_client.kafka_initialization()
//     except Exception as e:
// print(f"[MAIN] - Lỗi trong quá trình test Kafka, lỗi: {e}")

