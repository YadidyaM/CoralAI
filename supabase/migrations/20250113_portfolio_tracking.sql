-- Create transactions table for P&L tracking
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'swap', 'stake', 'unstake', 'yield', 'fee')),
    fromToken TEXT NOT NULL,
    toToken TEXT NOT NULL,
    fromAmount DECIMAL(20, 8) NOT NULL,
    toAmount DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    timestamp BIGINT NOT NULL,
    txHash TEXT NOT NULL,
    gasUsed DECIMAL(20, 8) NOT NULL DEFAULT 0,
    gasCost DECIMAL(20, 8) NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')),
    exchange TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create portfolio snapshots table for historical tracking
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    totalValue DECIMAL(20, 8) NOT NULL,
    totalInvested DECIMAL(20, 8) NOT NULL,
    totalPnL DECIMAL(20, 8) NOT NULL,
    pnlPercentage DECIMAL(10, 4) NOT NULL,
    assetBreakdown JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_userId ON transactions(userId);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_userId_timestamp ON transactions(userId, timestamp);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_userId ON portfolio_snapshots(userId);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_timestamp ON portfolio_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_userId_timestamp ON portfolio_snapshots(userId, timestamp);

-- Create RLS policies for security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid()::text = userId);

CREATE POLICY "Users can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid()::text = userId);

CREATE POLICY "Users can update their own transactions" ON transactions
    FOR UPDATE USING (auth.uid()::text = userId);

-- Portfolio snapshots policies
CREATE POLICY "Users can view their own portfolio snapshots" ON portfolio_snapshots
    FOR SELECT USING (auth.uid()::text = userId);

CREATE POLICY "Users can insert their own portfolio snapshots" ON portfolio_snapshots
    FOR INSERT WITH CHECK (auth.uid()::text = userId);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create performance metrics table for caching
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    userId TEXT NOT NULL,
    timeFrame INTEGER NOT NULL,
    calculatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    totalReturn DECIMAL(10, 6) NOT NULL,
    annualizedReturn DECIMAL(10, 6) NOT NULL,
    volatility DECIMAL(10, 6) NOT NULL,
    sharpeRatio DECIMAL(10, 6) NOT NULL,
    maxDrawdown DECIMAL(10, 6) NOT NULL,
    winRate DECIMAL(10, 6) NOT NULL,
    beta DECIMAL(10, 6) NOT NULL,
    alpha DECIMAL(10, 6) NOT NULL,
    valueAtRisk95 DECIMAL(10, 6) NOT NULL,
    valueAtRisk99 DECIMAL(10, 6) NOT NULL,
    UNIQUE(userId, timeFrame)
);

-- Create indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_userId ON performance_metrics(userId);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timeFrame ON performance_metrics(timeFrame);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_calculatedAt ON performance_metrics(calculatedAt);

-- Performance metrics RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own performance metrics" ON performance_metrics
    FOR SELECT USING (auth.uid()::text = userId);

CREATE POLICY "Users can insert their own performance metrics" ON performance_metrics
    FOR INSERT WITH CHECK (auth.uid()::text = userId);

CREATE POLICY "Users can update their own performance metrics" ON performance_metrics
    FOR UPDATE USING (auth.uid()::text = userId);

-- Create AI insights table for caching recommendations
CREATE TABLE IF NOT EXISTS ai_insights (
    id SERIAL PRIMARY KEY,
    userId TEXT NOT NULL,
    timeFrame INTEGER NOT NULL,
    generatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    summary TEXT NOT NULL,
    overallScore INTEGER NOT NULL,
    recommendations JSONB NOT NULL,
    rebalancing JSONB NOT NULL,
    marketInsights JSONB NOT NULL,
    riskAlerts JSONB NOT NULL,
    opportunities JSONB NOT NULL,
    UNIQUE(userId, timeFrame)
);

-- Create indexes for AI insights
CREATE INDEX IF NOT EXISTS idx_ai_insights_userId ON ai_insights(userId);
CREATE INDEX IF NOT EXISTS idx_ai_insights_timeFrame ON ai_insights(timeFrame);
CREATE INDEX IF NOT EXISTS idx_ai_insights_generatedAt ON ai_insights(generatedAt);

-- AI insights RLS
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI insights" ON ai_insights
    FOR SELECT USING (auth.uid()::text = userId);

CREATE POLICY "Users can insert their own AI insights" ON ai_insights
    FOR INSERT WITH CHECK (auth.uid()::text = userId);

CREATE POLICY "Users can update their own AI insights" ON ai_insights
    FOR UPDATE USING (auth.uid()::text = userId);

-- Function to clean up old data periodically
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
    -- Delete portfolio snapshots older than 1 year
    DELETE FROM portfolio_snapshots 
    WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '1 year') * 1000;
    
    -- Delete performance metrics older than 30 days
    DELETE FROM performance_metrics 
    WHERE calculatedAt < NOW() - INTERVAL '30 days';
    
    -- Delete AI insights older than 7 days
    DELETE FROM ai_insights 
    WHERE generatedAt < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Create a sample trigger to run cleanup (optional - would need to be scheduled)
-- This is just for reference - in production, you'd use a cron job or similar
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data();');

-- Add some sample data for testing (optional)
-- INSERT INTO transactions (id, userId, type, fromToken, toToken, fromAmount, toAmount, price, timestamp, txHash, status, exchange)
-- VALUES 
--     ('tx_1', 'user123', 'buy', 'USDC', 'SOL', 1000, 6.25, 160, 1704038400000, '0x123...', 'confirmed', 'Jupiter'),
--     ('tx_2', 'user123', 'buy', 'USDC', 'RAY', 500, 232.56, 2.15, 1704124800000, '0x456...', 'confirmed', 'Raydium');

COMMENT ON TABLE transactions IS 'Stores all user transactions for P&L tracking';
COMMENT ON TABLE portfolio_snapshots IS 'Stores historical portfolio snapshots for performance analysis';
COMMENT ON TABLE performance_metrics IS 'Cached performance metrics to avoid recalculation';
COMMENT ON TABLE ai_insights IS 'Cached AI-generated insights and recommendations'; 