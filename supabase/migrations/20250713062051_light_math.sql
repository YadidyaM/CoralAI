/*
  # Initial Schema for Solana AI Agents Platform

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `wallet_address` (text, nullable)
      - `avatar` (text, nullable)
      - `onboarding_step` (integer, default 0)
      - `onboarding_completed` (boolean, default false)
      - `risk_tolerance` (text, default 'medium')
      - `investment_goals` (text array, default empty)
      - `notifications` (boolean, default true)
      - `total_transactions` (integer, default 0)
      - `total_volume` (numeric, default 0)
      - `favorite_agent` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `agent_messages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `agent_id` (text)
      - `message` (text)
      - `response` (text, nullable)
      - `message_type` (text, default 'user')
      - `created_at` (timestamp)

    - `feedback`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `type` (text)
      - `rating` (integer, nullable)
      - `title` (text)
      - `content` (text)
      - `agent_id` (text, nullable)
      - `feature` (text, nullable)
      - `status` (text, default 'pending')
      - `created_at` (timestamp)

    - `onboarding_steps`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `step_id` (integer)
      - `step_title` (text)
      - `step_description` (text)
      - `agent_id` (text, nullable)
      - `completed` (boolean, default false)
      - `completed_at` (timestamp, nullable)
      - `created_at` (timestamp)

    - `portfolios`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `total_value` (numeric, default 0)
      - `sol_balance` (numeric, default 0)
      - `tokens` (jsonb, default '[]')
      - `nfts` (jsonb, default '[]')
      - `staking_positions` (jsonb, default '[]')
      - `updated_at` (timestamp)

    - `coordination_logs`
      - `id` (uuid, primary key)
      - `from_agent` (text)
      - `to_agent` (text)
      - `message_type` (text)
      - `payload` (jsonb)
      - `user_id` (uuid, foreign key, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  wallet_address text,
  avatar text,
  onboarding_step integer DEFAULT 0,
  onboarding_completed boolean DEFAULT false,
  risk_tolerance text DEFAULT 'medium' CHECK (risk_tolerance IN ('low', 'medium', 'high')),
  investment_goals text[] DEFAULT '{}',
  notifications boolean DEFAULT true,
  total_transactions integer DEFAULT 0,
  total_volume numeric DEFAULT 0,
  favorite_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create agent_messages table
CREATE TABLE IF NOT EXISTS agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  message text NOT NULL,
  response text,
  message_type text DEFAULT 'user' CHECK (message_type IN ('user', 'agent', 'coordination')),
  created_at timestamptz DEFAULT now()
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('rating', 'suggestion', 'bug', 'testimonial')),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  content text NOT NULL,
  agent_id text,
  feature text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'implemented')),
  created_at timestamptz DEFAULT now()
);

-- Create onboarding_steps table
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  step_id integer NOT NULL,
  step_title text NOT NULL,
  step_description text NOT NULL,
  agent_id text,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, step_id)
);

-- Create portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_value numeric DEFAULT 0,
  sol_balance numeric DEFAULT 0,
  tokens jsonb DEFAULT '[]',
  nfts jsonb DEFAULT '[]',
  staking_positions jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- Create coordination_logs table
CREATE TABLE IF NOT EXISTS coordination_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent text NOT NULL,
  to_agent text NOT NULL,
  message_type text NOT NULL,
  payload jsonb DEFAULT '{}',
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordination_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id::text);

-- Create policies for agent_messages table
CREATE POLICY "Users can read own messages"
  ON agent_messages
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert own messages"
  ON agent_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

-- Create policies for feedback table
CREATE POLICY "Users can read own feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert own feedback"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

-- Create policies for onboarding_steps table
CREATE POLICY "Users can read own onboarding steps"
  ON onboarding_steps
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can manage own onboarding steps"
  ON onboarding_steps
  FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text);

-- Create policies for portfolios table
CREATE POLICY "Users can read own portfolio"
  ON portfolios
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can manage own portfolio"
  ON portfolios
  FOR ALL
  TO authenticated
  USING (user_id::text = auth.uid()::text);

-- Create policies for coordination_logs table
CREATE POLICY "Users can read coordination logs"
  ON coordination_logs
  FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert coordination logs"
  ON coordination_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id::text = auth.uid()::text);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_messages_user_id ON agent_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_agent_id ON agent_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON agent_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_user_id ON onboarding_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_coordination_logs_created_at ON coordination_logs(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();