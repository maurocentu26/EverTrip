import React, { useCallback, useEffect, useState } from 'react';
import {
  Compass,
  Bus,
  Grid,
  Radio,
  ShieldCheck,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  ChevronRight,
} from 'lucide-react';
import {
  Ruta,
  Vehiculo,
  getRutas,
  getVehiculos,
  getConnectionSource,
  subscribeConnectionSource,
} from './services/api';
import { RoutesView } from './views/RoutesView';
import { FleetView } from './views/FleetView';
import { LayoutEditorView } from './views/LayoutEditorView';

type ActiveModule = 'rutas' | 'flota' | 'layout';

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error';
}

export const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ActiveModule>('rutas');
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [selectedVehiculoId, setSelectedVehiculoId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionSource, setConnectionSource] = useState<'api' | 'local_sync'>(
    getConnectionSource()
  );
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addNotification = useCallback(
    (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [rutasData, vehiculosData] = await Promise.all([
        getRutas(),
        getVehiculos(),
      ]);
      setRutas(rutasData);
      setVehiculos(vehiculosData);
      setSelectedVehiculoId((prev) => {
        if (prev && vehiculosData.some((v) => v.id === prev)) return prev;
        return vehiculosData[0]?.id || null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
    return subscribeConnectionSource((src) => setConnectionSource(src));
  }, [loadAllData]);

  // Keyboard shortcuts (1, 2, 3 when not typing in an input) — instant switch per Emil's rule
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.altKey && e.key === '1') setActiveModule('rutas');
      if (e.altKey && e.key === '2') setActiveModule('flota');
      if (e.altKey && e.key === '3') setActiveModule('layout');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenLayoutForVehicle = (vehiculoId: string) => {
    setSelectedVehiculoId(vehiculoId);
    setActiveModule('layout');
  };

  const navItems: {
    id: ActiveModule;
    code: string;
    ticket: string;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    badgeCount?: number;
    accentColor: string;
  }[] = [
    {
      id: 'rutas',
      code: 'MOD-01',
      ticket: 'EVE-5',
      label: 'Red de Rutas',
      sublabel: 'Corredores y Tarifas ARS',
      icon: <Compass className="w-4 h-4" />,
      badgeCount: rutas.filter((r) => r.activa).length,
      accentColor: 'text-amber-400',
    },
    {
      id: 'flota',
      code: 'MOD-02',
      ticket: 'EVE-9',
      label: 'Flota y Unidades',
      sublabel: 'Parque Móvil Mercosur',
      icon: <Bus className="w-4 h-4" />,
      badgeCount: vehiculos.length,
      accentColor: 'text-sky-400',
    },
    {
      id: 'layout',
      code: 'MOD-03',
      ticket: 'EVE-13',
      label: 'Editor de Asientos',
      sublabel: 'Planos 1P/2P y Butacas',
      icon: <Grid className="w-4 h-4" />,
      badgeCount: vehiculos.filter((v) => v.layout_configurado).length,
      accentColor: 'text-emerald-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[#090D16] bg-console-grid text-slate-100 flex flex-col lg:flex-row">
      {/* Left Operational Sidebar (Desktop) */}
      <aside className="w-full lg:w-72 bg-[#0F1623]/95 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between shrink-0 lg:sticky lg:top-0 lg:h-screen z-30">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-display font-extrabold text-lg shadow-[0_0_20px_rgba(245,158,11,0.35)]">
                ET
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-base tracking-tight text-slate-100">
                    EverTrip
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    OPS v1.0
                  </span>
                </div>
                <p className="text-[11px] font-mono-tabular text-slate-400">
                  Consola Despacho Nacional
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Section */}
          <div className="p-3.5 space-y-1.5">
            <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] font-mono-tabular uppercase tracking-widest text-slate-400">
              <span>Épica 1 · Core Operativo</span>
              <span>/v1</span>
            </div>

            {navItems.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={`btn-tactile w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer ${
                    isActive
                      ? 'bg-[#141E30] border-amber-500/50 text-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                      : 'bg-transparent border-transparent hover:bg-slate-900/70 hover:border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg border shrink-0 ${
                        isActive
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          : 'bg-[#090D16] border-slate-800 text-slate-400'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-100 truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] font-mono-tabular px-1.5 py-0.2 rounded bg-[#090D16] border border-slate-800 text-slate-400">
                          {item.ticket}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{item.sublabel}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badgeCount !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono-tabular text-xs font-semibold ${
                          isActive
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-[#090D16] text-slate-300 border border-slate-800'
                        }`}
                      >
                        {item.badgeCount}
                      </span>
                    )}
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform ${
                        isActive ? 'text-amber-400 translate-x-0.5' : 'text-slate-600'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Telemetry & Operator Profile */}
        <div className="p-4 border-t border-slate-800/80 space-y-3 bg-[#090D16]/60">
          {/* API Telemetry Indicator */}
          <div className="p-3 rounded-xl bg-[#0F1623] border border-slate-800/90 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono-tabular">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Estado de Enlace</span>
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  connectionSource === 'api'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                }`}
              >
                {connectionSource === 'api' ? 'API LIVE :3001' : 'LOCAL SYNC'}
              </span>
            </div>
            <div className="text-[10px] font-mono-tabular text-slate-400 truncate">
              Endpoints: <span className="text-slate-300">/v1/rutas</span> ·{' '}
              <span className="text-slate-300">/v1/vehiculos</span>
            </div>
          </div>

          {/* Active Operator Badge */}
          <div className="flex items-center justify-between px-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono-tabular font-bold text-amber-300 text-xs">
                MG
              </span>
              <div>
                <div className="font-medium text-slate-200 leading-tight">Mauro García</div>
                <div className="text-[10px] font-mono-tabular text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Rol: Admin Despacho
                </div>
              </div>
            </div>
            <Terminal className="w-4 h-4 text-slate-500" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Operational Telemetry Strip */}
        <header className="h-14 px-6 bg-[#0F1623]/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 text-xs font-mono-tabular text-slate-400">
            <span className="text-slate-200 font-semibold">CENTRO DE CONTROL DE TRÁFICO</span>
            <span className="hidden sm:inline text-slate-600">/</span>
            <span className="hidden sm:inline text-amber-400">
              {activeModule === 'rutas' && 'MÓDULO 01 · GESTIÓN DE RUTAS (EVE-5)'}
              {activeModule === 'flota' && 'MÓDULO 02 · GESTIÓN DE FLOTA (EVE-9)'}
              {activeModule === 'layout' && 'MÓDULO 03 · EDITOR DE ASIENTOS (EVE-13)'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono-tabular">
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#090D16] border border-slate-800 text-slate-300">
              <span className="text-slate-500">Rutas Activas:</span>
              <span className="text-emerald-400 font-bold">
                {rutas.filter((r) => r.activa).length}
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-500">Flota Operativa:</span>
              <span className="text-sky-400 font-bold">
                {vehiculos.filter((v) => v.estado === 'activo').length}/{vehiculos.length}
              </span>
            </div>
          </div>
        </header>

        {/* Active View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1480px] w-full mx-auto">
          {activeModule === 'rutas' && (
            <RoutesView
              rutas={rutas}
              loading={loading}
              onRefresh={loadAllData}
              onNotify={addNotification}
            />
          )}

          {activeModule === 'flota' && (
            <FleetView
              vehiculos={vehiculos}
              loading={loading}
              onRefresh={loadAllData}
              onOpenLayoutEditor={handleOpenLayoutForVehicle}
              onNotify={addNotification}
            />
          )}

          {activeModule === 'layout' && (
            <LayoutEditorView
              vehiculos={vehiculos}
              selectedVehiculoId={selectedVehiculoId}
              onSelectVehiculo={(id) => setSelectedVehiculoId(id)}
              onRefresh={loadAllData}
              onNotify={addNotification}
            />
          )}
        </main>
      </div>

      {/* Sonner-style Operational Toast Stack */}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md animate-console-enter ${
              t.type === 'success'
                ? 'bg-[#0F1623]/95 border-emerald-500/45 text-emerald-200'
                : t.type === 'warning'
                ? 'bg-[#0F1623]/95 border-amber-500/45 text-amber-200'
                : 'bg-[#0F1623]/95 border-rose-500/45 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-medium">
              {t.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              {t.type === 'warning' && (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              {t.type === 'error' && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-slate-100 p-1 cursor-pointer"
              aria-label="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
