# Warranty Pause System for Backjobs - Implementation Summary

## Overview
Implemented a comprehensive warranty pause system that suspends warranty countdown when a backjob is filed and resumes it appropriately based on backjob resolution.

## Database Changes
Added to `Appointment` model in `schema.prisma`:
- `warranty_paused_at: DateTime?` - Timestamp when warranty was paused
- `warranty_remaining_days: Int?` - Days remaining when paused

## Warranty Pause Logic

### 1. When Backjob is Applied (`applyBackjob`)
- **Before**: Warranty continued to countdown during backjob period
- **Now**: 
  - Calculates remaining warranty days at time of backjob application
  - Stores `warranty_paused_at` timestamp 
  - Stores `warranty_remaining_days` for future resumption
  - Prevents warranty expiration during backjob resolution

### 2. When Provider Reschedules (`rescheduleFromBackjob`)
- **Behavior**: Appointment moves from `backjob` → `scheduled`
- **Warranty**: Pause fields remain until work is completed again
- **Resumption**: Will happen when work is marked `finished` or `in-warranty`

### 3. When Rescheduled Work is Completed (`updateAppointmentStatus`)
- **Status `finished` or `in-warranty`**:
  - Checks for paused warranty (`warranty_paused_at` exists)
  - If paused: Resumes warranty using `warranty_remaining_days`
  - If not paused: Calculates warranty normally
  - Clears pause fields (`warranty_paused_at = null`, `warranty_remaining_days = null`)

### 4. When Backjob is Disputed (`disputeBackjob`)
- **Before**: Warranty continued countdown during dispute
- **Now**:
  - Immediately resumes warranty from paused state
  - Sets `appointment_status = 'in-warranty'`
  - Calculates new expiry date using remaining days
  - Clears pause fields

### 5. When Customer Cancels Backjob (`cancelBackjobByCustomer`)
- **Always**: Sets `appointment_status = 'in-warranty'`
- **If warranty was paused**: Resumes warranty from remaining days
- **If warranty not paused**: Just updates status (handles edge cases)
- **Result**: Customer can continue using remaining warranty time

### 6. Admin Actions (`updateBackjobStatus`)
- **Cancel by Admin**: Ends warranty immediately (sets expired)
- **Cancel by User**: Resumes warranty from paused state
- Both actions clear warranty pause fields appropriately

### 7. Auto-Completion Job (`server.js`)
- **Before**: Could auto-complete appointments with paused warranties
- **Now**: Excludes appointments where `warranty_paused_at IS NOT NULL`
- Only auto-completes warranties that are actively counting down

## Benefits
1. **Fair to Customers**: Warranty doesn't expire while waiting for provider to reschedule backjob
2. **Fair to Providers**: Dispute resolution doesn't unfairly extend warranty period
3. **Proper Resolution**: Warranty resumes from exact point it was paused
4. **Admin Control**: Admins can end or resume warranties based on resolution type

## Example Workflow
1. Customer completes job → 30-day warranty starts
2. Day 10: Customer files backjob → Warranty pauses (20 days remaining stored)
3. Day 15: Provider reschedules → Warranty still paused
4. Day 20: Provider completes rescheduled work → Warranty resumes with 20 days from completion
5. Result: Customer gets full remaining warranty period after backjob resolution

## Database Migration
Created migration: `20250929165633_add_warranty_pause_fields`
- Added `warranty_paused_at` field
- Added `warranty_remaining_days` field
- Both fields are nullable for backward compatibility