# TrackFlow - Inventory & Sales Tracker

A lightning-fast, local-first inventory management and sales tracking web application with cloud synchronization via Supabase.

## Features
- **Local-First Architecture:** Instant page loads and zero-latency interactions using `localStorage`.
- **Cloud Synchronization:** Background syncs to Supabase to keep your data securely backed up in the cloud.
- **Client-Side Authentication:** Lightweight gateway to protect against casual unauthorized access.
- **Bilingual Support:** Full English and Urdu translations for accessible use.
- **PDF & Image Exports:** Instantly generate and copy invoices as images for easy sharing on WhatsApp.
- **Comprehensive Ledger:** Track sales, purchases, labour charges, and payments all in one place.

## Tech Stack
- Vanilla HTML, CSS (Glassmorphism design), JavaScript
- Supabase (PostgreSQL Database as a Service)
- Vercel (Hosting & Deployment)

## Deployment

This application is designed to be easily deployed on **Vercel**. 

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. The application requires zero build steps (it's pure HTML/JS). Vercel will instantly deploy it.

## Database Setup

Run the following SQL queries in your Supabase SQL Editor to initialize the cloud tables:

```sql
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    stock NUMERIC DEFAULT 0,
    avg_rate NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'Kg',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    txn_id TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT,
    type TEXT NOT NULL, 
    person_name TEXT NOT NULL,
    item_name TEXT,
    price NUMERIC DEFAULT 0,
    quantity NUMERIC DEFAULT 1,
    unit TEXT DEFAULT '-',
    freight NUMERIC DEFAULT 0,
    delivered BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_transactions_txn_id ON transactions(txn_id);
CREATE INDEX idx_transactions_person_name ON transactions(person_name);
```
