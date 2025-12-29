// supabase-auth-context.js
import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SupabaseAuthContext = createContext();

export const useSupabaseAuth = () => {
    const context = useContext(SupabaseAuthContext);
    if (!context) throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
    return context;
};

// Initialize Supabase Client
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const SupabaseAuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accessToken, setAccessToken] = useState(null);

    const signInWithGoogle = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google',
             options: { redirectTo: `${import.meta.env.VITE_FRONTEND_URL}/${import.meta.env.VITE_APP === 'community' ? 'discussions' : 'settings/sync'}` } 
            });
            localStorage.setItem('bundleSaved', 'false');
        if (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'SIGNED_OUT') {
                    setUser(null)
                } else if (session) {
                    setUser(session?.user || null);
                    const accessToken = session?.access_token;
                    if (!accessToken) throw new Error("No access token");
                    setAccessToken(accessToken);
                }
            })
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <SupabaseAuthContext.Provider
            value={{
                accessToken, supabase,
                user, loading, signInWithGoogle,
                signOut: async () => {
                    await supabase.auth.signOut();
                    setUser(null);
                    localStorage.removeItem('mintypeFileId')
                    localStorage.removeItem('mintypeFolderId')
                    localStorage.setItem('pullComplete', false);
                    localStorage.setItem('bundleSaved', 'false');
                }
            }}
        >
            {children}
        </SupabaseAuthContext.Provider>
    );
};