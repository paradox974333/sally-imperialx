
const { RestClientV5 } = require('bybit-api');

/**
 * Creates a new Bybit sub-account and generates a dedicated API key for it.
 * @param {string} username The desired username for the sub-account.
 * @param {string | null} password The password for the user to log into the Bybit website.
 * @returns {Promise<object>} An object containing the new sub-account details and API keys.
 */
async function registerUser(username, password = null) {
  const masterKey = process.env.BYBIT_MASTER_KEY;
  const masterSecret = process.env.BYBIT_MASTER_SECRET;

  if (!masterKey || !masterSecret) {
    throw new Error('Master Bybit API credentials (BYBIT_MASTER_KEY, BYBIT_MASTER_SECRET) are not configured in your .env file.');
  }

  // REFINEMENT: Added a specific user agent to identify traffic from this app.
  const client = new RestClientV5({
    key: masterKey,
    secret: masterSecret,
    testnet: process.env.NODE_ENV !== 'production',
    options: {
        'User-Agent': 'AITradingBot/1.0',
    }
  });

  try {
    console.log(`[1/3] Attempting to create sub-account for user: ${username}`);
    const subUidResponse = await client.createSubMember({
      username,
      password,
      memberType: 1, // 1 for normal sub account
      switch: 1,     // 1 for enabling quick login
      note: `AI Trading Bot User: ${username} - Created: ${new Date().toISOString()}`,
    });

    if (subUidResponse.retCode !== 0) {
      console.error('Bybit API Error Details:', subUidResponse);
      throw new Error(`Failed to create sub-account (retCode ${subUidResponse.retCode}): ${subUidResponse.retMsg}`);
    }

    const { uid } = subUidResponse.result;
    console.log(`[2/3] ✅ Sub-account created successfully. UID: ${uid}`);

    console.log(`[3/3] Attempting to create API key for sub UID: ${uid}`);
    const apiKeyResponse = await client.createSubUIDAPIKey({
      subuid: parseInt(uid, 10),
      note: `AI Trading API Key for ${username}`,
      readOnly: 0, // 0 for Read/Write access
      permissions: {
        Wallet: ['AccountTransfer', 'SubMemberTransferList'],
        Spot: ['SpotTrade'],
        Contract: ['Position', 'Order'],
        Options: ['OptionsTrade'],
        Exchange: ['ExchangeHistory'],
      },
    });

    if (apiKeyResponse.retCode !== 0) {
      console.error('Bybit API Error Details:', apiKeyResponse);
      console.warn(`API key creation failed. Attempting to roll back and delete sub-account UID: ${uid}`);
      await client.deleteSubMember({ subuid: uid }).catch(err => console.error('CRITICAL: Failed to cleanup orphaned sub-member:', err));
      throw new Error(`Failed to create sub-account API key (retCode ${apiKeyResponse.retCode}): ${apiKeyResponse.retMsg}`);
    }

    const { apiKey, secret } = apiKeyResponse.result;
    console.log(`✅ Registration complete for user: ${username}`);

    return { ...subUidResponse.result, apiKey, secret };

  } catch (error) {
    console.error(`Registration process failed for ${username}: ${error.message}`);
    throw error;
  }
}

module.exports = { registerUser };