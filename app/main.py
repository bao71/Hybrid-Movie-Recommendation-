from fastapi import FastAPI
from app.api.recommendation import router as recommendation_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 1. Cấu hình Middleware cho phép gọi API từ trình duyệt (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Cho phép tất cả các nguồn (hoặc ["http://127.0.0.1:5500"])
    allow_credentials=True,
    allow_methods=["*"],      # Cho phép POST, GET, OPTIONS, v.v.
    allow_headers=["*"],      # Cho phép tất cả các headers
)

# 2. Đăng ký router PHẢI nằm sau middleware
app.include_router(recommendation_router)