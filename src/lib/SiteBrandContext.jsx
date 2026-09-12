import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '@/lib/apiBase';
const SiteBrandContext = createContext(null);

const defaults = {
  page_title: 'مدرستي',
  logo: '',
  theme_color: '#263b49',
  accent_color: '#5b66cf',
  social_links: {},
  updated_date: null,
};

export function SiteBrandProvider({ children }) {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch(apiUrl('/api/branding'), {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('branding request failed');
        const data = await response.json();
        if (active) setSettings({ ...defaults, ...(data?.settings || {}) });
      } catch {
        if (active) setSettings(defaults);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const timer = window.setInterval(load, 30000);
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, []);

  useEffect(() => {
    const theme = settings.theme_color || defaults.theme_color;
    const accent = settings.accent_color || defaults.accent_color;
    const title = settings.page_title || defaults.page_title;
    const logo = settings.logo || '';

    document.documentElement.style.setProperty('--platform-theme', theme);
    document.documentElement.style.setProperty('--platform-accent', accent);
    document.title = title;

    let icon = document.querySelector('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement('link');
      icon.setAttribute('rel', 'icon');
      document.head.appendChild(icon);
    }

    const defaultIcon = icon.dataset.defaultHref || icon.getAttribute('href') || '';
    if (!icon.dataset.defaultHref) icon.dataset.defaultHref = defaultIcon;

    if (logo) {
      icon.setAttribute('href', logo);
    } else if (defaultIcon) {
      icon.setAttribute('href', defaultIcon);
    }

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', theme);
  }, [settings]);

  const value = useMemo(() => ({ settings, loading }), [settings, loading]);
  return <SiteBrandContext.Provider value={value}>{children}</SiteBrandContext.Provider>;
}

export function useSiteBrand() {
  const value = useContext(SiteBrandContext);
  return value || { settings: defaults, loading: false };
}
