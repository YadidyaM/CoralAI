-- User Wallets Table
CREATE TABLE user_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    private_key TEXT NOT NULL,
    mnemonic TEXT NOT NULL,
    network TEXT NOT NULL,
    wallet_type TEXT NOT NULL CHECK (wallet_type IN ('solana', 'ethereum')),
    name TEXT,
    is_primary BOOLEAN DEFAULT false,
    balance DECIMAL(20, 8) DEFAULT 0,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, address)
);

-- User NFTs Table
CREATE TABLE user_nfts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    mint_address TEXT NOT NULL,
    token_id TEXT,
    network TEXT NOT NULL,
    collection_address TEXT,
    attributes JSONB,
    metadata JSONB,
    transaction_hash TEXT NOT NULL,
    is_favorited BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mint_address, token_id)
);

-- Wallet Connections Table (for external wallet connections)
CREATE TABLE wallet_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    wallet_type TEXT NOT NULL CHECK (wallet_type IN ('phantom', 'metamask', 'solflare', 'backpack', 'other')),
    network TEXT NOT NULL,
    connection_method TEXT NOT NULL CHECK (connection_method IN ('extension', 'walletconnect', 'direct')),
    is_active BOOLEAN DEFAULT true,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    disconnected_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, wallet_address)
);

-- Create indexes for performance
CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX idx_user_wallets_address ON user_wallets(address);
CREATE INDEX idx_user_wallets_wallet_type ON user_wallets(wallet_type);
CREATE INDEX idx_user_wallets_is_primary ON user_wallets(is_primary);

CREATE INDEX idx_user_nfts_user_id ON user_nfts(user_id);
CREATE INDEX idx_user_nfts_wallet_id ON user_nfts(wallet_id);
CREATE INDEX idx_user_nfts_mint_address ON user_nfts(mint_address);
CREATE INDEX idx_user_nfts_network ON user_nfts(network);
CREATE INDEX idx_user_nfts_is_favorited ON user_nfts(is_favorited);

CREATE INDEX idx_wallet_connections_user_id ON wallet_connections(user_id);
CREATE INDEX idx_wallet_connections_wallet_address ON wallet_connections(wallet_address);
CREATE INDEX idx_wallet_connections_is_active ON wallet_connections(is_active);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_wallets_updated_at 
    BEFORE UPDATE ON user_wallets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_nfts_updated_at 
    BEFORE UPDATE ON user_nfts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_connections ENABLE ROW LEVEL SECURITY;

-- User Wallets policies
CREATE POLICY "Users can view their own wallets" ON user_wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wallets" ON user_wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets" ON user_wallets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallets" ON user_wallets
    FOR DELETE USING (auth.uid() = user_id);

-- User NFTs policies
CREATE POLICY "Users can view their own NFTs" ON user_nfts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own NFTs" ON user_nfts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own NFTs" ON user_nfts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own NFTs" ON user_nfts
    FOR DELETE USING (auth.uid() = user_id);

-- Wallet Connections policies
CREATE POLICY "Users can view their own wallet connections" ON wallet_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wallet connections" ON wallet_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet connections" ON wallet_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallet connections" ON wallet_connections
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to ensure only one primary wallet per user per wallet type
CREATE OR REPLACE FUNCTION ensure_single_primary_wallet()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        -- Set all other wallets of the same type to not primary
        UPDATE user_wallets 
        SET is_primary = false 
        WHERE user_id = NEW.user_id 
          AND wallet_type = NEW.wallet_type 
          AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER ensure_single_primary_wallet_trigger
    BEFORE INSERT OR UPDATE ON user_wallets
    FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_wallet();

-- Create function to calculate user portfolio stats
CREATE OR REPLACE FUNCTION get_user_portfolio_stats(user_uuid UUID)
RETURNS TABLE (
    total_wallets INTEGER,
    total_nfts INTEGER,
    total_balance DECIMAL,
    solana_wallets INTEGER,
    ethereum_wallets INTEGER,
    active_connections INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM user_wallets WHERE user_id = user_uuid),
        (SELECT COUNT(*)::INTEGER FROM user_nfts WHERE user_id = user_uuid),
        (SELECT COALESCE(SUM(balance), 0) FROM user_wallets WHERE user_id = user_uuid),
        (SELECT COUNT(*)::INTEGER FROM user_wallets WHERE user_id = user_uuid AND wallet_type = 'solana'),
        (SELECT COUNT(*)::INTEGER FROM user_wallets WHERE user_id = user_uuid AND wallet_type = 'ethereum'),
        (SELECT COUNT(*)::INTEGER FROM wallet_connections WHERE user_id = user_uuid AND is_active = true);
END;
$$ language 'plpgsql';

-- Create function to get user assets summary
CREATE OR REPLACE FUNCTION get_user_assets_summary(user_uuid UUID)
RETURNS TABLE (
    wallet_address TEXT,
    wallet_type TEXT,
    wallet_name TEXT,
    balance DECIMAL,
    nft_count INTEGER,
    is_primary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.address,
        w.wallet_type,
        w.name,
        w.balance,
        COUNT(n.id)::INTEGER as nft_count,
        w.is_primary
    FROM user_wallets w
    LEFT JOIN user_nfts n ON w.id = n.wallet_id
    WHERE w.user_id = user_uuid
    GROUP BY w.id, w.address, w.wallet_type, w.name, w.balance, w.is_primary
    ORDER BY w.is_primary DESC, w.created_at DESC;
END;
$$ language 'plpgsql'; 