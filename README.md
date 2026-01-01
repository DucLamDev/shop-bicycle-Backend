# HBike Japan Backend API

RESTful API for HBike Japan e-commerce platform built with Node.js, Express.js, and MongoDB.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure your .env file
# PORT=5000
# MONGODB_URI=mongodb://localhost:27017/hbikejapan
# JWT_SECRET=your-secret-key
# FRONTEND_URL=http://localhost:3000

# Seed database with sample data
npm run seed

# Start development server
npm run dev

# Start production server
npm start
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+81-90-1234-5678"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@hbikejapan.jp",
  "password": "admin123"
}
```

### Product Endpoints

#### Get All Products
```http
GET /products?category=electric&brand=Yamaha&page=1&limit=12
```

#### Get Product by ID
```http
GET /products/:id
```

#### Create Product (Admin Only)
```http
POST /products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Product Name",
  "brand": "Yamaha",
  "category": "electric",
  "price": 85000,
  ...
}
```

### Order Endpoints

#### Create Order
```http
POST /orders
Content-Type: application/json

{
  "customer": {
    "name": "Customer Name",
    "email": "customer@example.com",
    "phone": "+81-90-1234-5678",
    "address": {...}
  },
  "items": [{
    "product": "product_id",
    "quantity": 1
  }],
  "paymentMethod": "bank_transfer"
}
```

### Partner Endpoints (Admin Only)

#### Create Partner with QR Code
```http
POST /partners
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Partner Name",
  "contactPerson": "Contact Name",
  "email": "partner@example.com",
  "phone": "+81-90-1234-5678",
  "commissionRate": 5
}
```

## 🗄️ Database Models

### User
- name, email, password (hashed)
- phone, role (admin/user)
- address

### Product
- name, brand, category
- price, condition, conditionPercentage
- specifications, replacedParts
- warranty, images, description (multi-language)

### Order
- orderNumber, customer
- items, totalAmount, shippingFee
- paymentMethod, paymentStatus, orderStatus
- partner (referral tracking)

### Partner
- name, contactPerson, email, phone
- token (unique), qrCode (base64)
- totalOrders, totalRevenue, commissionRate

## 🔒 Security

- JWT authentication
- Password hashing with bcrypt (12 rounds)
- Rate limiting (100 requests per 15 minutes)
- Helmet.js security headers
- CORS protection
- Input validation

## 📦 Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **qrcode**: QR code generation
- **helmet**: Security headers
- **cors**: CORS middleware
- **dotenv**: Environment variables
- **express-rate-limit**: Rate limiting
- **express-validator**: Input validation
- **morgan**: Request logging
- **compression**: Response compression

## 🛠️ Development

```bash
# Install nodemon for auto-restart
npm install -D nodemon

# Run in development mode
npm run dev
```

## 📝 Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hbikejapan
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRE=30d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## 🧪 Testing

```bash
# Seed database
npm run seed

# Test API endpoints with curl or Postman
curl http://localhost:5000/api/health
```

## 📄 License

Copyright © 2024 HBike Japan 合同会社
