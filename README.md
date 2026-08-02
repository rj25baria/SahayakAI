# 🩺 SAHAYAK AI — Enterprise Healthcare & Emergency Platform

> **Smart. Secure. Community-Powered Preventive Care.**

[![CI/CD Pipeline](https://img.shields.io/badge/CI%2FCD-Active-brightgreen)](#) [![Security Audit](https://img.shields.io/badge/OWASP%20Top%2010-Compliant-blue)](#) [![HIPAA Readiness](https://img.shields.io/badge/HIPAA-Audit%20Logged-success)](#) [![Next.js 13+](https://img.shields.io/badge/Next.js-App%20Router-black)](#) [![Gemini AI](https://img.shields.io/badge/Gemini%202.5-Flash%20Active-8e44ad)](#)

Sahayak AI is an enterprise-grade, production-ready preventive healthcare platform for the elderly, chronically ill, and individuals living alone. It combines **AI-powered clinical triage (Gemini 2.5 Flash)**, **explainable risk scoring**, **vital health tracking**, **first-responder QR verification**, and a **Community Guardian SOS Mesh Network**.

---

## 🏛️ System Architecture

```
                       +-----------------------------------+
                       |    Client (Browser / PWA / App)   |
                       +-----------------+-----------------+
                                         |
                                  HTTPS / WSS
                                         |
                       +-----------------v-----------------+
                       |       Next.js 13 App Router       |
                       | (Security Headers, CSRF, RateLim) |
                       +--------+-----------------+--------+
                                |                 |
            +-------------------+                 +-------------------+
            |                                                         |
+-----------v-----------+                                 +-----------v-----------+
|  /api/ai/triage Route |                                 |  /api/qr/verify Route |
| (Prompt Defense, Zod) |                                 |  (GPS Proximity, PII) |
+-----------+-----------+                                 +-----------+-----------+
            |                                                         |
+-----------v-----------+                                 +-----------v-----------+
| Gemini 2.5 Flash SDK  |                                 | HIPAA Audit Log Engine|
| (Structured JSON AI)  |                                 | (Encrypted Local/DB)  |
+-----------------------+                                 +-----------------------+
```

---

## 🔒 Security & HIPAA Compliance Matrix

| Security Domain | Implementation | OWASP / HIPAA Standard |
| :--- | :--- | :--- |
| **Input Validation** | Strict Zod Schemas across API routes & UI forms | OWASP #A03: Injection Defense |
| **AI Safety & Defense** | Sanitized prompts, prohibited system override rules, fallback engine | Generative AI OWASP #LLM01 |
| **API Rate Limiting** | Sliding window rate-limiter on AI and public endpoints | OWASP #A04: Unrestricted Resource Consumption |
| **Security Headers** | CSP, HSTS, X-Frame-Options, Permissions-Policy in `next.config.js` | OWASP #A05: Security Misconfiguration |
| **Audit Logging** | Immutable HIPAA audit events (`logAudit`, `logger.audit`) with timestamps | HIPAA Technical Safeguards (45 CFR § 164.312) |
| **PII Protection** | Zero plain-text medical exposure; Medical QR tokenization | HIPAA Privacy Rule |

---

## 🔌 API Documentation

### 1. Enterprise Health Probe
- **Endpoint:** `GET /api/health`
- **Response:**
```json
{
  "status": "healthy",
  "service": "sahayak-ai-enterprise",
  "version": "1.0.0",
  "checks": {
    "database": "operational",
    "ai_gateway": "active",
    "hipaa_audit_log": "active"
  }
}
```

### 2. Clinical AI Triage Endpoint
- **Endpoint:** `POST /api/ai/triage`
- **Body:**
```json
{
  "symptoms": "Chest pain radiating to left arm",
  "age": 68,
  "vitals": { "heart_rate": 115, "spo2": 92 }
}
```
- **Response:**
```json
{
  "risk_level": "CRITICAL",
  "category": "Emergency Cardiac Triage",
  "urgency": "Immediate Emergency Services Required",
  "actionable_steps": [
    "Call 108 / 911 emergency response immediately.",
    "Alert community guardian network."
  ],
  "disclaimer": "Automated clinical evaluation. Does not replace physician advice."
}
```

### 3. Emergency QR Verification
- **Endpoint:** `POST /api/qr/verify`
- **Body:**
```json
{
  "request_id": "req-101",
  "qr_token": "token-xyz",
  "volunteer_id": "vol-55"
}
```

---

## ⏱️ 3-Minute Hackathon Judge Demo Guide

1. **Instant Demo Role Switcher:**
   - Use the top profile avatar / switch button to instantly toggle between **Patient**, **Elderly User**, **Guardian/Family**, and **Doctor/First Responder** modes.
2. **AI Clinical Triage:**
   - Navigate to **Health Triage**, input symptoms or abnormal vitals, and observe real-time risk scoring backed by Gemini 2.5 Flash structured output.
3. **Medical Emergency QR Card:**
   - Check out **Emergency QR Deck** — scan or generate tokenized emergency passes for instant first-responder access without exposing full PII.
4. **Community SOS & Verification:**
   - Trigger an emergency SOS, observe the Community Guardian escalation mesh, and verify physical presence using the QR scanner.

---

## 🛠️ DevOps & Deployment Setup

### Local Docker Container
```bash
docker build -t sahayak-ai .
docker run -p 3000:3000 -e GEMINI_API_KEY="your-key" sahayak-ai
```

### Docker Compose
```bash
docker-compose up --build
```

---

## 📄 License
Licensed under the **MIT License**.
