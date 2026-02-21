const OPERATOR_ID = process.env.HEDERA_OPERATOR_ID || '';
const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY || '';
const MOCK_MODE = !OPERATOR_ID || !OPERATOR_KEY;

// Cache the NFT collection token ID so we only create it once per process.
// Set HEDERA_NFT_TOKEN_ID to reuse an existing collection across restarts.
let cachedNftTokenId: string | null = process.env.HEDERA_NFT_TOKEN_ID ?? null;

/**
 * Creates the Mudra Agent iNFT collection on Hedera Testnet (once per env).
 * Returns the token ID string (e.g. "0.0.12345").
 */
async function getOrCreateNftCollection(): Promise<string> {
  if (cachedNftTokenId) return cachedNftTokenId;

  const {
    Client,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    PrivateKey,
    AccountId,
  } = await import('@hashgraph/sdk');

  const operatorKey = PrivateKey.fromString(OPERATOR_KEY);
  const client = Client.forTestnet().setOperator(
    AccountId.fromString(OPERATOR_ID),
    operatorKey
  );

  try {
    const tx = await new TokenCreateTransaction()
      .setTokenName('Mudra Agent iNFT')
      .setTokenSymbol('AEGIS')
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(TokenSupplyType.Infinite)
      .setTreasuryAccountId(AccountId.fromString(OPERATOR_ID))
      .setAdminKey(operatorKey)
      .setSupplyKey(operatorKey)
      .setTokenMemo('Mudra on-chain AI agent identity — 0g iNFT')
      .execute(client);

    const receipt = await tx.getReceipt(client);
    cachedNftTokenId = receipt.tokenId?.toString() ?? null;
    if (!cachedNftTokenId) throw new Error('TokenId not returned');
    return cachedNftTokenId;
  } finally {
    client.close();
  }
}

/**
 * Mints a single Mudra agent iNFT on Hedera.
 *
 * @param metadata  The 0g URI string: `0g://<rootHash>` — stored as NFT metadata bytes.
 * @returns         Fully-qualified serial: `<tokenId>/<serialNumber>` (e.g. "0.0.12345/7")
 *                  so it can be pasted directly into HashScan.
 */
export async function mintHederaNft(metadata: string): Promise<string> {
  if (MOCK_MODE) {
    // Mock returns a deterministic serial based on content so demos are reproducible
    const { createHash } = await import('crypto');
    const serial = parseInt(createHash('sha256').update(metadata).digest('hex').slice(0, 6), 16) % 9999 + 1;
    return `0.0.mock-nft/${serial}`;
  }

  try {
    const {
      Client,
      TokenMintTransaction,
      TokenId,
      PrivateKey,
      AccountId,
    } = await import('@hashgraph/sdk');

    const operatorKey = PrivateKey.fromString(OPERATOR_KEY);
    const client = Client.forTestnet().setOperator(
      AccountId.fromString(OPERATOR_ID),
      operatorKey
    );

    try {
      const tokenId = await getOrCreateNftCollection();

      const tx = await new TokenMintTransaction()
        .setTokenId(TokenId.fromString(tokenId))
        .addMetadata(Buffer.from(metadata, 'utf-8'))
        .execute(client);

      const receipt = await tx.getReceipt(client);
      const serial = receipt.serials?.[0]?.toString() ?? '1';
      return `${tokenId}/${serial}`;
    } finally {
      client.close();
    }
  } catch (e) {
    console.error('[Hedera NFT] mint failed, using mock:', e);
    const { createHash } = await import('crypto');
    const serial = parseInt(createHash('sha256').update(metadata).digest('hex').slice(0, 6), 16) % 9999 + 1;
    return `0.0.mock-nft/${serial}`;
  }
}
