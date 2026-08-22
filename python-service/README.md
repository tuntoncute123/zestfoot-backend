# ZestFoot Python AI & ML Microservice

Microservice xử lý tính toán Machine Learning (Dự báo nhu cầu, Phân nhóm RFM, Gợi ý sản phẩm Collaborative Filtering) và tích hợp AI Chatbot thông qua Ollama (Model `qwen2.5:3b`).

## 1. Tính năng chính
- **Ollama AI Chatbot (`/api/chat`)**: Kết nối đến local Ollama engine, tư vấn sản phẩm thông minh bằng tiếng Việt.
- **Dự báo nhu cầu (`/api/ml/analytics`)**: Phân tích xu hướng và dự đoán doanh số, nhu cầu tồn kho sản phẩm.
- **Phân nhóm khách hàng RFM**: Chấm điểm Recency, Frequency, Monetary để đưa ra chiến lược chiết khấu mục tiêu.
- **Hệ thống gợi ý sản phẩm (`/api/ml/recommend`)**: Đề xuất sản phẩm cá nhân hóa theo hành vi mua sắm của người dùng.
- **Health Check (`/health`, `/api/test-status`)**: Báo cáo trạng thái hoạt động cho hệ thống NestJS và Admin Dashboard.

## 2. Cài đặt và Chạy

### Yêu cầu
- Python 3.10+
- Ollama đã cài đặt và chạy (Ví dụ: `ollama run qwen2.5:3b`)

### Cài đặt thư viện
```bash
pip install -r requirements.txt
```

### Khởi chạy microservice
```bash
python app_service.py
```
*(Server chạy tại `http://127.0.0.1:8000`)*

## 3. Biến môi trường
Cấu hình trong `.env` hoặc kế thừa từ backend root `.env`:
- `OLLAMA_BASE_URL`: Địa chỉ Ollama server (mặc định: `http://localhost:11434`)
- `OLLAMA_MODEL`: Model Ollama sử dụng (mặc định: `qwen2.5:3b`)
- `NEXT_PUBLIC_API_URL`: URL NestJS REST API (mặc định: `http://localhost:3001`)
