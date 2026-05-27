/**
 * Supabase Client Initialization
 * Uses CDN for GitHub Pages compatibility
 */
import { CONFIG } from './config.js';

// Load Supabase from CDN if not already loaded
if (typeof window.supabase === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.onload = () => initSupabase();
  script.onerror = () => console.error('Failed to load Supabase CDN');
  document.head.appendChild(script);
} else {
  initSupabase();
}

let supabaseClient = null;

function initSupabase() {
  const { createClient } = window.supabase;
  supabaseClient = createClient(
    CONFIG.supabase.url,
    CONFIG.supabase.anonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
  
  // Listen for auth state changes
  supabaseClient.auth.onAuthStateChange((event, session) => {
    handleAuthChange(event, session);
  });
  
  window.dispatchEvent(new CustomEvent('supabase:ready', { detail: supabaseClient }));
}

function handleAuthChange(event, session) {
  const protectedRoutes = ['/dashboard.html', '/submissions.html', '/earnings.html', '/settings.html'];
  const currentPath = window.location.pathname;
  
  if (event === 'SIGNED_IN' && session) {
    // Store session data
    localStorage.setItem('naijaassets_session', JSON.stringify({
      user: session.user,
      timestamp: Date.now()
    }));
    
    // Redirect to dashboard if on auth pages
    if (currentPath.includes('login.html') || currentPath.includes('signup.html')) {
      window.location.href = '/dashboard.html';
    }
  }
  
  if (event === 'SIGNED_OUT') {
    localStorage.removeItem('naijaassets_session');
    // Redirect to login if on protected route
    if (protectedRoutes.some(route => currentPath.includes(route))) {
      window.location.href = '/login.html';
    }
  }
}

export const getSupabase = () => {
  return new Promise((resolve) => {
    if (supabaseClient) {
      resolve(supabaseClient);
    } else {
      window.addEventListener('supabase:ready', () => resolve(supabaseClient), { once: true });
    }
  });
};

export { supabaseClient };