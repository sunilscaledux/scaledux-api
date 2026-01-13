# Company Detail Module

Complete company profile management system for ScaleDux API.

## 📋 Overview

This module provides comprehensive company profile management with support for:
- Company information (name, tagline, description)
- Company branding (logo, cover image)
- Business details (industry, size, location)
- Funding information (stage, amount, seeking status)
- Problem-solution fit and target market
- Revenue and business models

## 🗄️ Database Schema

### CompanyDetail Model
```prisma
model CompanyDetail {
  id                    Int       @id @default(autoincrement())
  user_id               Int       @unique
  company_name          String
  company_tagline       String?
  company_logo          String?
  company_cover_image   String?
  year_founded          Int?
  company_size          String?
  headquarters          String?
  company_location      String?
  company_website       String?
  industry              String?
  company_type          String?
  description           String?
  problem_statement     String?
  solution              String?
  target_market         String?
  unique_value_prop     String?
  business_model        String?
  revenue_model         String?
  funding_stage         String?
  total_funding         Float?
  seeking_funding       Boolean   @default(false)
  funding_amount        Float?
  currency_id           Int?
  country_id            Int?
  state_id              Int?
  social_links          Json?
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt
}
```

## 🚀 Setup Instructions

### 1. Run Prisma Migration

```bash
cd scaleDux-api
npx prisma migrate dev --name add_company_detail
npx prisma generate
```

### 2. Create Upload Directories

```bash
mkdir -p uploads/company/logos
mkdir -p uploads/company/covers
```

### 3. Restart Server

The routes are already registered in `server.ts`. Just restart the server:

```bash
npm run dev
```

## 📡 API Endpoints

### Base URL: `/api/v1/company`

### 1. Create Company Detail
**POST** `/api/v1/company`

**Auth Required:** Yes

**Request Body:**
```json
{
  "company_name": "TechCorp Inc.",
  "company_tagline": "Innovating the future",
  "year_founded": 2020,
  "company_size": "11-50",
  "headquarters": "San Francisco, CA",
  "company_location": "USA",
  "company_website": "https://techcorp.com",
  "industry": "Technology",
  "company_type": "Startup",
  "description": "We build innovative solutions...",
  "problem_statement": "Current solutions are inefficient...",
  "solution": "Our platform provides...",
  "target_market": "B2B SaaS companies",
  "unique_value_prop": "AI-powered automation",
  "business_model": "Subscription-based",
  "revenue_model": "Monthly recurring revenue",
  "funding_stage": "Seed",
  "total_funding": 1000000,
  "seeking_funding": true,
  "funding_amount": 5000000,
  "currency_id": 1,
  "country_id": 1,
  "state_id": 1,
  "social_links": {
    "linkedin": "https://linkedin.com/company/techcorp",
    "twitter": "https://twitter.com/techcorp",
    "facebook": "https://facebook.com/techcorp"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Company detail created successfully",
  "data": { /* CompanyDetail object */ }
}
```

---

### 2. Get My Company Detail
**GET** `/api/v1/company/me`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "company_name": "TechCorp Inc.",
    "company_tagline": "Innovating the future",
    "company_logo": "/uploads/company/logos/logo-123.png",
    "company_cover_image": "/uploads/company/covers/cover-456.jpg",
    /* ... other fields ... */
    "currency": {
      "id": 1,
      "name": "US Dollar",
      "code": "USD",
      "symbol": "$"
    },
    "country": {
      "id": 1,
      "name": "United States",
      "code": "US",
      "flag": "🇺🇸"
    }
  }
}
```

---

### 3. Get Company Detail by User ID
**GET** `/api/v1/company/user/:userId`

**Auth Required:** No (Public)

**Response:** Same as "Get My Company Detail"

---

### 4. Update Company Detail
**PATCH** `/api/v1/company`

**Auth Required:** Yes

**Request Body:** (All fields optional)
```json
{
  "company_tagline": "Updated tagline",
  "description": "Updated description",
  "seeking_funding": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Company detail updated successfully",
  "data": { /* Updated CompanyDetail object */ }
}
```

---

### 5. Delete Company Detail
**DELETE** `/api/v1/company`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "message": "Company detail deleted successfully"
}
```

---

### 6. Upload Company Logo
**POST** `/api/v1/company/logo`

**Auth Required:** Yes

**Content-Type:** `multipart/form-data`

**Form Data:**
- `logo`: Image file (PNG, JPG, etc.)

**Constraints:**
- Max size: 5MB
- File type: Images only

**Response:**
```json
{
  "success": true,
  "message": "Company logo uploaded successfully",
  "data": { /* Updated CompanyDetail with new logo URL */ }
}
```

---

### 7. Upload Company Cover Image
**POST** `/api/v1/company/cover`

**Auth Required:** Yes

**Content-Type:** `multipart/form-data`

**Form Data:**
- `cover`: Image file (PNG, JPG, etc.)

**Constraints:**
- Max size: 10MB
- File type: Images only

**Response:**
```json
{
  "success": true,
  "message": "Company cover image uploaded successfully",
  "data": { /* Updated CompanyDetail with new cover URL */ }
}
```

---

### 8. Get All Companies (Paginated)
**GET** `/api/v1/company/all?page=1&limit=10`

**Auth Required:** No (Public)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [ /* Array of CompanyDetail objects */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

## 📝 Validation Rules

### Company Size Options:
- `1-10`
- `11-50`
- `51-200`
- `201-500`
- `501-1000`
- `1000+`

### Company Type Options:
- `Startup`
- `SME`
- `Enterprise`
- `Non-profit`
- `Government`

### Funding Stage Options:
- `Pre-seed`
- `Seed`
- `Series A`
- `Series B`
- `Series C`
- `Series D+`
- `IPO`
- `Acquired`
- `Bootstrapped`

## 🔧 Usage Examples

### Frontend Integration (React/Next.js)

```typescript
// Create company detail
const createCompany = async (data: CreateCompanyDetailDto) => {
  const response = await fetch('/api/v1/company', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });
  return response.json();
};

// Upload company logo
const uploadLogo = async (file: File) => {
  const formData = new FormData();
  formData.append('logo', file);
  
  const response = await fetch('/api/v1/company/logo', {
    method: 'POST',
    credentials: 'include',
    body: formData
  });
  return response.json();
};

// Get company detail
const getMyCompany = async () => {
  const response = await fetch('/api/v1/company/me', {
    credentials: 'include'
  });
  return response.json();
};
```

## 🔐 Security

- All write operations require authentication
- File uploads are validated for type and size
- User can only manage their own company detail
- Public endpoints allow viewing company profiles

## 📂 File Structure

```
src/module/company/
├── CompanyController.ts    # Request handlers
├── CompanyService.ts        # Business logic
├── CompanyValidation.ts     # Joi validation schemas
├── CompanyType.d.ts         # TypeScript types
├── CompanyRoute.ts          # Express routes
└── README.md                # This file
```

## 🧪 Testing

```bash
# Create company
curl -X POST http://localhost:4001/api/v1/company \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -d '{"company_name":"Test Corp","company_tagline":"Testing"}'

# Get company
curl http://localhost:4001/api/v1/company/me \
  -H "Cookie: auth_token=YOUR_TOKEN"

# Upload logo
curl -X POST http://localhost:4001/api/v1/company/logo \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -F "logo=@/path/to/logo.png"
```

## 🚨 Next Steps

1. **Run the migration:**
   ```bash
   npx prisma migrate dev --name add_company_detail
   npx prisma generate
   ```

2. **Update frontend types** in `scaledux-ui/hook/auth/type.d.ts` (Already done)

3. **Create company profile forms** in the UI

4. **Test all endpoints** with Postman or curl

5. **Add company detail to user profile response** (optional)

## 📞 Support

For issues or questions, contact the development team.
