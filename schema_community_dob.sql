-- SQL Migration Script for Supabase Database
-- Run this in your Supabase SQL Editor

-- 1. Create Community Lookup Table
CREATE TABLE IF NOT EXISTS community (
    id INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Populate Community Table with predefined values:
-- 1: straight man
-- 2: straight woman
-- 3: lgbtq
INSERT INTO community (id, name) VALUES
    (1, 'straight man'),
    (2, 'straight woman'),
    (3, 'lgbtq')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. Add columns to 'users' table
-- 'community' references community(id) (Values: 1, 2, or 3)
-- 'dob' stores Date of Birth in DATE format (YYYY-MM-DD)
ALTER TABLE users ADD COLUMN IF NOT EXISTS community INT REFERENCES community(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
