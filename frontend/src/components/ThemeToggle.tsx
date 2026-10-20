import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

// EVE-27: tema claro, oscuro o el del sistema. index.html lo aplica antes del primer pintado.
type Theme = 'system' | 'light' | 'dark';
const next: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const label: Record<Theme, string> = { system: 'Tema del sistema', light: 'Tema claro', dark: 'Tema oscuro' };

function readTheme(): Theme {
  try { const value = localStorage.getItem('et-theme'); return value === 'light' || value === 'dark' ? value : 'system'; } catch { return 'system'; }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme; else root.dataset.theme = theme;
    try { if (theme === 'system') localStorage.removeItem('et-theme'); else localStorage.setItem('et-theme', theme); } catch { /* preferencia opcional */ }
  }, [theme]);
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  return <button type="button" className="et-theme-toggle" onClick={() => setTheme(next[theme])} aria-label={`${label[theme]}. Cambiar a ${label[next[theme]].toLowerCase()}`} title={label[theme]}><Icon size={17}/></button>;
}
