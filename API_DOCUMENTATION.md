# Dating App Backend API Documentation

This document outlines the API endpoints, request payloads, response structures, and step-by-step instructions on how to test each feature.

- **Production URL:** `https://dating-app-backend-g8so.onrender.com`
- **Base Paths:**
  - Authentication: `/auth/*` (e.g. `https://dating-app-backend-g8so.onrender.com/auth/login`)
  - Resource APIs: `/api/*` (e.g. `https://dating-app-backend-g8so.onrender.com/api/profile`)

---

## Table of Contents
1. [Authentication API](#1-authentication-api)
   - [Register with Email & Password](#register-with-email--password)
   - [Register with Phone Number](#register-with-phone-number)
   - [Login with Email & Password](#login-with-email--password)
   - [Login with Phone Number](#login-with-phone-number)
   - [Resend Email Verification](#resend-email-verification)
   - [Forgot Password](#forgot-password)
   - [Reset Password](#reset-password)
   - [Logout](#logout)
2. [User Profile API](#2-user-profile-api)
   - [Create Profile](#create-profile)
   - [Get Profile](#get-profile)
   - [Update Profile](#update-profile)
   - [Delete Profile](#delete-profile)
3. [Upload API](#3-upload-api)
   - [Upload Images](#upload-images)

---

## 1. Authentication API

All authentication uses Firebase Auth under the hood. Tokens are set using HTTP-Only cookies (`fb_access_token` and `fb_refresh_token`), or can be manually passed via the `Authorization: Bearer <TOKEN>` header.

### Register with Email & Password
Creates a Firebase Auth user and seeds the Supabase database.
* **Endpoint:** `POST /auth/register`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "email": "testuser@gmail.com",
    "password": "Password123!"
  }
  ```
* **Testing Command:**
  ```bash
  curl -X POST https://dating-app-backend-g8so.onrender.com/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email": "testuser@gmail.com", "password": "Password123!"}'
  ```

---

### Register with Phone Number
Creates a Firebase Auth user with a synthetic email/password and saves the phone number to Supabase.
* **Endpoint:** `POST /auth/phone-register`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "phone": "+12345678900"
  }
  ```
* **Testing Command:**
  ```bash
  curl -X POST https://dating-app-backend-g8so.onrender.com/auth/phone-register \
    -H "Content-Type: application/json" \
    -d '{"phone": "+12345678900"}'
  ```

---

### Login with Email & Password
Verifies credentials via Firebase Auth, updates `last_login` in Supabase, and returns authentication cookies.
* **Endpoint:** `POST /auth/login`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "email": "testuser@gmail.com",
    "password": "Password123!"
  }
  ```
* **Response Body:**
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "data": {
      "redirectTo": "/dashboard"
    }
  }
  ```
  *(Returns `Set-Cookie` headers for `fb_access_token` and `fb_refresh_token`)*
* **Testing Command:**
  ```bash
  curl -X POST https://dating-app-backend-g8so.onrender.com/auth/login \
    -H "Content-Type: application/json" \
    -c cookies.txt \
    -d '{"email": "testuser@gmail.com", "password": "Password123!"}'
  ```
  *(The `-c cookies.txt` parameter stores cookies locally to use in authenticated endpoints)*

---

### Login with Phone Number
Logs in a registered phone user.
* **Endpoint:** `POST /auth/phone-login`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "phone": "+12345678900"
  }
  ```
* **Testing Command:**
  ```bash
  curl -X POST https://dating-app-backend-g8so.onrender.com/auth/phone-login \
    -H "Content-Type: application/json" \
    -c cookies.txt \
    -d '{"phone": "+12345678900"}'
  ```

---

### Resend Email Verification
Resends the verification email to the user if they did not receive it.
* **Endpoint:** `POST /auth/resend-verification`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "email": "testuser@gmail.com"
  }
  ```
* **Testing Command:**
  ```bash
  curl -X POST https://dating-app-backend-g8so.onrender.com/auth/resend-verification \
    -H "Content-Type: application/json" \
    -d '{"email": "testuser@gmail.com"}'
  ```

---

### Forgot Password
Sends a Firebase password reset email.
* **Endpoint:** `POST /auth/forgot-password`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "email": "testuser@gmail.com"
  }
  ```
* **Testing Command:**
  ```bash
  curl -X POST https://dating-app-backend-g8so.onrender.com/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email": "testuser@gmail.com"}'
  ```

---

### Reset Password
Updates the user's password. Must be logged in.
* **Endpoint:** `POST /auth/reset-password`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "password": "NewSecurePassword123!"
  }
  ```
* **Testing Command:**
  ```bash
  curl -X POST https://dating-app-backend-g8so.onrender.com/auth/reset-password \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{"password": "NewSecurePassword123!"}'
  ```

---

### Logout
Clears tokens and cookies.
* **Endpoint:** `POST /auth/logout`
* **Testing Command:**
  ```bash
  curl -X POST https://dating-app-backend-g8so.onrender.com/auth/logout \
    -b cookies.txt
  ```

---

## 2. User Profile API

All profile routes are protected. You must supply authorization using **one** of two methods:
1. **Authorization Header:** `Authorization: Bearer <YOUR_ACCESS_TOKEN_HERE>`
2. **HTTP Cookies:** Use `-b cookies.txt` in curl commands to automatically pass the `fb_access_token` cookie received from `/auth/login` or `/auth/phone-login`.

### Create Profile
Initializes a user profile in Supabase. All fields are required on initialization.
* **Endpoint:** `POST /api/profile`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "full_name": "Alexander Pierce",
    "gender": "male",
    "age": 28,
    "looking_for": "relationship",
    "show_me": "women",
    "employment_status": "employed",
    "salary_range": "50000_100000",
    "religion": "Christianity",
    "interests": ["coding", "hiking", "fitness"],
    "selfie_image": "https://example.com/selfie.jpg",
    "profile_images": [
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg",
      "https://example.com/img3.jpg"
    ],
    "about": "Passionate developer who loves outdoors and tech.",
    "community": "Tech Innovators"
  }
  ```
* **Testing Command:**
  ```bash
  curl -X POST https://dating-app-backend-g8so.onrender.com/api/profile \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{
      "full_name": "Alexander Pierce",
      "gender": "male",
      "age": 28,
      "looking_for": "relationship",
      "show_me": "women",
      "employment_status": "employed",
      "salary_range": "50000_100000",
      "religion": "Christianity",
      "interests": ["coding", "hiking", "fitness"],
      "selfie_image": "https://example.com/selfie.jpg",
      "profile_images": ["https://example.com/img1.jpg", "https://example.com/img2.jpg", "https://example.com/img3.jpg"],
      "about": "Passionate developer who loves outdoors and tech.",
      "community": "Tech Innovators"
    }'
  ```

---

### Get Profile
Fetches the active user's profile.
* **Endpoint:** `GET /api/profile`
* **Testing Command:**
  ```bash
  curl -X GET https://dating-app-backend-g8so.onrender.com/api/profile \
    -b cookies.txt
  ```

---

### Update Profile
Updates specific fields in the user's profile. Accepts partial updates.
* **Endpoint:** `PATCH /api/profile`
* **Headers:** `Content-Type: application/json`
* **Request Body (Example - updates age and interests):**
  ```json
  {
    "age": 29,
    "interests": ["coding", "traveling"]
  }
  ```
* **Testing Command:**
  ```bash
  curl -X PATCH https://dating-app-backend-g8so.onrender.com/api/profile \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{"age": 29, "interests": ["coding", "traveling"]}'
  ```

---

### Delete Profile
Resets all optional profile fields to `null` or empty arrays (acts as a soft-delete).
* **Endpoint:** `DELETE /api/profile`
* **Testing Command:**
  ```bash
  curl -X DELETE https://dating-app-backend-g8so.onrender.com/api/profile \
    -b cookies.txt
  ```

---

## 3. Upload API

### Upload Images
Uploads a batch of images to Cloudinary.
* **Endpoint:** `POST /api/uploads`
* **Constraints:** Must upload **between 3 and 6 images** simultaneously. Supported formats: JPEG, PNG, WEBP, GIF. Maximum file size: 5MB per image.
* **Request Type:** `multipart/form-data`
* **Request Payload:**
  - Key: `images` (type: File, multiple allowed)
* **Testing Command (from a directory containing images `pic1.png`, `pic2.png`, `pic3.png`):**
  ```bash
  curl -X POST https://dating-app-backend-g8so.onrender.com/api/uploads \
    -H "Content-Type: multipart/form-data" \
    -b cookies.txt \
    -F "images=@pic1.png" \
    -F "images=@pic2.png" \
    -F "images=@pic3.png"
  ```
* **Response Body (Success):**
  ```json
  {
    "success": true,
    "message": "Images uploaded successfully.",
    "data": {
      "count": 3,
      "images": [
        {
          "publicId": "dating_app/uploads/xyzabc123",
          "url": "https://res.cloudinary.com/.../xyzabc123.png",
          "width": 800,
          "height": 600,
          "format": "png",
          "bytes": 245100
        },
        ...
      ]
    }
  }
  ```
