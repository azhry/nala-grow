-- +goose Up
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL DEFAULT '',
    photo_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE babies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    sex VARCHAR(10) NOT NULL CHECK (sex IN ('male', 'female', 'other')),
    photo_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_babies_user_id ON babies(user_id);

CREATE TABLE measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('weight', 'height', 'head_circumference')),
    value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(10) NOT NULL DEFAULT 'metric',
    date DATE NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    out_of_range BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_measurements_baby_id ON measurements(baby_id);
CREATE INDEX idx_measurements_date ON measurements(date);

CREATE TABLE feeding_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    feed_type VARCHAR(20) NOT NULL CHECK (feed_type IN ('breast', 'bottle', 'solids')),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    left_duration_sec INT NOT NULL DEFAULT 0,
    right_duration_sec INT NOT NULL DEFAULT 0,
    amount_ml DECIMAL(8,2),
    milk_type VARCHAR(20) DEFAULT '' CHECK (milk_type IN ('breast_milk', 'formula', 'combination', '')),
    food_name VARCHAR(100) DEFAULT '',
    reaction VARCHAR(50) DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feeding_sessions_baby_id ON feeding_sessions(baby_id);
CREATE INDEX idx_feeding_sessions_started_at ON feeding_sessions(started_at);

CREATE TABLE sleep_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    location VARCHAR(50) NOT NULL DEFAULT 'crib' CHECK (location IN ('crib', 'bed', 'carrier', 'stroller', 'contact')),
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sleep_sessions_baby_id ON sleep_sessions(baby_id);
CREATE INDEX idx_sleep_sessions_started_at ON sleep_sessions(started_at);

CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    achieved_at TIMESTAMPTZ,
    note TEXT NOT NULL DEFAULT '',
    photo_url TEXT NOT NULL DEFAULT '',
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_baby_id ON milestones(baby_id);

-- +goose Down
DROP TABLE IF EXISTS milestones;
DROP TABLE IF EXISTS sleep_sessions;
DROP TABLE IF EXISTS feeding_sessions;
DROP TABLE IF EXISTS measurements;
DROP TABLE IF EXISTS babies;
DROP TABLE IF EXISTS users;
