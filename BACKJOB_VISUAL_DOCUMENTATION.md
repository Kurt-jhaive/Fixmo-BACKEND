# Backjob System - Visual Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Class Diagrams](#class-diagrams)
3. [Sequence Diagrams](#sequence-diagrams)
4. [Entity Relationship Diagram](#entity-relationship-diagram)
5. [State Machine Diagram](#state-machine-diagram)
6. [API Flow Diagrams](#api-flow-diagrams)

---

## System Overview

The Backjob system manages warranty work requests within the Fixmo platform. When a customer experiences issues after service completion (within warranty period), they can request warranty work (backjob) which the provider must address.

---

## Class Diagrams

### 1. Core Domain Models

```
┌─────────────────────────────────────┐
│         Appointment                 │
├─────────────────────────────────────┤
│ - appointment_id: Int               │
│ - customer_id: Int                  │
│ - provider_id: Int                  │
│ - service_id: Int                   │
│ - scheduled_date: DateTime          │
│ - appointment_status: String        │
│ - final_price: Decimal              │
│ - repairDescription: String         │
│ - warranty_days: Int                │
│ - warranty_expires_at: DateTime     │
│ - warranty_paused_at: DateTime      │
│ - warranty_remaining_days: Int      │
│ - created_at: DateTime              │
│ - updated_at: DateTime              │
├─────────────────────────────────────┤
│ + hasActiveWarranty(): Boolean      │
│ + pauseWarranty(): void             │
│ + resumeWarranty(): void            │
│ + calculateRemainingDays(): Int     │
└─────────────────────────────────────┘
           │
           │ 1
           │
           │ has
           │
           │ 0..*
           ▼
┌─────────────────────────────────────┐
│      BackjobApplication             │
├─────────────────────────────────────┤
│ - backjob_id: Int                   │
│ - appointment_id: Int               │
│ - customer_id: Int                  │
│ - provider_id: Int                  │
│ - reason: String                    │
│ - evidence: JSON                    │
│ - status: String                    │
│ - provider_dispute_reason: String   │
│ - provider_dispute_evidence: JSON   │
│ - customer_cancellation_reason: Str │
│ - admin_notes: String               │
│ - created_at: DateTime              │
│ - updated_at: DateTime              │
├─────────────────────────────────────┤
│ + approve(): void                   │
│ + dispute(reason, evidence): void   │
│ + cancel(reason): void              │
│ + isDisputable(): Boolean           │
│ + isCancellable(): Boolean          │
└─────────────────────────────────────┘
```

### 2. Service Layer Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    BackjobController                         │
├──────────────────────────────────────────────────────────────┤
│ + uploadBackjobEvidence(req, res): Response                  │
│ + applyBackjob(req, res): Response                          │
│ + disputeBackjob(req, res): Response                        │
│ + cancelBackjobByCustomer(req, res): Response               │
│ + listBackjobs(req, res): Response                          │
│ + updateBackjobStatus(req, res): Response                   │
│ + rescheduleFromBackjob(req, res): Response                 │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ uses
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                   NotificationService                        │
├──────────────────────────────────────────────────────────────┤
│ + sendBackjobAssignmentNotification(providerId, ...): void   │
│ + sendBackjobStatusNotification(backjobId, ...): void       │
│ + sendPushNotification(options): Promise                     │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ uses
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                     MailerService                            │
├──────────────────────────────────────────────────────────────┤
│ + sendBackjobAssignmentEmail(email, details): void          │
│ + sendBackjobDisputeToCustomer(email, details): void        │
│ + sendBackjobCancellationToCustomer(email, details): void   │
│ + sendBackjobCancellationToProvider(email, details): void   │
│ + sendBackjobRescheduleToCustomer(email, details): void     │
│ + sendBackjobRescheduleToProvider(email, details): void     │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ uses
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                       PrismaClient                           │
├──────────────────────────────────────────────────────────────┤
│ + appointment: AppointmentDelegate                           │
│ + backjobApplication: BackjobApplicationDelegate             │
│ + user: UserDelegate                                         │
│ + serviceProviderDetails: ProviderDelegate                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Sequence Diagrams

### 1. Provider Disputes Backjob Flow

```
Provider App    API Gateway    Controller    Service    Database    Mailer    Customer App
    │               │              │            │           │          │            │
    │─── POST /backjobs/:id/dispute ──────────────────────►│          │            │
    │               │              │            │           │          │            │
    │               │              │◄── Validate Auth ─────►│          │            │
    │               │              │            │           │          │            │
    │               │              │──── Find Backjob ─────►│          │            │
    │               │              │◄───────────────────────│          │            │
    │               │              │            │           │          │            │
    │               │              │──── Check Provider ID ─►│          │            │
    │               │              │            │           │          │            │
    │               │              │──── Check Status ──────►│          │            │
    │               │              │            │           │          │            │
    │               │              │──── Update Status ─────►│          │            │
    │               │              │      (disputed)        │          │            │
    │               │              │◄───────────────────────│          │            │
    │               │              │            │           │          │            │
    │               │              │──── Resume Warranty ───►│          │            │
    │               │              │            │           │          │            │
    │               │              │──────────────── Send Email ──────►│            │
    │               │              │            │           │          │            │
    │               │              │            │           │          │── Push ───►│
    │               │              │            │           │          │  Notification
    │               │              │            │           │          │            │
    │◄──── 200 OK ────────────────│            │           │          │            │
    │  { success: true,            │            │           │          │            │
    │    data: {...} }             │            │           │          │            │
    │               │              │            │           │          │            │
```

### 2. Provider Reschedules Backjob Flow

```
Provider App    API Gateway    Controller    Validator    Database    Mailer    Customer
    │               │              │            │           │          │            │
    │─── PATCH /:id/reschedule-backjob ────────────────────►│          │            │
    │               │              │            │           │          │            │
    │               │              │◄── Validate Date/ID ──►│          │            │
    │               │              │            │           │          │            │
    │               │              │──── Find Appointment ──►│          │            │
    │               │              │◄───────────────────────│          │            │
    │               │              │            │           │          │            │
    │               │              │──── Check Status ──────►│          │            │
    │               │              │    (must be 'backjob') │          │            │
    │               │              │            │           │          │            │
    │               │              │──── Find Approved ─────►│          │            │
    │               │              │      Backjob           │          │            │
    │               │              │◄───────────────────────│          │            │
    │               │              │            │           │          │            │
    │               │              │──── Check Conflicts ───►│          │            │
    │               │              │◄───────────────────────│          │            │
    │               │              │            │           │          │            │
    │               │              │──── Update Appointment ►│          │            │
    │               │              │      status='scheduled'│          │            │
    │               │              │      new date          │          │            │
    │               │              │◄───────────────────────│          │            │
    │               │              │            │           │          │            │
    │               │              │────────────────── Send Emails ────►│            │
    │               │              │            │           │          │            │
    │               │              │            │           │          │── Push ───►│
    │               │              │            │           │          │            │
    │◄──── 200 OK ────────────────│            │           │          │            │
    │  { success: true,            │            │           │          │            │
    │    data: {...} }             │            │           │          │            │
    │               │              │            │           │          │            │
```

### 3. Upload Evidence Flow

```
Provider App    Multer       Controller    Cloudinary    Database
    │              │              │            │           │
    │─── POST /:id/backjob-evidence ──────────►│           │
    │  (multipart/form-data)      │            │           │
    │              │              │            │           │
    │              │◄── Parse Files ──────────►│           │
    │              │  (max 5 files)            │           │
    │              │              │            │           │
    │              │── Validate ──────────────►│           │
    │              │   Appointment             │           │
    │              │              │            │           │
    │              │── Check Auth ─────────────►│          │
    │              │              │            │           │
    │              │              │            │           │
    │         ┌────────────────────────────────┐           │
    │         │  Loop through files            │           │
    │         │  ┌──────────────────────────┐  │           │
    │         │  │  Upload to Cloudinary    │  │           │
    │         │  │  ────────────────────────────────►      │
    │         │  │  ◄───── URL returned ────│  │           │
    │         │  │  Store URL in array      │  │           │
    │         │  └──────────────────────────┘  │           │
    │         └────────────────────────────────┘           │
    │              │              │            │           │
    │◄──── 200 OK ────────────────│            │           │
    │  { success: true,            │            │           │
    │    files: [                  │            │           │
    │      { url, name, size }     │            │           │
    │    ] }                       │            │           │
    │              │              │            │           │
```

### 4. Customer Applies for Backjob (Auto-Approval Flow)

```
Customer App   Controller    Validator    Database    Mailer    Push Service   Provider
    │              │            │           │          │            │             │
    │── POST /:id/apply-backjob ────────────►│          │            │             │
    │              │            │           │          │            │             │
    │              │◄── Validate Auth ──────►│          │            │             │
    │              │            │           │          │            │             │
    │              │◄── Check Warranty ─────►│          │            │             │
    │              │   (in-warranty status) │          │            │             │
    │              │            │           │          │            │             │
    │              │◄── Check Duplicates ───►│          │            │             │
    │              │            │           │          │            │             │
    │              │◄── Create Backjob ─────►│          │            │             │
    │              │     status='approved'  │          │            │             │
    │              │            │           │          │            │             │
    │              │◄── Pause Warranty ─────►│          │            │             │
    │              │     save remaining days│          │            │             │
    │              │            │           │          │            │             │
    │              │◄── Update Status ──────►│          │            │             │
    │              │     status='backjob'   │          │            │             │
    │              │            │           │          │            │             │
    │              │────────────────── Send Emails ────►│            │             │
    │              │            │           │          │            │             │
    │              │──────────────────────────────── Send Push ─────────────────►│
    │              │            │           │          │            │             │
    │◄─── 201 Created ──────────│           │          │            │             │
    │  { success: true,          │           │          │            │             │
    │    data: {...} }           │           │          │            │             │
    │              │            │           │          │            │             │
```

---

## Entity Relationship Diagram

```
┌─────────────────────┐
│       User          │
│  (Customer)         │
├─────────────────────┤
│ user_id (PK)        │
│ first_name          │
│ last_name           │
│ email               │
│ phone_number        │
└──────────┬──────────┘
           │
           │ 1
           │
           │ creates
           │
           │ *
┌──────────▼──────────────────────┐
│      Appointment                │
├─────────────────────────────────┤
│ appointment_id (PK)             │
│ customer_id (FK)                │
│ provider_id (FK)                │
│ service_id (FK)                 │
│ appointment_status              │
│ warranty_days                   │
│ warranty_expires_at             │
│ warranty_paused_at              │
│ warranty_remaining_days         │
└──────────┬──────────────────────┘
           │
           │ 1
           │
           │ has
           │
           │ 0..*
┌──────────▼──────────────────────┐
│    BackjobApplication           │
├─────────────────────────────────┤
│ backjob_id (PK)                 │
│ appointment_id (FK)             │
│ customer_id (FK)                │
│ provider_id (FK)                │
│ reason                          │
│ evidence (JSON)                 │
│ status                          │
│ provider_dispute_reason         │
│ provider_dispute_evidence (JSON)│
│ customer_cancellation_reason    │
│ admin_notes                     │
└──────────┬──────────────────────┘
           │
           │ *
           │
           │ belongs to
           │
           │ 1
┌──────────▼──────────────────────┐
│  ServiceProviderDetails         │
│       (Provider)                │
├─────────────────────────────────┤
│ provider_id (PK)                │
│ provider_first_name             │
│ provider_last_name              │
│ provider_email                  │
│ provider_phone_number           │
└─────────────────────────────────┘
```

---

## State Machine Diagram

### Backjob Application Status Flow

```
                    ┌─────────────┐
                    │   START     │
                    └──────┬──────┘
                           │
                           │ Customer applies
                           │
                           ▼
                    ┌─────────────┐
                    │   PENDING   │ (Currently skipped - auto-approved)
                    └──────┬──────┘
                           │
                           │ Auto-approve
                           │
                           ▼
                    ┌─────────────┐
                    │  APPROVED   │◄────────────────┐
                    └──────┬──────┘                 │
                           │                        │
            ┌──────────────┼──────────────┐        │
            │              │              │        │
            │              │              │        │
    Provider disputes  Provider      Admin cancels│
            │         reschedules        │        │
            │              │              │        │
            ▼              ▼              ▼        │
     ┌──────────┐   ┌──────────┐   ┌──────────┐  │
     │ DISPUTED │   │RESCHEDULED│   │CANCELLED │  │
     └────┬─────┘   └────┬─────┘   │BY ADMIN  │  │
          │              │          └──────────┘  │
          │              │                        │
     Admin reviews  Work completed                │
          │              │                        │
          │              ▼                        │
          │         ┌──────────┐                 │
          │         │COMPLETED │                 │
          │         └──────────┘                 │
          │                                      │
          │              Customer cancels        │
          └──────────────────┬───────────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  CANCELLED   │
                      │BY CUSTOMER   │
                      └──────────────┘
```

### Appointment Status Flow (with Backjob)

```
┌───────────┐
│ SCHEDULED │
└─────┬─────┘
      │
      ▼
┌───────────┐
│ON THE WAY │
└─────┬─────┘
      │
      ▼
┌───────────┐
│IN PROGRESS│
└─────┬─────┘
      │
      ▼
┌───────────┐
│ FINISHED  │
└─────┬─────┘
      │
      ▼
┌───────────┐
│IN WARRANTY│◄────────────┐
└─────┬─────┘             │
      │                   │
      │ Customer applies  │
      │ for backjob       │
      │                   │
      ▼                   │
┌───────────┐             │
│  BACKJOB  │             │
└─────┬─────┘             │
      │                   │
      ├────► Provider ────┤
      │      reschedules  │
      │                   │
      ▼                   │
┌───────────┐             │
│ SCHEDULED │             │
│ (again)   │             │
└─────┬─────┘             │
      │                   │
      │ Complete work     │
      │                   │
      └───────────────────┘
            │
            │ Warranty expires
            │ or completed
            ▼
      ┌───────────┐
      │ COMPLETED │
      └───────────┘
```

---

## API Flow Diagrams

### 1. Dispute Backjob Endpoint

```
┌──────────────────────────────────────────────────────────────────┐
│  POST /api/appointments/backjobs/:backjobId/dispute              │
└──────────────────────────────────────────────────────────────────┘

Input:
┌─────────────────────────────────────┐
│  Request Body                       │
├─────────────────────────────────────┤
│  {                                  │
│    "dispute_reason": String,        │
│    "dispute_evidence": {            │
│      "description": String,         │
│      "files": [URL],                │
│      "notes": String                │
│    }                                │
│  }                                  │
└─────────────────────────────────────┘

Processing Steps:
┌────────────────────────────────────────┐
│ 1. Validate Authentication            │
│    └─► Check JWT token                │
│    └─► Extract providerId             │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 2. Find Backjob                       │
│    └─► Query by backjob_id            │
│    └─► Include appointment details    │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 3. Authorization Check                │
│    └─► Verify providerId matches      │
│    └─► Check if disputable status     │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 4. Update Backjob Status              │
│    └─► Set status = 'disputed'        │
│    └─► Save dispute_reason            │
│    └─► Save dispute_evidence          │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 5. Resume Warranty                    │
│    └─► Calculate new expiry date      │
│    └─► Add warranty_remaining_days    │
│    └─► Clear warranty_paused_at       │
│    └─► Update status = 'in-warranty'  │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 6. Send Notifications                 │
│    └─► Email to customer              │
│    └─► Push notification to customer  │
└────────────────────────────────────────┘
                  │
                  ▼
Output:
┌─────────────────────────────────────┐
│  Response (200 OK)                  │
├─────────────────────────────────────┤
│  {                                  │
│    "success": true,                 │
│    "message": "Backjob disputed",   │
│    "data": {                        │
│      "backjob_id": 8,               │
│      "status": "disputed",          │
│      "provider_dispute_reason": ... │
│    }                                │
│  }                                  │
└─────────────────────────────────────┘
```

### 2. Reschedule Backjob Endpoint

```
┌──────────────────────────────────────────────────────────────────┐
│  PATCH /api/appointments/:appointmentId/reschedule-backjob       │
└──────────────────────────────────────────────────────────────────┘

Input:
┌─────────────────────────────────────┐
│  Request Body                       │
├─────────────────────────────────────┤
│  {                                  │
│    "new_scheduled_date": DateTime,  │
│    "availability_id": Number        │
│  }                                  │
└─────────────────────────────────────┘

Processing Steps:
┌────────────────────────────────────────┐
│ 1. Validate Input                     │
│    └─► Check date format              │
│    └─► Check availability_id          │
│    └─► Verify date is in future       │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 2. Find Appointment                   │
│    └─► Query by appointment_id        │
│    └─► Check status = 'backjob'       │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 3. Verify Approved Backjob Exists    │
│    └─► Find backjob with              │
│        status = 'approved'            │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 4. Check Scheduling Conflicts         │
│    └─► Query provider's appointments  │
│    └─► Check same date/time           │
│    └─► Exclude current appointment    │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 5. Update Appointment                 │
│    └─► Set new scheduled_date         │
│    └─► Set availability_id            │
│    └─► Change status = 'scheduled'    │
│    └─► Keep warranty pause data       │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 6. Send Notifications                 │
│    └─► Email to customer              │
│    └─► Email to provider              │
│    └─► Push to customer               │
└────────────────────────────────────────┘
                  │
                  ▼
Output:
┌─────────────────────────────────────┐
│  Response (200 OK)                  │
├─────────────────────────────────────┤
│  {                                  │
│    "success": true,                 │
│    "message": "Backjob rescheduled",│
│    "data": {                        │
│      "appointment_id": 15,          │
│      "scheduled_date": "...",       │
│      "appointment_status":          │
│        "scheduled"                  │
│    }                                │
│  }                                  │
└─────────────────────────────────────┘
```

### 3. Upload Evidence Endpoint

```
┌──────────────────────────────────────────────────────────────────┐
│  POST /api/appointments/:appointmentId/backjob-evidence          │
└──────────────────────────────────────────────────────────────────┘

Input:
┌─────────────────────────────────────┐
│  Multipart Form Data                │
├─────────────────────────────────────┤
│  evidence_files: File[]             │
│  (max 5 files)                      │
│                                     │
│  Supported formats:                 │
│  - Images: JPG, PNG, JPEG           │
│  - Videos: MP4, MOV                 │
└─────────────────────────────────────┘

Processing Steps:
┌────────────────────────────────────────┐
│ 1. Multer Middleware                  │
│    └─► Parse multipart/form-data      │
│    └─► Validate file count (max 5)    │
│    └─► Store files in req.files       │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 2. Validate Request                   │
│    └─► Check files exist              │
│    └─► Verify appointment exists      │
│    └─► Check user authorization       │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 3. Upload Loop (for each file)        │
│    ┌──────────────────────────────┐   │
│    │ a. Upload to Cloudinary      │   │
│    │    └─► Generate unique name  │   │
│    │    └─► Store in folder       │   │
│    │        'fixmo/backjob-       │   │
│    │         evidence'             │   │
│    │                              │   │
│    │ b. Cloudinary returns URL    │   │
│    │                              │   │
│    │ c. Store metadata            │   │
│    │    └─► url                   │   │
│    │    └─► originalName          │   │
│    │    └─► mimetype              │   │
│    │    └─► size                  │   │
│    └──────────────────────────────┘   │
└────────────────────────────────────────┘
                  │
                  ▼
Output:
┌─────────────────────────────────────┐
│  Response (200 OK)                  │
├─────────────────────────────────────┤
│  {                                  │
│    "success": true,                 │
│    "message": "Evidence uploaded",  │
│    "data": {                        │
│      "files": [                     │
│        {                            │
│          "url": "https://...",      │
│          "originalName": "...",     │
│          "mimetype": "image/jpeg",  │
│          "size": 245678             │
│        }                            │
│      ],                             │
│      "total_files": 2               │
│    }                                │
│  }                                  │
└─────────────────────────────────────┘
```

### 4. Get Provider Appointments (with Backjobs)

```
┌──────────────────────────────────────────────────────────────────┐
│  GET /api/appointments/provider/:providerId                      │
└──────────────────────────────────────────────────────────────────┘

Input:
┌─────────────────────────────────────┐
│  Query Parameters                   │
├─────────────────────────────────────┤
│  status?: String                    │
│  page?: Number (default: 1)         │
│  limit?: Number (default: 10)       │
│  sort_order?: 'asc' | 'desc'        │
└─────────────────────────────────────┘

Processing Steps:
┌────────────────────────────────────────┐
│ 1. Build Query Filter                 │
│    └─► provider_id = providerId       │
│    └─► status = ? (if provided)       │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 2. Calculate Pagination               │
│    └─► skip = (page - 1) * limit      │
│    └─► take = limit                   │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 3. Query Database (with includes)     │
│    └─► Appointment table              │
│    └─► Include customer details       │
│    └─► Include service details        │
│    └─► Include ratings                │
│    └─► Include backjob_applications   │
│        (filter: not cancelled)        │
│        (take: 1 - most recent)        │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 4. Transform Results                  │
│    └─► Calculate days_left            │
│    └─► Add rating_status object       │
│    └─► Extract current_backjob        │
│    └─► Remove backjob_applications    │
│        array                          │
└────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│ 5. Build Response                     │
│    └─► Add pagination metadata        │
│    └─► Calculate total_pages          │
│    └─► Add has_next, has_prev         │
└────────────────────────────────────────┘
                  │
                  ▼
Output:
┌─────────────────────────────────────┐
│  Response (200 OK)                  │
├─────────────────────────────────────┤
│  {                                  │
│    "success": true,                 │
│    "data": [                        │
│      {                              │
│        "appointment_id": 15,        │
│        "appointment_status":        │
│          "backjob",                 │
│        "current_backjob": {         │
│          "backjob_id": 8,           │
│          "status": "approved",      │
│          "reason": "..."            │
│        },                           │
│        "customer": {...},           │
│        "service": {...}             │
│      }                              │
│    ],                               │
│    "pagination": {                  │
│      "current_page": 1,             │
│      "total_pages": 3,              │
│      "total_count": 25              │
│    }                                │
│  }                                  │
└─────────────────────────────────────┘
```

---

## Component Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Provider Mobile App                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────┐  ┌───────────────────┐  ┌────────────────┐ │
│  │ Appointments      │  │ Backjob Detail    │  │ Dispute Modal  │ │
│  │ List Screen       │  │ Screen            │  │                │ │
│  │                   │  │                   │  │                │ │
│  │ - Filter by       │  │ - View reason     │  │ - Enter reason │ │
│  │   status          │  │ - View evidence   │  │ - Upload files │ │
│  │ - Backjob badge   │  │ - Dispute button  │  │ - Submit       │ │
│  │ - Tap to detail   │  │ - Reschedule btn  │  │                │ │
│  └─────────┬─────────┘  └─────────┬─────────┘  └────────┬───────┘ │
│            │                      │                      │         │
│            └──────────────────────┼──────────────────────┘         │
│                                   │                                │
└───────────────────────────────────┼────────────────────────────────┘
                                    │
                                    │ API Calls
                                    │
┌───────────────────────────────────▼────────────────────────────────┐
│                        API Service Layer                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  backjobService.js                                                 │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ - getProviderAppointments(providerId, params)                │ │
│  │ - disputeBackjob(backjobId, data)                            │ │
│  │ - rescheduleBackjob(appointmentId, data)                     │ │
│  │ - uploadEvidence(appointmentId, files)                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└───────────────────────────────────┬────────────────────────────────┘
                                    │
                                    │ HTTP Requests
                                    │
┌───────────────────────────────────▼────────────────────────────────┐
│                          Backend API                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐        ┌──────────────────┐                  │
│  │  Auth           │        │  appointmentRoutes│                  │
│  │  Middleware     │◄───────┤  /appointments/   │                  │
│  │                 │        │                   │                  │
│  │ - Verify JWT    │        │ - GET provider/:id│                  │
│  │ - Extract user  │        │ - POST dispute    │                  │
│  └─────────────────┘        │ - PATCH reschedule│                  │
│                             └──────────┬─────────┘                  │
│                                        │                            │
│                             ┌──────────▼─────────┐                  │
│                             │ appointmentCtrl    │                  │
│                             │                    │                  │
│                             │ - disputeBackjob() │                  │
│                             │ - rescheduleFrom   │                  │
│                             │   Backjob()        │                  │
│                             └──────────┬─────────┘                  │
│                                        │                            │
│          ┌─────────────────────────────┼────────────────────┐       │
│          │                             │                    │       │
│  ┌───────▼────────┐     ┌──────────────▼────┐  ┌──────────▼─────┐ │
│  │ Notification   │     │  Mailer Service   │  │  Prisma Client │ │
│  │ Service        │     │                   │  │                │ │
│  │                │     │ - sendBackjob     │  │ - appointment  │ │
│  │ - sendBackjob  │     │   Dispute         │  │ - backjob      │ │
│  │   Assignment   │     │ - sendBackjob     │  │   Application  │ │
│  │                │     │   Reschedule      │  │                │ │
│  └────────────────┘     └───────────────────┘  └────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram (Complete Backjob Lifecycle)

```
START
  │
  │ 1. Service Completed
  │
  ▼
┌──────────────────────┐
│ Appointment Status:  │
│ 'finished'           │
└──────────┬───────────┘
           │
           │ System calculates warranty
           │
           ▼
┌──────────────────────┐
│ Appointment Status:  │
│ 'in-warranty'        │
│ warranty_expires_at  │
│ set                  │
└──────────┬───────────┘
           │
           │ Customer discovers issue
           │
           ▼
┌──────────────────────┐
│ Customer App:        │
│ - Upload evidence    │
│ - Write reason       │
│ - Submit backjob     │
└──────────┬───────────┘
           │
           │ POST /apply-backjob
           │
           ▼
┌──────────────────────┐
│ Backend:             │
│ - Validate warranty  │
│ - Create backjob     │
│   status='approved'  │
│ - PAUSE warranty     │
│ - Update appointment │
│   status='backjob'   │
└──────────┬───────────┘
           │
           ├──────────────┬──────────────┐
           │              │              │
           ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Email to │   │ Email to │   │ Push to  │
    │ Customer │   │ Provider │   │ Provider │
    └──────────┘   └──────────┘   └──────────┘
                         │
                         │ Provider reviews
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
    ┌──────────────────┐  ┌──────────────────┐
    │ Provider Disputes│  │ Provider         │
    │                  │  │ Reschedules      │
    └────────┬─────────┘  └────────┬─────────┘
             │                     │
             │                     │
             ▼                     ▼
    ┌──────────────────┐  ┌──────────────────┐
    │ POST /dispute    │  │ PATCH /reschedule│
    │                  │  │ -backjob         │
    └────────┬─────────┘  └────────┬─────────┘
             │                     │
             │                     │
             ▼                     ▼
    ┌──────────────────┐  ┌──────────────────┐
    │ Backend:         │  │ Backend:         │
    │ - Update status  │  │ - Schedule new   │
    │   'disputed'     │  │   appointment    │
    │ - RESUME warranty│  │ - Status =       │
    │ - Notify customer│  │   'scheduled'    │
    │ - Admin review   │  │ - Keep warranty  │
    │                  │  │   paused         │
    └────────┬─────────┘  └────────┬─────────┘
             │                     │
             │                     │
             ▼                     ▼
    ┌──────────────────┐  ┌──────────────────┐
    │ Admin reviews    │  │ Provider         │
    │ evidence         │  │ completes work   │
    │                  │  │                  │
    │ Decision:        │  │ Status =         │
    │ - Approve        │  │ 'finished'       │
    │ - Reject         │  │                  │
    └────────┬─────────┘  └────────┬─────────┘
             │                     │
             │                     ▼
             │            ┌──────────────────┐
             │            │ Backend:         │
             │            │ - RESUME warranty│
             │            │   from pause     │
             │            │ - Status =       │
             │            │   'in-warranty'  │
             │            └────────┬─────────┘
             │                     │
             └─────────────────────┤
                                   │
                                   ▼
                            ┌──────────────┐
                            │ Warranty     │
                            │ continues or │
                            │ expires      │
                            └──────┬───────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │ Appointment  │
                            │ Status:      │
                            │ 'completed'  │
                            └──────────────┘
                                   │
                                   ▼
                                  END
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│              API Request Received                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │ Authentication   │
              │ Middleware       │
              └────────┬─────────┘
                       │
            ┌──────────┴──────────┐
            │ Valid?              │
            └─────────────────────┘
              │              │
             YES             NO
              │              │
              │              ▼
              │     ┌──────────────────┐
              │     │ 401 Unauthorized │
              │     │ {                │
              │     │   success: false,│
              │     │   message: "..."  │
              │     │ }                │
              │     └──────────────────┘
              │
              ▼
    ┌──────────────────┐
    │ Authorization    │
    │ Check            │
    └────────┬─────────┘
             │
  ┌──────────┴──────────┐
  │ Authorized?         │
  └─────────────────────┘
    │              │
   YES             NO
    │              │
    │              ▼
    │     ┌──────────────────┐
    │     │ 403 Forbidden    │
    │     │ {                │
    │     │   success: false,│
    │     │   message: "..."  │
    │     │ }                │
    │     └──────────────────┘
    │
    ▼
┌──────────────────┐
│ Validation       │
│ Check            │
└────────┬─────────┘
         │
┌────────┴─────────┐
│ Valid Input?     │
└──────────────────┘
  │              │
 YES             NO
  │              │
  │              ▼
  │     ┌──────────────────┐
  │     │ 400 Bad Request  │
  │     │ {                │
  │     │   success: false,│
  │     │   message: "..."  │
  │     │ }                │
  │     └──────────────────┘
  │
  ▼
┌──────────────────┐
│ Business Logic   │
│ Check            │
└────────┬─────────┘
         │
┌────────┴─────────┐
│ Can Perform?     │
│ (e.g., status)   │
└──────────────────┘
  │              │
 YES             NO
  │              │
  │              ▼
  │     ┌──────────────────┐
  │     │ 409 Conflict or  │
  │     │ 400 Bad Request  │
  │     │ {                │
  │     │   success: false,│
  │     │   message: "..."  │
  │     │ }                │
  │     └──────────────────┘
  │
  ▼
┌──────────────────┐
│ Database         │
│ Operation        │
└────────┬─────────┘
         │
┌────────┴─────────┐
│ Success?         │
└──────────────────┘
  │              │
 YES             NO
  │              │
  │              ▼
  │     ┌──────────────────┐
  │     │ 500 Internal     │
  │     │ Server Error     │
  │     │ {                │
  │     │   success: false,│
  │     │   message: "...", │
  │     │   error: "..."   │
  │     │ }                │
  │     └──────────────────┘
  │
  ▼
┌──────────────────┐
│ 200 OK or        │
│ 201 Created      │
│ {                │
│   success: true, │
│   data: {...}    │
│ }                │
└──────────────────┘
```

---

## Warranty Pause & Resume Mechanism

```
Timeline View:

Day 0         Day 5                    Day 15            Day 20       Day 45
│              │                         │                 │            │
│              │                         │                 │            │
▼              ▼                         ▼                 ▼            ▼
┌──────────────┐                        ┌─────────────────┐
│ Service      │                        │ Customer        │
│ Completed    │                        │ Applies Backjob │
│              │                        │                 │
│ Status:      │                        │ Status:         │
│ 'finished'   │────────────────────────│ 'backjob'       │
│              │ Warranty Active        │                 │
│ warranty     │ (5 days used)          │ PAUSE WARRANTY  │
│ expires:     │                        │                 │
│ Day 30       │                        │ Save remaining: │
└──────────────┘                        │ 25 days         │
                                        └─────────────────┘
                                                 │
                                                 │ Provider
                                                 │ reschedules
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │ Appointment     │
                                        │ Rescheduled     │
                                        │                 │
                                        │ Status:         │
                                        │ 'scheduled'     │
                                        │                 │
                                        │ Warranty paused:│
                                        │ Still 25 days   │
                                        └─────────────────┘
                                                 │
                                                 │ Provider
                                                 │ completes
                                                 │ work
                                                 ▼
                                        ┌─────────────────┐
                                        │ Work Completed  │
                                        │                 │
                                        │ Status:         │
                                        │ 'in-warranty'   │
                                        │                 │
                                        │ RESUME WARRANTY │
                                        │ warranty        │
                                        │ expires:        │
                                        │ Day 45 (20+25)  │
                                        │                 │
                                        │ Customer has 25 │
                                        │ more days       │
                                        └─────────────────┘

Key Points:
1. Original warranty: 30 days
2. Customer used 5 days before backjob
3. Warranty paused with 25 days remaining
4. Provider took 10 days to reschedule and complete
5. Warranty resumes: Customer gets full 25 days from Day 20
6. New expiry: Day 45 (not Day 30)
```

---

## Database Transaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Dispute Backjob Transaction                    │
└─────────────────────────────────────────────────────────────┘

BEGIN TRANSACTION
    │
    ▼
┌──────────────────────────────────┐
│ 1. Lock backjobApplication row   │
│    WHERE backjob_id = :id        │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ 2. Validate current status       │
│    IF status NOT IN              │
│    ('approved', 'pending')       │
│    THEN ROLLBACK                 │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ 3. UPDATE backjobApplication     │
│    SET status = 'disputed'       │
│    SET provider_dispute_reason   │
│    SET provider_dispute_evidence │
│    SET updated_at = NOW()        │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ 4. Lock appointment row          │
│    WHERE appointment_id = :id    │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ 5. Calculate new warranty expiry │
│    new_expiry = NOW() +          │
│      warranty_remaining_days     │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ 6. UPDATE appointment            │
│    SET appointment_status =      │
│        'in-warranty'             │
│    SET warranty_expires_at =     │
│        new_expiry                │
│    SET warranty_paused_at = NULL │
│    SET warranty_remaining_days = │
│        NULL                      │
│    SET updated_at = NOW()        │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ 7. COMMIT TRANSACTION            │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ 8. Send Notifications            │
│    (Outside transaction)         │
│    - Email                       │
│    - Push notification           │
└──────────────────────────────────┘

Note: If any step fails, ROLLBACK all changes
```

---

## Caching Strategy (Optional Enhancement)

```
┌─────────────────────────────────────────────────────────────┐
│              GET /provider/:id/appointments                 │
└─────────────────────────────────────────────────────────────┘

Request
   │
   ▼
┌──────────────────────┐
│ Generate Cache Key   │
│ key = "provider_appts│
│       :{providerId}:  │
│       {status}:       │
│       {page}:{limit}" │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Check Redis Cache    │
└──────┬───────────────┘
       │
  ┌────┴────┐
  │ Exists? │
  └─────────┘
   │        │
  YES       NO
   │        │
   │        ▼
   │   ┌──────────────────────┐
   │   │ Query Database       │
   │   │ with includes        │
   │   └──────┬───────────────┘
   │          │
   │          ▼
   │   ┌──────────────────────┐
   │   │ Transform Results    │
   │   └──────┬───────────────┘
   │          │
   │          ▼
   │   ┌──────────────────────┐
   │   │ Cache Results        │
   │   │ TTL = 5 minutes      │
   │   └──────┬───────────────┘
   │          │
   ▼          ▼
┌──────────────────────┐
│ Return Results       │
└──────────────────────┘

Cache Invalidation:
┌──────────────────────────────────────┐
│ When backjob status changes:         │
│ - Dispute                            │
│ - Reschedule                         │
│ - Cancel                             │
│                                      │
│ DELETE cache keys:                   │
│ - "provider_appts:{providerId}:*"    │
│ - "customer_appts:{customerId}:*"    │
└──────────────────────────────────────┘
```

---

## Summary

This visual documentation provides:

1. **Class Diagrams** - Structure of domain models and services
2. **Sequence Diagrams** - Step-by-step flow of operations
3. **Entity Relationship** - Database relationships
4. **State Machines** - Status transitions
5. **API Flows** - Detailed processing steps for each endpoint
6. **Component Architecture** - How frontend and backend connect
7. **Data Flow** - Complete backjob lifecycle
8. **Error Handling** - Comprehensive error flow
9. **Warranty Mechanism** - Pause and resume logic
10. **Database Transactions** - ACID compliance

Use these diagrams to:
- 📖 Understand the system architecture
- 🔧 Implement provider app features
- 🐛 Debug issues
- 📝 Onboard new developers
- 🎯 Plan enhancements

---

**Last Updated:** October 12, 2025  
**Version:** 1.0  
**Maintained by:** Fixmo Backend Team
