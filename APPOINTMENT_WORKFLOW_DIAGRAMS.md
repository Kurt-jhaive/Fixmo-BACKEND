# Appointment Management - Visual Workflow Guide

## 🎨 Visual Reference for Appointment Workflows

This document provides visual flowcharts and diagrams to help understand the appointment management system workflows.

**Version:** 1.0  
**Date:** October 3, 2025

---

## 📋 Table of Contents

1. [Complete Appointment Lifecycle](#complete-appointment-lifecycle)
2. [Backjob (Warranty Claim) Workflow](#backjob-warranty-claim-workflow)
3. [Dispute Resolution Workflow](#dispute-resolution-workflow)
4. [No-Show Handling Workflow](#no-show-handling-workflow)
5. [Warranty System States](#warranty-system-states)
6. [Admin Decision Trees](#admin-decision-trees)

---

## Complete Appointment Lifecycle

### Full Status Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     APPOINTMENT LIFECYCLE                            │
└─────────────────────────────────────────────────────────────────────┘

CUSTOMER BOOKS APPOINTMENT
         ↓
    [PENDING] ────────────────────────────────────────────┐
         ↓                                                 │
    Provider Reviews                                       │
         ↓                                                 │
    [ACCEPTED] ───────────────────────────────────────┐   │
         ↓                                            │   │
    Provider Confirms Schedule                        │   │
         ↓                                            │   │
    [SCHEDULED] ──────────────────────────────────┐   │   │
         ↓                                        │   │   │
    Provider Starts Travel                        │   │   │
         ↓                                        │   │   │
    [ON-THE-WAY] ─────────────────────────────┐   │   │   │
         ↓                                    │   │   │   │
    Provider Arrives & Starts Work            │   │   │   │
         ↓                                    │   │   │   │
    [IN-PROGRESS] ────────────────────────┐   │   │   │   │
         ↓                                │   │   │   │   │
    Provider Completes Work               │   │   │   │   │
         ↓                                │   │   │   │   │
    [FINISHED] ───────────────────────┐   │   │   │   │   │
         ↓                            │   │   │   │   │   │
    Customer Confirms Completion      │   │   │   │   │   │
         ↓                            │   │   │   │   │   │
    [COMPLETED]                       │   │   │   │   │   │
         ↓                            │   │   │   │   │   │
    Has Warranty?                     │   │   │   │   │   │
    ├─ Yes → [IN-WARRANTY]            │   │   │   │   │   │
    │           ↓                     │   │   │   │   │   │
    │      Issue Found?               │   │   │   │   │   │
    │      ├─ Yes → [BACKJOB]         │   │   │   │   │   │
    │      │          ↓               │   │   │   │   │   │
    │      │     Resolved/Disputed    │   │   │   │   │   │
    │      │          ↓               │   │   │   │   │   │
    │      │     Back to [IN-WARRANTY]│   │   │   │   │   │
    │      │                          │   │   │   │   │   │
    │      └─ No → [EXPIRED]          │   │   │   │   │   │
    │                                 │   │   │   │   │   │
    └─ No → [EXPIRED]                 │   │   │   │   │   │
                                      │   │   │   │   │   │
         CANCELLATION POINTS:         │   │   │   │   │   │
         ↓                            ↓   ↓   ↓   ↓   ↓   ↓
    [CANCELLED] ←────────────────────┴───┴───┴───┴───┴───┘
```

### Status Transition Matrix

```
┌────────────────┬──────────────────────────────────────────────────┐
│ Current Status │ Possible Next States                             │
├────────────────┼──────────────────────────────────────────────────┤
│ PENDING        │ → ACCEPTED (provider)                            │
│                │ → CANCELLED (customer/provider)                  │
├────────────────┼──────────────────────────────────────────────────┤
│ ACCEPTED       │ → SCHEDULED (provider)                           │
│                │ → CANCELLED (customer/provider)                  │
├────────────────┼──────────────────────────────────────────────────┤
│ SCHEDULED      │ → ON-THE-WAY (provider)                          │
│                │ → CANCELLED (customer/provider/admin)            │
├────────────────┼──────────────────────────────────────────────────┤
│ ON-THE-WAY     │ → IN-PROGRESS (provider)                         │
│                │ → CANCELLED (customer/provider/admin)            │
├────────────────┼──────────────────────────────────────────────────┤
│ IN-PROGRESS    │ → FINISHED (provider)                            │
│                │ → CANCELLED (admin only - rare)                  │
├────────────────┼──────────────────────────────────────────────────┤
│ FINISHED       │ → COMPLETED (customer or auto after 24h)         │
├────────────────┼──────────────────────────────────────────────────┤
│ COMPLETED      │ → IN-WARRANTY (if warranty_days > 0)             │
│                │ → EXPIRED (if warranty_days = 0 or null)         │
├────────────────┼──────────────────────────────────────────────────┤
│ IN-WARRANTY    │ → BACKJOB (customer applies)                     │
│                │ → EXPIRED (warranty period ends)                 │
├────────────────┼──────────────────────────────────────────────────┤
│ BACKJOB        │ → IN-WARRANTY (backjob cancelled/disputed)       │
│                │ → SCHEDULED (provider reschedules)               │
│                │ → COMPLETED (admin cancels backjob)              │
├────────────────┼──────────────────────────────────────────────────┤
│ CANCELLED      │ (TERMINAL - no transitions)                      │
├────────────────┼──────────────────────────────────────────────────┤
│ EXPIRED        │ (TERMINAL - no transitions)                      │
└────────────────┴──────────────────────────────────────────────────┘
```

---

## Backjob (Warranty Claim) Workflow

### Customer Applies for Backjob

```
┌──────────────────────────────────────────────────────────────┐
│            BACKJOB APPLICATION WORKFLOW                       │
└──────────────────────────────────────────────────────────────┘

CUSTOMER DISCOVERS ISSUE DURING WARRANTY
         ↓
    Collects Evidence (Photos/Videos)
         ↓
    ┌─────────────────────────────┐
    │  POST /apply-backjob        │
    │  - reason                   │
    │  - evidence (photos/videos) │
    └─────────────────────────────┘
         ↓
    ┌─────────────────────────────┐
    │  SYSTEM ACTIONS:            │
    │  1. Create BackjobApplication│
    │  2. Status = "approved"     │
    │  3. Pause warranty countdown │
    │  4. Save remaining days     │
    │  5. Update appointment      │
    │     status = "backjob"      │
    │  6. Send emails             │
    └─────────────────────────────┘
         ↓
    ┌─────────────────────────────┐
    │  NOTIFICATIONS SENT:        │
    │  - Customer: Confirmation   │
    │  - Provider: Action needed  │
    └─────────────────────────────┘
         ↓
    Provider Has 2 Options:
         ↓
    ┌────────────┬────────────────┐
    │            │                │
    │  OPTION 1  │   OPTION 2     │
    │ RESCHEDULE │   DISPUTE      │
    │            │                │
    └────┬───────┴────────┬───────┘
         ↓                ↓
    [RESCHEDULED]    [DISPUTED]
         ↓                ↓
    Fix the issue   Admin reviews
         ↓                ↓
    Complete        Admin decides
         ↓                ↓
    Resume     ┌─────────┴──────────┐
    Warranty   │                    │
               │  Approve    Reject │
               │  Customer   Customer│
               │  Claim      Claim  │
               │     ↓          ↓   │
               │ Provider   Customer│
               │ Must Fix   Loses   │
               │     ↓          ↓   │
               │ Reschedule Warranty│
               │            Ends    │
               └────────────────────┘
```

### Backjob Status States

```
┌─────────────────────────────────────────────────────────────┐
│              BACKJOB STATUS TRANSITIONS                      │
└─────────────────────────────────────────────────────────────┘

    Customer Applies for Backjob
              ↓
         [APPROVED] ────────────────┐
              ↓                     │
         Provider Action:           │
              ↓                     │
    ┌─────────┴──────────┐          │
    │                    │          │
    DISPUTE          RESCHEDULE     │
    ↓                    ↓          │
[DISPUTED]          [RESCHEDULED]   │
    ↓                    ↓          │
    Admin Reviews    Fix Applied    │
    ↓                    ↓          │
┌───┴────┐         Resume Warranty  │
│        │                          │
APPROVE  REJECT         Customer    │
CLAIM    CLAIM          Cancels     │
↓        ↓                  ↓        │
Back to  [CANCELLED-    [CANCELLED- │
APPROVED BY-ADMIN]      BY-CUSTOMER]│
         ↓                  ↓        │
      Warranty         Resume        │
      Ends             Warranty      │
                                     │
                                     │
         Admin Cancels               │
         on behalf of user           │
                ↓                    │
         [CANCELLED-BY-USER] ←───────┘
                ↓
           Resume Warranty
```

---

## Dispute Resolution Workflow

### Complete Dispute Flow

```
┌──────────────────────────────────────────────────────────────┐
│               DISPUTE RESOLUTION PROCESS                      │
└──────────────────────────────────────────────────────────────┘

CUSTOMER APPLIES FOR BACKJOB
         ↓
    Status: APPROVED
         ↓
    Provider Sees Claim
         ↓
    Disagrees with Claim?
         ↓
    ┌──────────────────────────┐
    │  POST /backjobs/:id/dispute │
    │  - dispute_reason           │
    │  - dispute_evidence         │
    └──────────────────────────┘
         ↓
    Status: DISPUTED
         ↓
    ┌──────────────────────────┐
    │  NOTIFICATIONS:          │
    │  - Customer notified     │
    │  - Admin notified        │
    └──────────────────────────┘
         ↓
    Admin Reviews Case
         ↓
    ┌──────────────────────────┐
    │  ADMIN REVIEWS:          │
    │  1. Customer evidence    │
    │  2. Provider evidence    │
    │  3. Appointment history  │
    │  4. User histories       │
    │  5. Similar cases        │
    └──────────────────────────┘
         ↓
    Admin Makes Decision
         ↓
    ┌────────────┬─────────────┐
    │            │             │
    │  APPROVE   │   REJECT    │
    │  CUSTOMER  │  CUSTOMER   │
    │  CLAIM     │   CLAIM     │
    │            │             │
    └────┬───────┴──────┬──────┘
         ↓              ↓
    ┌────────────┐  ┌────────────┐
    │ Provider   │  │ Warranty   │
    │ Must Fix   │  │ Ends       │
    │ Issue      │  │            │
    │            │  │ Provider   │
    │ Status:    │  │ Wins       │
    │ APPROVED   │  │            │
    │            │  │ Status:    │
    │ Provider   │  │ CANCELLED- │
    │ Reschedules│  │ BY-ADMIN   │
    └────────────┘  └────────────┘
         ↓              ↓
    Fix Applied    Appointment:
         ↓         COMPLETED
    Resume             ↓
    Warranty      Case Closed
         ↓
    Complete
    Workflow
```

### Admin Decision Tree

```
┌──────────────────────────────────────────────────────────────┐
│            ADMIN DISPUTE DECISION TREE                        │
└──────────────────────────────────────────────────────────────┘

                    START: Review Dispute
                            ↓
            ┌───────────────┴───────────────┐
            │                               │
        Customer                        Provider
        Evidence                        Evidence
        Review                          Review
            ↓                               ↓
    ┌───────────────┐               ┌───────────────┐
    │ Is evidence   │               │ Is evidence   │
    │ convincing?   │               │ convincing?   │
    └───────┬───────┘               └───────┬───────┘
            │                               │
    ┌───────┴────────┐              ┌───────┴────────┐
    │                │              │                │
   YES              NO             YES              NO
    │                │              │                │
    ↓                ↓              ↓                ↓
Strong          Weak            Strong          Weak
Customer        Customer        Provider        Provider
Case            Case            Case            Case
    │                │              │                │
    └────────────────┴──────────────┴────────────────┘
                            ↓
                Check Additional Factors
                            ↓
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    Provider          Customer            Appointment
    History           History             Details
        │                   │                   │
        ↓                   ↓                   ↓
    High rating?     Many complaints?    Clear defect?
    Few disputes?    False claims?       Installation issue?
        │                   │                   │
        └───────────────────┴───────────────────┘
                            ↓
                    MAKE DECISION
                            ↓
        ┌───────────────────┴───────────────────┐
        │                                       │
    APPROVE                                REJECT
    Customer Claim                         Customer Claim
        │                                       │
        ↓                                       ↓
    Provider must fix                     Warranty ends
    Backjob status: APPROVED              Backjob status: CANCELLED-BY-ADMIN
    Appointment: BACKJOB                  Appointment: COMPLETED
        │                                       │
        ↓                                       ↓
    Provider reschedules                  Case closed
    and fixes issue                       Provider wins
```

---

## No-Show Handling Workflow

### Customer No-Show Process

```
┌──────────────────────────────────────────────────────────────┐
│              CUSTOMER NO-SHOW WORKFLOW                        │
└──────────────────────────────────────────────────────────────┘

SCHEDULED APPOINTMENT TIME
         ↓
    Provider Arrives at Location
         ↓
    Waits for Customer
         ↓
    Customer Doesn't Show Up
         ↓
    ┌──────────────────────────┐
    │  PROVIDER ACTIONS:       │
    │  1. Try calling customer │
    │  2. Wait 15-30 minutes   │
    │  3. Take evidence:       │
    │     - GPS location       │
    │     - Timestamp photo    │
    │     - Location photo     │
    └──────────────────────────┘
         ↓
    Report to Admin/Support
         ↓
    ┌──────────────────────────┐
    │  ADMIN RECEIVES:         │
    │  - Appointment details   │
    │  - Provider evidence     │
    │  - Timestamp             │
    │  - Location proof        │
    └──────────────────────────┘
         ↓
    Admin Verifies Evidence
         ↓
    ┌──────────────────────────┐
    │  VERIFICATION CHECKS:    │
    │  - GPS matches location  │
    │  - Timestamp is correct  │
    │  - Photos are genuine    │
    │  - Customer unreachable  │
    └──────────────────────────┘
         ↓
    Evidence Valid?
         ↓
    ┌────────┬────────┐
    │        │        │
   YES      NO     UNCLEAR
    │        │        │
    ↓        ↓        ↓
  Confirm  Reject  Request
  No-Show  Report  More Info
    │        │        │
    ↓        ↓        └──→ Loop back
  ┌──────────────────────────┐
  │  POST /admin-cancel      │
  │  - cancellation_reason   │
  │  - admin_notes          │
  │  - penalty_applied      │
  └──────────────────────────┘
         ↓
  ┌──────────────────────────┐
  │  SYSTEM ACTIONS:         │
  │  1. Cancel appointment   │
  │  2. Apply penalty (₱200) │
  │  3. Log in system        │
  │  4. Notify customer      │
  │  5. Compensate provider  │
  └──────────────────────────┘
         ↓
    Case Closed
    Provider Compensated
    Customer Penalized
```

### Provider No-Show Process

```
┌──────────────────────────────────────────────────────────────┐
│              PROVIDER NO-SHOW WORKFLOW                        │
└──────────────────────────────────────────────────────────────┘

SCHEDULED APPOINTMENT TIME
         ↓
    Customer Waits at Location
         ↓
    Provider Doesn't Show Up
         ↓
    ┌──────────────────────────┐
    │  CUSTOMER ACTIONS:       │
    │  1. Try calling provider │
    │  2. Wait 30 minutes      │
    │  3. Take evidence:       │
    │     - Timestamp photo    │
    │     - Location photo     │
    │     - Call logs          │
    └──────────────────────────┘
         ↓
    Report to Admin/Support
         ↓
    ┌──────────────────────────┐
    │  ADMIN RECEIVES:         │
    │  - Appointment details   │
    │  - Customer evidence     │
    │  - Timestamp             │
    │  - Call attempt logs     │
    └──────────────────────────┘
         ↓
    Admin Verifies Evidence
         ↓
    ┌──────────────────────────┐
    │  VERIFICATION CHECKS:    │
    │  - Customer at location  │
    │  - Timestamp is correct  │
    │  - Provider unreachable  │
    │  - No prior notification │
    └──────────────────────────┘
         ↓
    Evidence Valid?
         ↓
       YES
         ↓
  ┌──────────────────────────┐
  │  POST /admin-cancel      │
  │  - cancellation_reason   │
  │  - admin_notes          │
  │  - provider_penalty     │
  └──────────────────────────┘
         ↓
  ┌──────────────────────────┐
  │  SYSTEM ACTIONS:         │
  │  1. Cancel appointment   │
  │  2. Apply provider penalty│
  │     (10 points)          │
  │  3. Log in system        │
  │  4. Notify provider      │
  │  5. Refund customer      │
  │  6. Compensate customer  │
  └──────────────────────────┘
         ↓
    Case Closed
    Customer Refunded
    Provider Penalized
```

---

## Warranty System States

### Warranty Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│               WARRANTY SYSTEM LIFECYCLE                       │
└──────────────────────────────────────────────────────────────┘

SERVICE COMPLETED BY PROVIDER
         ↓
    Provider marks FINISHED
         ↓
    ┌──────────────────────────┐
    │  finished_at = now       │
    │  warranty_expires_at =   │
    │    finished_at + days    │
    └──────────────────────────┘
         ↓
    Customer Confirms COMPLETED
         ↓
    ┌──────────────────────────┐
    │  completed_at = now      │
    │  Status = IN-WARRANTY    │
    └──────────────────────────┘
         ↓
    ┌─────────────────────────────────────┐
    │       WARRANTY ACTIVE               │
    │  ┌─────────────────────────────┐    │
    │  │ Days Countdown:             │    │
    │  │ Day 1  [30 days left]       │    │
    │  │ Day 2  [29 days left]       │    │
    │  │ Day 3  [28 days left]       │    │
    │  │ ...                         │    │
    │  └─────────────────────────────┘    │
    └─────────────────────────────────────┘
         ↓
    Issue Found?
         ↓
    ┌────────┬────────┐
    │        │        │
   YES      NO       NO
  Issue   Normal    Issue
  Found    Use
    │        │
    ↓        ↓
  BACKJOB  Continue
  APPLIED  Warranty
    │        │
    ↓        ↓
  ┌──────────────────────────┐
  │  WARRANTY PAUSED         │
  │  warranty_paused_at = now│
  │  warranty_remaining_days │
  │    = calculated          │
  │  Status = BACKJOB        │
  └──────────────────────────┘
    │        │
    │        ↓
    │   Time Passes
    │        ↓
    │   30 Days Expire
    │        ↓
    │   ┌──────────────────────────┐
    │   │  WARRANTY EXPIRED        │
    │   │  Status = EXPIRED        │
    │   └──────────────────────────┘
    │
    ↓
  Backjob Resolved/Disputed/Cancelled
    ↓
  ┌──────────────────────────┐
  │  WARRANTY RESUMED        │
  │  warranty_expires_at =   │
  │    now + remaining_days  │
  │  warranty_paused_at = null│
  │  warranty_remaining_days │
  │    = null                │
  │  Status = IN-WARRANTY    │
  └──────────────────────────┘
    ↓
  Continue countdown from
  where it was paused
```

### Warranty Pause/Resume Logic

```
┌──────────────────────────────────────────────────────────────┐
│           WARRANTY PAUSE/RESUME CALCULATION                   │
└──────────────────────────────────────────────────────────────┘

EXAMPLE SCENARIO:
- Warranty period: 30 days
- Service completed: Oct 1, 2025
- Warranty expires: Oct 31, 2025

Timeline:
Oct 1  ──────────────────────────────────────────► Oct 31
       [Service Done]           [Warranty Ends]

Customer uses service normally for 12 days
Oct 1 ──────────────► Oct 12
      [12 days passed]

Oct 13: Customer finds issue, applies for backjob

At this point:
- Days elapsed: 12 days
- Days remaining: 18 days
- Current date: Oct 13

┌──────────────────────────┐
│  BACKJOB APPLIED         │
│  warranty_paused_at =    │
│    Oct 13, 2025          │
│  warranty_remaining_days │
│    = 18                  │
└──────────────────────────┘

Warranty countdown STOPS
Provider has time to fix issue
Could take days or weeks

Oct 13 ───► Oct 20 ───► Oct 27
       [PAUSED - No countdown]

Oct 28: Backjob resolved (cancelled/disputed)

┌──────────────────────────┐
│  WARRANTY RESUMED        │
│  new_warranty_expires_at │
│    = Oct 28 + 18 days    │
│    = Nov 15, 2025        │
│  warranty_paused_at =    │
│    null                  │
│  warranty_remaining_days │
│    = null                │
└──────────────────────────┘

Timeline continues:
Oct 28 ───────────────────────────► Nov 15
       [Resume: 18 days left]    [Warranty Ends]

Customer gets full 18 remaining days!
```

---

## Admin Decision Trees

### Dispute Resolution Decision Tree

```
┌──────────────────────────────────────────────────────────────┐
│         ADMIN DISPUTE RESOLUTION DECISION TREE                │
└──────────────────────────────────────────────────────────────┘

                     DISPUTED BACKJOB
                            ↓
              ┌─────────────┴─────────────┐
              │                           │
        CUSTOMER CLAIM              PROVIDER DISPUTE
              ↓                           ↓
    ┌──────────────────┐        ┌──────────────────┐
    │ Review Evidence: │        │ Review Evidence: │
    │ - Photos         │        │ - Photos         │
    │ - Videos         │        │ - Installation   │
    │ - Description    │        │ - Documentation  │
    └────────┬─────────┘        └────────┬─────────┘
             │                           │
             └─────────────┬─────────────┘
                           ↓
                    ┌──────────────┐
                    │ CHECK FACTORS│
                    └──────┬───────┘
                           ↓
        ┌──────────────────┼──────────────────┐
        │                  │                  │
    TECHNICAL         BEHAVIORAL         HISTORICAL
    FACTORS           FACTORS            FACTORS
        ↓                  ↓                  ↓
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │Is issue │      │Customer │      │Provider │
    │related  │      │history? │      │history? │
    │to work  │      │         │      │         │
    │done?    │      │Reliable?│      │Good     │
    │         │      │Multiple │      │ratings? │
    │Clear    │      │claims?  │      │Few      │
    │defect?  │      │         │      │disputes?│
    └────┬────┘      └────┬────┘      └────┬────┘
         │                │                │
         └────────────────┼────────────────┘
                          ↓
                   WEIGH EVIDENCE
                          ↓
        ┌─────────────────┴─────────────────┐
        │                                   │
  FAVOR CUSTOMER                      FAVOR PROVIDER
        ↓                                   ↓
  ┌─────────────┐                     ┌─────────────┐
  │ Customer    │                     │ Provider    │
  │ evidence is │                     │ evidence is │
  │ stronger    │                     │ stronger    │
  │             │                     │             │
  │ OR          │                     │ OR          │
  │             │                     │             │
  │ Provider    │                     │ Customer    │
  │ has pattern │                     │ has pattern │
  │ of similar  │                     │ of false    │
  │ issues      │                     │ claims      │
  └──────┬──────┘                     └──────┬──────┘
         │                                   │
         ↓                                   ↓
  ┌─────────────┐                     ┌─────────────┐
  │ APPROVE     │                     │ REJECT      │
  │ CUSTOMER    │                     │ CUSTOMER    │
  │ CLAIM       │                     │ CLAIM       │
  │             │                     │             │
  │ Action:     │                     │ Action:     │
  │ "approve"   │                     │ "cancel-by- │
  │             │                     │  admin"     │
  └──────┬──────┘                     └──────┬──────┘
         │                                   │
         ↓                                   ↓
  Provider must fix                   Warranty ends
  Backjob: APPROVED                   Backjob: CANCELLED-BY-ADMIN
  Appointment: BACKJOB                Appointment: COMPLETED
         │                                   │
         ↓                                   ↓
  Provider reschedules                 Case closed
  Fix issue                            Provider wins
```

### No-Show Verification Decision Tree

```
┌──────────────────────────────────────────────────────────────┐
│         NO-SHOW VERIFICATION DECISION TREE                    │
└──────────────────────────────────────────────────────────────┘

                  NO-SHOW REPORT RECEIVED
                            ↓
                ┌───────────┴───────────┐
                │                       │
          CUSTOMER                PROVIDER
          NO-SHOW                 NO-SHOW
                │                       │
                ↓                       ↓
    ┌──────────────────┐    ┌──────────────────┐
    │ Provider Reports │    │ Customer Reports │
    │ Evidence:        │    │ Evidence:        │
    │ - GPS location   │    │ - Timestamp      │
    │ - Timestamp      │    │ - Location       │
    │ - Photos         │    │ - Call logs      │
    │ - Call attempts  │    │ - Photos         │
    └────────┬─────────┘    └────────┬─────────┘
             │                       │
             └───────────┬───────────┘
                         ↓
                  VERIFY EVIDENCE
                         ↓
        ┌────────────────┼────────────────┐
        │                │                │
    LOCATION        TIMESTAMP         CONTACT
    CHECK           CHECK             ATTEMPTS
        ↓                │                ↓
    GPS matches     Time is         Multiple
    appointment     correct?        attempts?
    location?       Within          
                    window?         Party
        ↓                ↓           unreachable?
    ┌────────┐      ┌────────┐      ┌────────┐
    │ YES/NO │      │ YES/NO │      │ YES/NO │
    └───┬────┘      └───┬────┘      └───┬────┘
        │               │               │
        └───────────────┼───────────────┘
                        ↓
              ALL CHECKS PASS?
                        ↓
        ┌───────────────┴───────────────┐
        │                               │
       YES                             NO
        │                               │
        ↓                               ↓
  EVIDENCE VALID                  EVIDENCE WEAK
        ↓                               ↓
  ┌──────────────┐              ┌──────────────┐
  │ CONFIRM      │              │ REQUEST MORE │
  │ NO-SHOW      │              │ EVIDENCE     │
  └──────┬───────┘              └──────┬───────┘
         │                             │
         ↓                             └──→ Loop back
  ┌──────────────┐
  │ APPLY PENALTY│
  │ & CANCEL     │
  └──────┬───────┘
         │
         ↓
  ┌──────────────────────┐
  │ CUSTOMER NO-SHOW:    │
  │ - Penalty: ₱200      │
  │ - Compensate provider│
  │ - Log incident       │
  └──────┬───────────────┘
         │
         ↓
  ┌──────────────────────┐
  │ PROVIDER NO-SHOW:    │
  │ - Penalty: 10 points │
  │ - Refund customer    │
  │ - Compensate customer│
  └──────────────────────┘
         ↓
    CASE CLOSED
```

---

## Quick Reference Legend

### Status Color Codes (Recommended)

```
┌────────────────┬──────────┬─────────────────────┐
│ Status         │ Color    │ Meaning             │
├────────────────┼──────────┼─────────────────────┤
│ PENDING        │ 🟡 Yellow│ Awaiting action     │
│ ACCEPTED       │ 🔵 Blue  │ Confirmed           │
│ SCHEDULED      │ 🔵 Blue  │ Planned             │
│ ON-THE-WAY     │ 🟠 Orange│ In progress         │
│ IN-PROGRESS    │ 🟠 Orange│ Active work         │
│ FINISHED       │ 🟣 Purple│ Awaiting confirm    │
│ COMPLETED      │ 🟢 Green │ Successfully done   │
│ IN-WARRANTY    │ 🟢 Green │ Active warranty     │
│ BACKJOB        │ 🟠 Orange│ Issue being fixed   │
│ DISPUTED       │ 🔴 Red   │ Needs admin review  │
│ CANCELLED      │ ⚫ Gray  │ Terminated          │
│ EXPIRED        │ ⚫ Gray  │ Warranty ended      │
└────────────────┴──────────┴─────────────────────┘
```

### Action Symbols

```
┌──────────┬─────────────────────────────┐
│ Symbol   │ Meaning                     │
├──────────┼─────────────────────────────┤
│    ↓     │ Proceeds to next step       │
│    →     │ Transitions to state        │
│   ┌─┐    │ Decision point              │
│   │ │    │ Process/Action              │
│   └─┘    │                             │
│    ✅    │ Required/Approved           │
│    ❌    │ Not allowed/Rejected        │
│    ⚠️    │ Warning/Caution             │
│    📧    │ Email notification          │
│    🔔    │ Push notification           │
│    💰    │ Payment/Penalty             │
└──────────┴─────────────────────────────┘
```

---

## Implementation Tips

### For Frontend Developers

1. **Use status colors consistently**
   - Implement color legend across all appointment views
   - Use same colors in mobile and web apps

2. **Show visual status progress**
   - Implement progress bars or stepper components
   - Highlight current status and show next possible states

3. **Provide clear action buttons**
   - Show only valid actions for current status
   - Disable invalid transitions
   - Show confirmation dialogs for critical actions

4. **Implement countdown timers**
   - Show warranty days remaining
   - Alert when warranty is about to expire (3 days)
   - Show "paused" indicator during backjobs

### For Backend Developers

1. **Validate status transitions**
   - Check current status before allowing transitions
   - Return clear error messages for invalid transitions

2. **Implement automatic warranty expiration**
   - Run daily cron job to check expired warranties
   - Update appointment status automatically

3. **Log all status changes**
   - Track who made the change
   - Track when the change was made
   - Include reason for change

---

## Testing Checklist

### Status Transition Testing

```
☐ Test valid status transitions
  ☐ pending → accepted
  ☐ accepted → scheduled
  ☐ scheduled → on-the-way
  ☐ on-the-way → in-progress
  ☐ in-progress → finished
  ☐ finished → completed
  ☐ completed → in-warranty
  ☐ in-warranty → backjob

☐ Test invalid status transitions
  ☐ pending → finished (should fail)
  ☐ completed → pending (should fail)
  ☐ cancelled → any (should fail)

☐ Test cancellation from various states
  ☐ Cancel from pending
  ☐ Cancel from scheduled
  ☐ Cancel from on-the-way
  ☐ Cancel from in-progress (admin only)
```

### Warranty System Testing

```
☐ Test warranty start
  ☐ Customer confirms completion
  ☐ Warranty expiry date calculated correctly
  ☐ Status changes to in-warranty

☐ Test warranty pause
  ☐ Customer applies for backjob
  ☐ Remaining days calculated correctly
  ☐ Countdown stops

☐ Test warranty resume
  ☐ Backjob cancelled
  ☐ New expiry date calculated correctly
  ☐ Countdown resumes from paused point

☐ Test warranty expiration
  ☐ Automatic expiration on due date
  ☐ Status changes to expired
```

---

**Visual Guide Version:** 1.0  
**Last Updated:** October 3, 2025  
**Maintained By:** Fixmo Backend Team
