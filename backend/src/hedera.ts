const OPERATOR_ID = process.env.HEDERA_OPERATOR_ID || '';
const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY || '';
const HTS_TOKEN_ID = process.env.HEDERA_HTS_TOKEN_ID || '0.0.0';
const MOCK_MODE = !OPERATOR_ID || !OPERATOR_KEY;

let topicId: string | null = process.env.HEDERA_TOPIC_ID || null;

export function isMockMode(): boolean {
  return MOCK_MODE;
}

export async function getOrCreateHcsTopic(): Promise<string> {
  if (topicId) return topicId;
  if (MOCK_MODE) {
    topicId = '0.0.mock-topic';
    return topicId;
  }

  try {
    const {
      Client,
      TopicCreateTransaction,
      PrivateKey,
      AccountId,
    } = await import('@hashgraph/sdk');

    const operatorKey = PrivateKey.fromString(OPERATOR_KEY);
    const client = Client.forTestnet()
      .setOperator(AccountId.fromString(OPERATOR_ID), operatorKey);

    const tx = new TopicCreateTransaction()
      .setTopicMemo('Mudra audit trail')
      .freezeWith(client);

    const signTx = await tx.sign(operatorKey);
    const response = await signTx.execute(client);
    const receipt = await response.getReceipt(client);
    topicId = receipt.topicId?.toString() ?? '';
    return topicId;
  } catch {
    topicId = '0.0.mock-topic';
    return topicId;
  }
}

export async function publishToHcs(message: string): Promise<string> {
  if (MOCK_MODE) {
    return `mock-tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  try {
    const {
      Client,
      TopicMessageSubmitTransaction,
      PrivateKey,
      AccountId,
    } = await import('@hashgraph/sdk');

    const operatorKey = PrivateKey.fromString(OPERATOR_KEY);
    const client = Client.forTestnet()
      .setOperator(AccountId.fromString(OPERATOR_ID), operatorKey);

    const tId = await getOrCreateHcsTopic();
    const msg = message.length > 1024 ? message.slice(0, 1020) + '...' : message;

    const tx = new TopicMessageSubmitTransaction()
      .setTopicId(tId)
      .setMessage(msg)
      .freezeWith(client);

    const signTx = await tx.sign(operatorKey);
    const response = await signTx.execute(client);
    await response.getReceipt(client);

    return response.transactionId?.toString() ?? '';
  } catch {
    return `mock-tx-${Date.now()}`;
  }
}

export async function executeHtsTransfer(
  tokenId: string,
  fromAccount: string,
  toAccount: string,
  amount: number
): Promise<string> {
  if (MOCK_MODE || tokenId === '0.0.0') {
    return `mock-hts-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  try {
    const {
      Client,
      TransferTransaction,
      PrivateKey,
      AccountId,
      TokenId,
    } = await import('@hashgraph/sdk');

    const operatorKey = PrivateKey.fromString(OPERATOR_KEY);
    const client = Client.forTestnet()
      .setOperator(AccountId.fromString(OPERATOR_ID), operatorKey);

    const tx = new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(fromAccount), -amount)
      .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(toAccount), amount)
      .freezeWith(client);

    const signTx = await tx.sign(operatorKey);
    const response = await signTx.execute(client);
    await response.getReceipt(client);

    return response.transactionId?.toString() ?? '';
  } catch {
    return `mock-hts-${Date.now()}`;
  }
}

export function getTopicId(): string | null {
  return topicId;
}

export function setTopicId(id: string): void {
  topicId = id;
}
