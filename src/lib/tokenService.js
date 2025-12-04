import { setItem, getItem } from '../layouts/secure-context/dbUtils';
import { encryptDataWithMasterKey, decryptDataWithMasterKey } from '../layouts/secure-context/secureUtils';

const TOKEN_STORAGE_KEY = 'google_drive_tokens';
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes buffer

export class TokenService {
    constructor(masterKey) {
        this.masterKey = masterKey;
    }

    async storeTokens(tokens) {
        if (!this.masterKey) {
            throw new Error('Master key not available');
        }

        const tokenData = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date || (Date.now() + 50 * 60 * 1000), // 50 minutes
            token_type: tokens.token_type,
            scope: tokens.scope
        };
        const { ciphertext, iv } = await encryptDataWithMasterKey(this.masterKey, JSON.stringify(tokenData));
        await setItem(TOKEN_STORAGE_KEY, { ciphertext, iv });
        
        return tokenData;
    }

    async getTokens() {
        if (!this.masterKey) {
            throw new Error('Master key not available');
        }

        const encryptedData = await getItem(TOKEN_STORAGE_KEY);
        if (!encryptedData) {
            return null;
        }
        const tokenData = await decryptDataWithMasterKey(
            this.masterKey,
            encryptedData.iv,
            encryptedData.ciphertext
        );
        return tokenData;
    }

    async clearTokens() {
        await setItem(TOKEN_STORAGE_KEY, null);
    }

    async isTokenExpired() {
        const tokens = await this.getTokens();
        if (!tokens || !tokens.expiry_date) {
            return true;
        }

        // Check if token expires within the buffer time
        return Date.now() >= (tokens.expiry_date - TOKEN_EXPIRY_BUFFER);
    }

    async getValidAccessToken(apiFetch) {
        const tokens = await this.getTokens();
        if (!tokens) {
            throw new Error('No tokens found. Please authorize Drive access.');
        }
        
        const isExpired = await this.isTokenExpired();
        
        if (!isExpired) {
            return tokens.access_token;
        }

        // Token expired, refresh it
        console.log('Token expired, refreshing...');
        return await this.refreshAccessToken(tokens.refresh_token, apiFetch);
    }

    async refreshAccessToken(refreshToken, apiFetch) {
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const res = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/api/refresh-token`, {
                method: 'POST',
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!res.ok) {
                throw new Error('Failed to refresh token');
            }

            const newTokens = await res.json();
            
            // Store the new tokens (keep the refresh_token from original)
            const updatedTokens = {
                access_token: newTokens.access_token,
                refresh_token: refreshToken, // Keep original refresh token
                expiry_date: newTokens.expiry_date,
                token_type: newTokens.token_type,
                scope: newTokens.scope
            };

            await this.storeTokens(updatedTokens);
            
            return newTokens.access_token;
        } catch (error) {
            console.error('Token refresh failed:', error);
            // Clear invalid tokens
            // await this.clearTokens();
            throw new Error('Failed to refresh token. Please re-authorize.');
        }
    }
}