# BullReckon API Server - Postman Testing Guide

## Overview

The API server has two types of endpoints:

1. **API Key Management** (JWT Protected) - For generating and managing API keys
2. **Market Data & Trading** (API Key Protected) - For accessing market data and executing trades

## Base URL

```
http://localhost:3004
```

## 1. API Key Management (JWT Authentication Required)

### 1.1 Generate API Key

```http
POST {{baseUrl}}/api/keys/generate
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
    "expiresInDays": 30
}
```

**Response:**

```json
{
  "success": true,
  "message": "API key generated successfully",
  "data": {
    "id": "670123456789abcdef123456",
    "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    "expiresAt": "2025-11-03T12:00:00.000Z",
    "createdAt": "2025-10-04T12:00:00.000Z",
    "warning": "Save this public key securely. You will need it for API requests."
  }
}
```

### 1.2 Get User API Keys

```http
GET {{baseUrl}}/api/keys
Authorization: Bearer {{jwt_token}}
```

### 1.3 Revoke API Key

```http
DELETE {{baseUrl}}/api/keys/{{keyId}}
Authorization: Bearer {{jwt_token}}
```

## 2. Market Data & Trading (API Key Authentication Required)

### Authentication Headers Required:

- `x-api-email`: Your email address
- `x-api-key`: The public key from API key generation
- `x-api-signature`: Base64 encoded signature (see signature generation below)
- `x-api-timestamp`: Current timestamp in milliseconds

### Signature Generation

Create a signature using the following message format:

```
message = email + ":" + timestamp + ":" + method + ":" + path
```

#### Method 1: Node.js Script (Recommended)

Create a file `generate-signature.js`:

```javascript
const crypto = require("crypto");

// Your private key (keep this secret!)
const privateKey = `-----BEGIN PRIVATE KEY-----
YOUR_PRIVATE_KEY_HERE
-----END PRIVATE KEY-----`;

function generateSignature(email, timestamp, method, path, privateKey) {
  const message = `${email}:${timestamp}:${method}:${path}`;
  const signer = crypto.createSign("SHA256");
  signer.update(message);
  signer.end();
  return signer.sign(privateKey, "base64");
}

// Generate current timestamp
const timestamp = Date.now().toString();

// Your API request details
const email = "user@example.com";
const method = "GET";
const path = "/api/market/quote/BTCUSDT";

// Generate signature
const signature = generateSignature(email, timestamp, method, path, privateKey);

console.log("Headers for your API request:");
console.log(`x-api-email: ${email}`);
console.log(`x-api-timestamp: ${timestamp}`);
console.log(`x-api-signature: ${signature}`);
```

Run with: `node generate-signature.js`

#### Method 2: Postman Pre-request Script

Add this to your Postman request's **Pre-request Script** tab:

```javascript
// Set your private key here (or use environment variable)
const privateKey =
  pm.environment.get("private_key") ||
  `-----BEGIN PRIVATE KEY-----
YOUR_PRIVATE_KEY_HERE
-----END PRIVATE KEY-----`;

// Generate current timestamp
const timestamp = Date.now().toString();

// Get request details
const email = pm.environment.get("api_email") || "user@example.com";
const method = pm.request.method;
const url = pm.request.url.toString();
const path = url.replace(/^https?:\/\/[^\/]+/, ""); // Extract path from full URL

// Create message to sign
const message = `${email}:${timestamp}:${method}:${path}`;

// Generate signature (using CryptoJS which is available in Postman)
const signature = CryptoJS.SHA256(message).toString(CryptoJS.enc.Base64);

// Set variables
pm.environment.set("current_timestamp", timestamp);
pm.environment.set("generated_signature", signature);

console.log("Generated headers:");
console.log("x-api-email:", email);
console.log("x-api-timestamp:", timestamp);
console.log("x-api-signature:", signature);
```

#### Method 3: Manual Generation

1. **Get current timestamp:**

   ```javascript
   // In browser console or Node.js
   console.log(Date.now().toString());
   // Example output: "1728038400000"
   ```

2. **Create message to sign:**

   ```
   user@example.com:1728038400000:GET:/api/market/quote/BTCUSDT
   ```

3. **Generate signature using your private key:**
   ```javascript
   const crypto = require("crypto");
   const message =
     "user@example.com:1728038400000:GET:/api/market/quote/BTCUSDT";
   const signer = crypto.createSign("SHA256");
   signer.update(message);
   signer.end();
   const signature = signer.sign(privateKey, "base64");
   console.log(signature);
   ```

#### Complete Example Headers

For the request: `GET http://localhost:3004/api/market/quote/BTCUSDT`

```
x-api-email: user@example.com
x-api-key: -----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----
x-api-timestamp: 1728038400000
x-api-signature: mB8X9vK2Lp4R7sQ1wE3tY6uI0oP5aN2cV8bN4mZ7xS1pL9wQ2eR5tY8uI1oP4aN7c...
```

#### Getting Your Private Key

If you don't have a private key yet, generate a key pair:

```javascript
const crypto = require("crypto");

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

console.log("PUBLIC KEY (use when generating API key):");
console.log(publicKey);
console.log("\nPRIVATE KEY (keep secret, use for signatures):");
console.log(privateKey);
```

### 2.1 Get Stock Quote

```http
GET {{baseUrl}}/api/market/quote/BTCUSDT
x-api-email: user@example.com
x-api-key: -----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----
x-api-signature: {{generated_signature}}
x-api-timestamp: {{current_timestamp}}
```

### 2.2 Get Historical Data

```http
GET {{baseUrl}}/api/market/historical/BTCUSDT?period=1d
x-api-email: user@example.com
x-api-key: {{public_key}}
x-api-signature: {{generated_signature}}
x-api-timestamp: {{current_timestamp}}
```

**Available periods:** `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`, `1M`

### 2.3 Get Company Information

```http
GET {{baseUrl}}/api/market/company/AAPL
x-api-email: user@example.com
x-api-key: {{public_key}}
x-api-signature: {{generated_signature}}
x-api-timestamp: {{current_timestamp}}
```

### 2.4 Execute Trade

```http
POST {{baseUrl}}/api/trade
x-api-email: user@example.com
x-api-key: {{public_key}}
x-api-signature: {{generated_signature}}
x-api-timestamp: {{current_timestamp}}
Content-Type: application/json

{
    "symbol": "BTCUSDT",
    "action": "BUY",
    "quantity": 0.5,
    "price": 50000
}
```

**Required fields:**

- `symbol`: Trading symbol (e.g., "BTCUSDT", "AAPL")
- `action`: "BUY" or "SELL"
- `quantity`: Amount to trade (number)

**Optional fields:**

- `price`: Specific price for limit order (number)

## 3. Complete Postman Collection JSON

```json
{
  "info": {
    "name": "BullReckon API Server",
    "description": "API endpoints for BullReckon trading platform",
    "version": "1.0.0"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3004"
    },
    {
      "key": "jwt_token",
      "value": "your_jwt_token_here"
    },
    {
      "key": "api_email",
      "value": "user@example.com"
    },
    {
      "key": "public_key",
      "value": "your_public_key_here"
    }
  ],
  "item": [
    {
      "name": "API Key Management",
      "item": [
        {
          "name": "Generate API Key",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n    \"expiresInDays\": 30\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/keys/generate",
              "host": ["{{baseUrl}}"],
              "path": ["api", "keys", "generate"]
            }
          }
        },
        {
          "name": "Get API Keys",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/keys",
              "host": ["{{baseUrl}}"],
              "path": ["api", "keys"]
            }
          }
        },
        {
          "name": "Revoke API Key",
          "request": {
            "method": "DELETE",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{jwt_token}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/keys/{{keyId}}",
              "host": ["{{baseUrl}}"],
              "path": ["api", "keys", "{{keyId}}"]
            }
          }
        }
      ]
    },
    {
      "name": "Market Data",
      "item": [
        {
          "name": "Get Quote",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "x-api-email",
                "value": "{{api_email}}"
              },
              {
                "key": "x-api-key",
                "value": "{{public_key}}"
              },
              {
                "key": "x-api-signature",
                "value": "{{$randomAlphaNumeric}}"
              },
              {
                "key": "x-api-timestamp",
                "value": "{{$timestamp}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/market/quote/BTCUSDT",
              "host": ["{{baseUrl}}"],
              "path": ["api", "market", "quote", "BTCUSDT"]
            }
          }
        },
        {
          "name": "Get Historical Data",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "x-api-email",
                "value": "{{api_email}}"
              },
              {
                "key": "x-api-key",
                "value": "{{public_key}}"
              },
              {
                "key": "x-api-signature",
                "value": "{{$randomAlphaNumeric}}"
              },
              {
                "key": "x-api-timestamp",
                "value": "{{$timestamp}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/market/historical/BTCUSDT?period=1d",
              "host": ["{{baseUrl}}"],
              "path": ["api", "market", "historical", "BTCUSDT"],
              "query": [
                {
                  "key": "period",
                  "value": "1d"
                }
              ]
            }
          }
        },
        {
          "name": "Get Company Info",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "x-api-email",
                "value": "{{api_email}}"
              },
              {
                "key": "x-api-key",
                "value": "{{public_key}}"
              },
              {
                "key": "x-api-signature",
                "value": "{{$randomAlphaNumeric}}"
              },
              {
                "key": "x-api-timestamp",
                "value": "{{$timestamp}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/market/company/AAPL",
              "host": ["{{baseUrl}}"],
              "path": ["api", "market", "company", "AAPL"]
            }
          }
        }
      ]
    },
    {
      "name": "Trading",
      "item": [
        {
          "name": "Execute Buy Trade",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "x-api-email",
                "value": "{{api_email}}"
              },
              {
                "key": "x-api-key",
                "value": "{{public_key}}"
              },
              {
                "key": "x-api-signature",
                "value": "{{$randomAlphaNumeric}}"
              },
              {
                "key": "x-api-timestamp",
                "value": "{{$timestamp}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n    \"symbol\": \"BTCUSDT\",\n    \"action\": \"BUY\",\n    \"quantity\": 0.5,\n    \"price\": 50000\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/trade",
              "host": ["{{baseUrl}}"],
              "path": ["api", "trade"]
            }
          }
        },
        {
          "name": "Execute Sell Trade",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "x-api-email",
                "value": "{{api_email}}"
              },
              {
                "key": "x-api-key",
                "value": "{{public_key}}"
              },
              {
                "key": "x-api-signature",
                "value": "{{$randomAlphaNumeric}}"
              },
              {
                "key": "x-api-timestamp",
                "value": "{{$timestamp}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n    \"symbol\": \"BTCUSDT\",\n    \"action\": \"SELL\",\n    \"quantity\": 0.3\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/trade",
              "host": ["{{baseUrl}}"],
              "path": ["api", "trade"]
            }
          }
        }
      ]
    }
  ]
}
```

## 4. Testing Workflow

### Step 1: Get JWT Token

First, authenticate with the auth server to get a JWT token:

```http
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "your_password"
}
```

### Step 2: Generate API Key

Use the JWT token to generate an API key:

```http
POST http://localhost:3004/api/keys/generate
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
    "expiresInDays": 30
}
```

Save the returned `publicKey` for API authentication.

### Step 3: Use API Key for Market Data

Generate signature and make API calls using the API key authentication.

## 5. Rate Limiting

- Default rate limit: 15 requests per minute per API key
- Rate limit resets every minute
- 429 status code returned when rate limit exceeded

## 6. Error Responses

### Authentication Errors:

```json
{
  "success": false,
  "message": "Missing required headers: x-api-email, x-api-key, x-api-signature, x-api-timestamp",
  "statusCode": 401
}
```

### Rate Limit Error:

```json
{
  "success": false,
  "message": "Rate limit exceeded. Max 15 requests per minute",
  "statusCode": 429
}
```

### Validation Error:

```json
{
  "success": false,
  "message": "Symbol is required",
  "statusCode": 400
}
```
