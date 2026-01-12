# Laravel-Style Job System with Auto-Registration

This project uses a Laravel-inspired job system with BullMQ for background job processing.

## Architecture

```
jobs/
├── BaseJob.ts           # Base class with @Job decorator
├── GenerateInvoiceJob.ts # Invoice generation handler
├── JobRegistry.ts       # Type definitions and auto-import
└── README.md           # This file

queues/
└── mainQueue.ts        # Single queue for all job types

workers/
└── mainWorker.ts       # Single worker that processes all jobs
```

## How It Works (Laravel Style with Auto-Registration)

### 1. Create a Job Handler Class

```typescript
// jobs/SendEmailJob.ts
import { BaseJob, Job } from './BaseJob';

export interface SendEmailJobData {
  to: string;
  subject: string;
  body: string;
}

// Use @Job decorator for auto-registration (like Laravel)
@Job('email')
export class SendEmailJob extends BaseJob<SendEmailJobData> {
  async handle(data: SendEmailJobData): Promise<any> {
    // Your job logic here
    await sendEmail(data.to, data.subject, data.body);
    return { success: true };
  }

  // Optional: Handle failures
  async failed(error: Error, data: SendEmailJobData): Promise<void> {
    console.error(`Failed to send email to ${data.to}:`, error);
  }
}
```

### 2. Import the Job (Auto-Registration)

```typescript
// jobs/JobRegistry.ts
import './SendEmailJob';  // Auto-registers via @Job decorator

// Add to JobDataMap type for type safety
export type JobDataMap = {
  invoice: GenerateInvoiceJobData;
  email: SendEmailJobData;  // Add this
};
```

### 3. Dispatch the Job

```typescript
import { dispatch } from '../queues/mainQueue';

// Dispatch a job (type-safe)
await dispatch('email', {
  to: 'user@example.com',
  subject: 'Welcome',
  body: 'Hello!'
});
```

## Benefits

✅ **Auto-Registration** - Jobs register themselves via `@Job` decorator  
✅ **Single Worker** - One worker processes all job types  
✅ **Type Safety** - Full TypeScript support  
✅ **Laravel-like API** - Familiar `handle()` method pattern  
✅ **Zero Config** - No manual registration needed  
✅ **Easy to Extend** - Just add `@Job` decorator and import  

## Current Jobs

- **invoice** - Generate PDF invoices (`GenerateInvoiceJob`)

## Adding New Jobs (3 Simple Steps)

1. **Create job class with `@Job` decorator:**
```typescript
@Job('email')
export class SendEmailJob extends BaseJob<EmailData> {
  async handle(data: EmailData) { ... }
}


```

2. **Import in JobRegistry.ts:**
```typescript
import './SendEmailJob';
```

3. **Add type to JobDataMap:**
```typescript
export type JobDataMap = {
  email: SendEmailJobData;
};
```

That's it! The decorator automatically registers the job when the class is loaded.
