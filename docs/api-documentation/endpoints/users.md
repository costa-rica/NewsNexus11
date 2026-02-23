# Users API

This router handles user authentication and management operations.

All endpoints are prefixed with `/users`.

## POST /users/register

Register a new user account.

- Does not require authentication
- Rate limited (registerLimiter)
- Automatically creates an EntityWhoFoundArticle record for the new user
- Returns a JWT token upon successful registration

### Parameters

- `email` (string, required): User's email address
- `password` (string, required): User's password (will be hashed with bcrypt)

### Sample Request

```bash
curl --location 'http://localhost:3000/users/register' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "user@example.com",
  "password": "securePassword123"
}'
```

### Sample Response

```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "user",
    "email": "user@example.com",
    "isAdmin": false,
    "id": 1
  }
}
```

### Error Responses

#### Missing required fields (400)

```json
{
  "error": "Missing email, password"
}
```

#### User already exists (400)

```json
{
  "error": "User already exists"
}
```

## POST /users/login

Authenticate a user and receive a JWT token.

- Does not require authentication
- Rate limited (loginLimiter)

### Parameters

- `email` (string, required): User's email address
- `password` (string, required): User's password

### Sample Request

```bash
curl --location 'http://localhost:3000/users/login' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "user@example.com",
  "password": "securePassword123"
}'
```

### Sample Response

```json
{
  "message": "User logged in successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "user",
    "email": "user@example.com",
    "isAdmin": false,
    "id": 1
  }
}
```

### Error Responses

#### Missing required fields (400)

```json
{
  "error": "Missing email, password"
}
```

#### User not found (400)

```json
{
  "error": "User not found"
}
```

#### Invalid password (400)

```json
{
  "error": "Invalid password"
}
```

## POST /users/request-password-reset

Request a password reset email with a reset token.

- Does not require authentication
- Rate limited (passwordResetLimiter)
- Sends an email with a reset link valid for 5 hours

### Parameters

- `email` (string, required): User's email address

### Sample Request

```bash
curl --location 'http://localhost:3000/users/request-password-reset' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "user@example.com"
}'
```

### Sample Response

```json
{
  "result": true,
  "message": "Password reset email sent"
}
```

### Error Responses

#### User not found (404)

```json
{
  "result": false,
  "message": "User not found"
}
```

#### Email service not configured (503)

```json
{
  "result": false,
  "error": "Email service is not configured. Please contact the administrator."
}
```

#### Email authentication failed (503)

```json
{
  "result": false,
  "error": "Email service authentication failed. Please contact the administrator."
}
```

#### General email error (500)

```json
{
  "result": false,
  "error": "Failed to send password reset email. Please try again later."
}
```

## POST /users/reset-password/:token

Reset a user's password using a valid reset token.

- Does not require authentication
- Token must be valid and not expired (5 hour expiration)

### Parameters

- `token` (string, required, URL parameter): JWT reset token from the password reset email
- `newPassword` (string, required, body): New password for the user

### Sample Request

```bash
curl --location 'http://localhost:3000/users/reset-password/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "newPassword": "newSecurePassword456"
}'
```

### Sample Response

```json
{
  "result": true,
  "message": "Password reset successfully"
}
```

### Error Responses

#### Missing password (400)

```json
{
  "result": false,
  "error": "Password is required"
}
```

#### Invalid token (400)

```json
{
  "result": false,
  "error": "Invalid reset token"
}
```

#### Token expired (400)

```json
{
  "result": false,
  "error": "Reset token has expired. Please request a new password reset."
}
```

#### User not found (404)

```json
{
  "result": false,
  "message": "User not found"
}
```

#### Server error (500)

```json
{
  "result": false,
  "error": "Server error"
}
```

## DELETE /users/:id

Delete a user account by ID.

- Requires authentication (JWT token)

### Parameters

- `id` (number, required, URL parameter): User ID to delete

### Sample Request

```bash
curl --location --request DELETE 'http://localhost:3000/users/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "message": "User deleted successfully"
}
```

### Error Responses

#### User not found (404)

```json
{
  "error": "User not found"
}
```

## POST /users/update/:userId

Update user information.

- Requires authentication (JWT token)
- Only updates fields that are provided in the request body
- Password will be hashed if provided

### Parameters

- `userId` (number, required, URL parameter): User ID to update
- `username` (string, optional): New username
- `email` (string, optional): New email address
- `password` (string, optional): New password (will be hashed)
- `isAdmin` (boolean, optional): Admin status

### Sample Request

```bash
curl --location 'http://localhost:3000/users/update/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "username": "newusername",
  "email": "newemail@example.com",
  "isAdmin": true
}'
```

### Sample Response

```json
{
  "message": "Mise à jour réussie.",
  "user": {
    "id": 123,
    "username": "newusername",
    "email": "newemail@example.com",
    "isAdmin": true,
    "password": "$2b$10$...",
    "created": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Responses

#### User not found (404)

```json
{
  "error": "User not found"
}
```
