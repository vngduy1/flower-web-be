# 🌸 Flower Web Backend

Backend cho hệ thống **Website bán hoa** được xây dựng bằng **NestJS**, **TypeScript**, **TypeORM** và **MySQL**.

Dự án cung cấp đầy đủ REST API cho khách hàng và quản trị viên, bao gồm quản lý sản phẩm, đơn hàng, kho, người dùng, mã giảm giá, thanh toán, đánh giá, email và dashboard thống kê.

---

# Công nghệ sử dụng

- NestJS
- TypeScript
- TypeORM
- MySQL 8
- JWT Authentication
- class-validator
- Nodemailer
- REST API

---

# Chức năng đã xây dựng

## Khách hàng

- Đăng ký
- Đăng nhập
- Hồ sơ cá nhân
- Quản lý địa chỉ
- Xem danh sách sản phẩm
- Tìm kiếm sản phẩm
- Giỏ hàng
- Thanh toán
- Áp dụng mã giảm giá
- Đặt hàng
- Lịch sử đơn hàng
- Hủy đơn hàng
- Đánh giá sản phẩm
- Thông báo

---

## Quản trị viên

- Dashboard
- Quản lý sản phẩm
- Quản lý danh mục
- Quản lý tồn kho
- Quản lý đơn hàng
- Quản lý người dùng
- Quản lý đánh giá
- Quản lý mã giảm giá
- Gửi Email

---

# Cấu trúc dự án

```text
src
├── auth
├── users
├── roles
├── products
├── product-images
├── categories
├── inventories
├── carts
├── checkout
├── orders
├── payments
├── coupons
├── reviews
├── notifications
├── addresses
├── dashboard
├── deliveries
└── common
```

---

# Yêu cầu

- NodeJS 20 trở lên
- MySQL 8
- npm

---

# Cài đặt

Clone project

```bash
git clone https://github.com/vngduy1/flower-web-be.git

cd flower-web-be

npm install
```

---

# Cấu hình môi trường

Tạo file `.env`

Ví dụ

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=flower_db

JWT_SECRET=your-secret-key

SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
```

---

# Chạy dự án

Chế độ Development

```bash
npm run start:dev
```

Chế độ Production

```bash
npm run build
npm run start:prod
```

---

# Kiểm thử

```bash
npm run test

npm run test:e2e

npm run test:cov
```

---

# API

Mặc định API chạy tại

```
http://localhost:3000/api
```

Ví dụ

```
POST /api/auth/register

POST /api/auth/login

GET /api/products

GET /api/categories

POST /api/cart/items

POST /api/orders

GET /api/orders

GET /api/admin/dashboard
```

---

# Frontend

Frontend được phát triển riêng bằng **Next.js**.

Repository:

```
flower-web-fe
```

---

# Tiến độ

- ✅ Xác thực người dùng
- ✅ Quản lý người dùng
- ✅ Quản lý sản phẩm
- ✅ Quản lý danh mục
- ✅ Quản lý tồn kho
- ✅ Giỏ hàng
- ✅ Thanh toán
- ✅ Đơn hàng
- ✅ Mã giảm giá
- ✅ Đánh giá
- ✅ Dashboard
- ✅ Email Service
- ⏳ Lịch giao hàng
- ⏳ Frontend Next.js

---

# Mục tiêu

Đây là dự án thực hành mô phỏng hệ thống bán hoa thương mại điện tử, được xây dựng nhằm:

- Học và thực hành NestJS
- Thiết kế REST API theo mô hình thực tế
- Áp dụng JWT Authentication
- Quản lý nghiệp vụ bán hàng
- Kết nối Frontend Next.js
- Làm Portfolio Backend Developer

---

# License

Dự án được phát triển cho mục đích học tập và xây dựng portfolio.
