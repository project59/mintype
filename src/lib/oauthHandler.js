export class OAuthHandler {
    constructor(backendUrl) {
        this.backendUrl = backendUrl;
    }

    openAuthPopup(authUrl) {
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        return window.open(
            authUrl,
            'Google Drive Authorization',
            `width=${width},height=${height},left=${left},top=${top}`
        );
    }

    waitForAuthCallback(popup) {
        return new Promise((resolve, reject) => {
            let messageReceived = false;

            let origin;
            if (import.meta.env.DEV) {
                origin = 'http://localhost:5000';
            } else {
                origin = import.meta.env.VITE_BACKEND_URL;
            }
            const messageHandler = (event) => {
                // Verify origin
                if (event.origin !== (origin)) {
                    console.warn('Message from unexpected origin:', event.origin);
                    return;
                }

                console.log('Received message:', event.data);

                if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
                    messageReceived = true;
                    window.removeEventListener('message', messageHandler);
                    clearInterval(popupChecker);
                    console.log('Auth successful, tokens received');
                    resolve(event.data.tokens);
                } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
                    messageReceived = true;
                    window.removeEventListener('message', messageHandler);
                    clearInterval(popupChecker);
                    reject(new Error(event.data.error || 'Authorization failed'));
                }
            };

            // Check if popup was closed
            const popupChecker = setInterval(() => {
                if (!popup || popup.closed) {
                    clearInterval(popupChecker);
                    window.removeEventListener('message', messageHandler);

                    // Only reject if we didn't receive the message
                    if (!messageReceived) {
                        console.log('Popup closed without receiving message');
                        reject(new Error('Authorization cancelled'));
                    }
                }
            }, 500);

            // Add message listener
            window.addEventListener('message', messageHandler);

            // Timeout after 5 minutes
            setTimeout(() => {
                if (!messageReceived) {
                    clearInterval(popupChecker);
                    window.removeEventListener('message', messageHandler);
                    if (popup && !popup.closed) {
                        popup.close();
                    }
                    reject(new Error('Authorization timeout'));
                }
            }, 5 * 60 * 1000);
        });
    }

    async authorize(apiFetch) {
        try {
            // Get auth URL from backend
            const res = await apiFetch(`${this.backendUrl}/api/auth-url`);

            if (!res.ok) {
                throw new Error('Failed to get authorization URL');
            }

            const { url } = await res.json();

            // Open popup
            const popup = this.openAuthPopup(url);

            if (!popup) {
                throw new Error('Failed to open popup. Please check if popups are blocked.');
            }

            // Wait for tokens
            const tokens = await this.waitForAuthCallback(popup);

            console.log('Authorization complete, tokens:', tokens);
            return tokens;
        } catch (error) {
            console.error('Authorization failed:', error);
            throw error;
        }
    }
}