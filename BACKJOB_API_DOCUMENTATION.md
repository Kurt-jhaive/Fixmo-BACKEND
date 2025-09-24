# Backjob API Documentation

This document describes the Backjob workflow endpoints for appointments under warranty.

## Overview
- Eligibility: Only appointments with status `in-warranty` can have a backjob requested by the customer.
- Lifecycle:
  1) Customer applies → Appointment status becomes `backjob`.
  2) Provider may dispute (optional) → Backjob status `disputed`.
  3) Admin reviews and decides:
     - `approve` → Backjob status `approved`; provider must reschedule.
     - `cancel-by-admin` → Backjob status `cancelled-by-admin`; appointment becomes `completed`.
     - `cancel-by-user` → Backjob status `cancelled-by-user`; appointment returns to `in-warranty`.
  4) Provider reschedules approved backjob → Appointment becomes `scheduled` (same `appointment_id`).
- Duplicate prevention: Only one active backjob per appointment (statuses: `pending`, `approved`, `disputed`).

## Authentication & Roles
- Customer/Provider endpoints: Bearer token validated by `authMiddleware` with claims: `userId`, `userType` (`customer` or `provider`).
- Admin endpoints: Bearer token validated by `adminAuthMiddleware` with claim: `adminId`.

## Endpoints

### 1) Apply for Backjob (Customer)
- Method: POST
- Path: `/api/appointments/:appointmentId/backjob/apply`
- Auth: `customer` (must own the appointment)
- Body:
  - `reason` (string, required)
  - `evidence` (any JSON, optional)
- Responses:
  - 201: `{ success, message, data: { backjob, appointment } }` (appointment now has `appointment_status: "backjob"`)
  - 400: Not in warranty or missing reason
  - 403: Not owner or wrong role
  - 409: Active backjob already exists

### 2) Dispute Backjob (Provider)
- Method: POST
- Path: `/api/appointments/backjob/:backjobId/dispute`
- Auth: `provider` (must match appointment provider)
- Body:
  - `dispute_reason` (string, optional)
  - `dispute_evidence` (any JSON, optional)
- Responses:
  - 200: `{ success, message, data }` (status becomes `disputed`)
  - 403/404/500 as applicable

### 3) List Backjobs (Admin)
- Method: GET
- Path: `/api/appointments/backjobs`
- Auth: `admin`
- Query:
  - `status` (optional; filter)
  - `page` (default 1)
  - `limit` (default 10)
- Response: `{ success, data: [ ... ], pagination: { current_page, total_pages, total_count, limit } }`

### 4) Update Backjob Status (Admin)
- Method: PATCH
- Path: `/api/appointments/backjobs/:backjobId`
- Auth: `admin`
- Body:
  - `action`: one of `approve` | `cancel-by-admin` | `cancel-by-user`
  - `admin_notes` (string, optional)
- Effects:
  - `approve` → backjob `approved`; appointment stays `backjob` until rescheduled by provider
  - `cancel-by-admin` → backjob `cancelled-by-admin`; appointment becomes `completed`
  - `cancel-by-user` → backjob `cancelled-by-user`; appointment returns to `in-warranty`

### 5) Reschedule From Backjob (Provider)
- Method: PATCH
- Path: `/api/appointments/:appointmentId/backjob/reschedule`
- Auth: `provider` (must match appointment provider)
- Body:
  - `new_scheduled_date` (ISO string, required)
  - `availability_id` (number, required)
- Preconditions:
  - Appointment status is `backjob`
  - There exists an `approved` backjob for the appointment
  - No provider conflict at the chosen time
- Response: `{ success, message, data: appointment }` (includes `customer`, `serviceProvider`, `service`) with status `scheduled`.

## Status Reference
- Backjob status: `pending` (default), `approved`, `disputed`, `cancelled-by-admin`, `cancelled-by-user`.
- Appointment statuses used in this flow: `in-warranty`, `backjob`, `scheduled`, `completed`.

## Notes
- Evidence fields accept JSON to support arrays of links, objects, etc.
- All IDs in path params are numeric.
- Appointment ID remains the same throughout the backjob rescheduling.
