import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Compass,
  Bus,
  Grid,
  Radio,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Search,
  Command,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
} from 'lucide-react';
import {
  Ruta,
  Vehiculo,
  getRutas,
  getVehiculos,
  getConnectionSource,
  subscribeConnectionSource,
  formatPatenteMercosur,
} from './services/api';
import { formatARS } from './utils/formatters';
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
  const [railExpanded, setRailExpanded] = useState<boolean>(true);

  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [selectedVehiculoId, setSelectedVehiculoId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionSource, setConnectionSource] = useState<'api' | 'local_sync'>(
    getConnectionSource()
  );
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Command Palette (⌘K) State
  const [commandOpen, setCommandOpen] = useState<boolean>(false);
  const [commandQuery, setCommandQuery] = useState<string>('');

  // External triggers to open Create Modals from Command Palette
  const [createRutaTrigger, setCreateRutaTrigger] = useState<number>(0);
  const [createVehiculoTrigger, setCreateVehiculoTrigger] = useState<number>(0);

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

  // Global Keyboard Shortcuts: ⌘K / Ctrl+K for Command Palette, Alt+1/2/3 for instant module switch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
        setCommandQuery('');
        return;
      }

      if (e.key === 'Escape' && commandOpen) {
        setCommandOpen(false);
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.altKey && e.key === '1') setActiveModule('rutas');
      if (e.altKey && e.key === '2') setActiveModule('flota');
      if (e.altKey && e.key === '3') setActiveModule('layout');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandOpen]);

  const handleOpenLayoutForVehicle = (vehiculoId: string) => {
    setSelectedVehiculoId(vehiculoId);
    setActiveModule('layout');
  };

  // Filtered Command Palette items
  const commandResults = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();

    const matchedRutas = rutas
      .filter(
        (r) =>
          !q ||
          r.origen.toLowerCase().includes(q) ||
          r.destino.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const matchedVehiculos = vehiculos
      .filter(
        (v) =>
          !q ||
          v.patente.toLowerCase().includes(q.replace(/\s+/g, '')) ||
          (v.interno || '').toLowerCase().includes(q) ||
          (v.marca_modelo || '').toLowerCase().includes(q)
      )
      .slice(0, 4);

    return { matchedRutas, matchedVehiculos };
  }, [commandQuery, rutas, vehiculos]);

  const navItems: {
    id: ActiveModule;
    shortcut: string;
    ticket: string;
    label: string;
    shortLabel: string;
    sublabel: string;
    icon: React.ReactNode;
    badgeCount: number;
  }[] = [
    {
      id: 'rutas',
      shortcut: 'Alt+1',
      ticket: 'EVE-5',
      label: 'Red de Rutas',
      shortLabel: 'Rutas',
      sublabel: 'Corredores y Tarifas ARS',
      icon: <Compass className="w-4 h-4" />,
      badgeCount: rutas.filter((r) => r.activa).length,
    },
    {
      id: 'flota',
      shortcut: 'Alt+2',
      ticket: 'EVE-9',
      label: 'Flota y Unidades',
      shortLabel: 'Flota',
      sublabel: 'Parque Móvil Mercosur',
      icon: <Bus className="w-4 h-4" />,
      badgeCount: vehiculos.length,
    },
    {
      id: 'layout',
      shortcut: 'Alt+3',
      ticket: 'EVE-13',
      label: 'Blueprint Asientos',
      shortLabel: 'Blueprint',
      sublabel: 'Ingeniero Chasis 1P/2P',
      icon: <Grid className="w-4 h-4" />,
      badgeCount: vehiculos.filter((v) => v.layout_configurado).length,
    },
  ];

  return (
    <div className="min-h-screen bg-[#07090E] bg-console-grid text-slate-100 flex flex-col">
      {/* =====================================================================
          TOP COMMAND BAR (52px · Linear + FlightAware Precision)
         ===================================================================== */}
      <header className="h-[52px] px-4 lg:px-5 bg-[#07090E]/90 backdrop-blur-md border-b border-white/[0.07] flex items-center justify-between gap-3 sticky top-0 z-40">
        {/* Left: Brand Identity + Module Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#F59E0B] text-slate-950 flex items-center justify-center font-display font-bold text-xs shadow-[0_0_16px_rgba(245,158,11,0.45)] shrink-0">
              ET
            </div>
            <span className="font-display font-bold text-sm tracking-tight text-slate-100">
              EVERTRIP
            </span>
          </div>

          <span className="text-slate-700 hidden sm:inline">/</span>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono-tabular truncate">
            <span className="text-amber-400 font-semibold">
              {activeModule === 'rutas' && 'RED DE RUTAS (EVE-5)'}
              {activeModule === 'flota' && 'FLOTA MERCOSUR (EVE-9)'}
              {activeModule === 'layout' && 'BLUEPRINT CHASIS (EVE-13)'}
            </span>
          </div>
        </div>

        {/* Center: Interactive Command Palette Trigger (⌘K) */}
        <button
          type="button"
          onClick={() => {
            setCommandOpen(true);
            setCommandQuery('');
          }}
          className="btn-tactile flex-1 max-w-md mx-2 px-3 py-1.5 rounded-lg bg-[#0D111A] hover:bg-[#131926] border border-white/[0.08] hover:border-amber-500/40 flex items-center justify-between gap-3 text-xs text-slate-400 cursor-pointer"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              Buscar ruta, patente Mercosur o ejecutar comando...
            </span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#07090E] border border-white/[0.1] font-mono-tabular text-[10px] text-slate-300 shrink-0">
            ⌘K
          </kbd>
        </button>

        {/* Right: Active Unit Quick Selector + Live Telemetry Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          {vehiculos.length > 0 && (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0D111A] border border-white/[0.07] text-[11px] font-mono-tabular">
              <span className="text-slate-500">UNIDAD:</span>
              <select
                value={selectedVehiculoId || ''}
                onChange={(e) => {
                  setSelectedVehiculoId(e.target.value);
                  setActiveModule('layout');
                }}
                aria-label="Selector rápido de unidad hacia Blueprint"
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#07090E]">
                    {formatPatenteMercosur(v.patente)} ({v.interno})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div
            className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono-tabular font-semibold flex items-center gap-1.5 ${
              connectionSource === 'api'
                ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/12 border-amber-500/30 text-amber-300'
            }`}
          >
            <Radio className="w-3 h-3 animate-pulse" />
            <span>{connectionSource === 'api' ? 'API LIVE :3001' : 'LOCAL SYNC'}</span>
          </div>
        </div>
      </header>

      {/* =====================================================================
          BODY WORKSPACE: Desktop Compact/Expandable Rail + Main Split Canvas
         ===================================================================== */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop Left Precision Rail */}
        <aside
          className={`hidden lg:flex flex-col justify-between bg-[#0D111A]/90 border-r border-white/[0.07] shrink-0 transition-[width] duration-200 sticky top-[52px] h-[calc(100vh-52px)] ${
            railExpanded ? 'w-60' : 'w-16'
          }`}
        >
          <div className="p-2.5 space-y-1.5">
            <div className="flex items-center justify-between px-2 py-1">
              {railExpanded && (
                <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-slate-500">
                  MÓDULOS ÉPICA 1
                </span>
              )}
              <button
                type="button"
                onClick={() => setRailExpanded((prev) => !prev)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] cursor-pointer mx-auto lg:mx-0"
                title={railExpanded ? 'Compactar rail lateral' : 'Expandir rail lateral'}
              >
                {railExpanded ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4" />
                )}
              </button>
            </div>

            {navItems.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  title={`${item.label} (${item.shortcut})`}
                  className={`btn-tactile w-full rounded-xl border flex items-center justify-between gap-2.5 p-2.5 cursor-pointer ${
                    isActive
                      ? 'bg-[#131926] border-amber-500/45 text-slate-100 shadow-lg'
                      : 'bg-transparent border-transparent hover:bg-white/[0.04] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-amber-500/15 border-amber-500/45 text-amber-400'
                          : 'bg-[#07090E] border-white/[0.07] text-slate-400'
                      }`}
                    >
                      {item.icon}
                    </div>
                    {railExpanded && (
                      <div className="text-left min-w-0">
                        <div className="text-xs font-semibold text-slate-100 truncate">
                          {item.label}
                        </div>
                        <div className="text-[10px] font-mono-tabular text-slate-500 truncate">
                          {item.ticket} · {item.shortcut}
                        </div>
                      </div>
                    )}
                  </div>

                  {railExpanded && (
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono-tabular text-[11px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-[#F59E0B] text-slate-950'
                          : 'bg-[#07090E] text-slate-300 border border-white/[0.07]'
                      }`}
                    >
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Rail Bottom Operator Info */}
          <div className="p-3 border-t border-white/[0.07] bg-[#07090E]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#131926] border border-white/[0.1] flex items-center justify-center font-mono-tabular font-bold text-amber-400 text-xs shrink-0">
                MG
              </div>
              {railExpanded && (
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">
                    Mauro García
                  </div>
                  <div className="text-[10px] font-mono-tabular text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Admin Despacho
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Canvas */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1520px] w-full mx-auto min-w-0">
          {activeModule === 'rutas' && (
            <RoutesView
              rutas={rutas}
              vehiculos={vehiculos}
              loading={loading}
              onRefresh={loadAllData}
              onNotify={addNotification}
              onOpenLayoutForVehicle={handleOpenLayoutForVehicle}
              externalCreateTrigger={createRutaTrigger}
            />
          )}

          {activeModule === 'flota' && (
            <FleetView
              vehiculos={vehiculos}
              loading={loading}
              onRefresh={loadAllData}
              onOpenLayoutEditor={handleOpenLayoutForVehicle}
              onNotify={addNotification}
              externalCreateTrigger={createVehiculoTrigger}
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

      {/* =====================================================================
          iPHONE THUMB-ZONE FLOATING BOTTOM NAVIGATION BAR (< lg)
         ===================================================================== */}
      <nav
        aria-label="Navegación rápida móvil"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0D111A]/95 backdrop-blur-xl border-t border-white/[0.1] px-2 pt-1.5 pb-safe-bottom"
      >
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id)}
                className={`btn-tactile min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/35'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-semibold tracking-tight">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setCommandOpen(true);
              setCommandQuery('');
            }}
            className="btn-tactile min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-300 hover:text-amber-300 cursor-pointer"
          >
            <Command className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-mono-tabular font-semibold">⌘K</span>
          </button>
        </div>
      </nav>

      {/* =====================================================================
          LINEAR-STYLE INTERACTIVE COMMAND PALETTE (⌘K)
         ===================================================================== */}
      {commandOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Paleta de comandos rápidos"
          onClick={() => setCommandOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-[#131926] border border-white/[0.14] rounded-2xl shadow-2xl overflow-hidden animate-modal-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-[#07090E]">
              <Search className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Saltar a ruta (Rosario, Bariloche), patente (AG 482 KM) o acción..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setCommandOpen(false)}
                className="px-1.5 py-0.5 rounded bg-[#131926] border border-white/[0.1] text-[10px] font-mono-tabular text-slate-400 hover:text-white"
              >
                ESC
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
              {/* Quick Actions */}
              <div>
                <div className="px-2 pb-1.5 text-[10px] font-mono-tabular uppercase tracking-widest text-slate-500">
                  Acciones Directas de Despacho
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCommandOpen(false);
                      setActiveModule('rutas');
                      setCreateRutaTrigger((c) => c + 1);
                    }}
                    className="btn-tactile p-2.5 rounded-xl bg-[#07090E] hover:bg-amber-500/15 border border-white/[0.07] hover:border-amber-500/40 text-left flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Nueva Ruta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCommandOpen(false);
                      setActiveModule('flota');
                      setCreateVehiculoTrigger((c) => c + 1);
                    }}
                    className="btn-tactile p-2.5 rounded-xl bg-[#07090E] hover:bg-emerald-500/15 border border-white/[0.07] hover:border-emerald-500/40 text-left flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Registrar Unidad</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCommandOpen(false);
                      setActiveModule('layout');
                    }}
                    className="btn-tactile p-2.5 rounded-xl bg-[#07090E] hover:bg-sky-500/15 border border-white/[0.07] hover:border-sky-500/40 text-left flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer"
                  >
                    <Grid className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>Abrir Blueprint</span>
                  </button>
                </div>
              </div>

              {/* Matching Routes */}
              {commandResults.matchedRutas.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-[10px] font-mono-tabular uppercase tracking-widest text-slate-500">
                    Corredores Nacionales ({commandResults.matchedRutas.length})
                  </div>
                  <div className="space-y-1">
                    {commandResults.matchedRutas.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setCommandOpen(false);
                          setActiveModule('rutas');
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-white/[0.05] flex items-center justify-between gap-2 text-xs text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-slate-100 font-medium truncate">
                            {r.origen} → {r.destino}
                          </span>
                          <span className="font-mono-tabular text-[11px] text-slate-500">
                            ({r.distancia_km} km)
                          </span>
                        </div>
                        <span className="font-mono-tabular font-semibold text-amber-400 shrink-0">
                          {formatARS(r.precio_base)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Fleet Vehicles */}
              {commandResults.matchedVehiculos.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 text-[10px] font-mono-tabular uppercase tracking-widest text-slate-500">
                    Unidades de Flota → Abrir en Blueprint ({commandResults.matchedVehiculos.length})
                  </div>
                  <div className="space-y-1">
                    {commandResults.matchedVehiculos.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setCommandOpen(false);
                          handleOpenLayoutForVehicle(v.id);
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-white/[0.05] flex items-center justify-between gap-2 text-xs text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="px-2 py-0.5 rounded bg-[#07090E] border border-white/[0.1] font-mono-tabular font-bold text-slate-100 text-[11px]">
                            {formatPatenteMercosur(v.patente)}
                          </span>
                          <span className="text-amber-400 font-mono-tabular font-semibold">
                            {v.interno}
                          </span>
                          <span className="text-slate-400 truncate">{v.marca_modelo}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono-tabular text-emerald-400 shrink-0">
                          <span>Plano {v.capacidad_asientos}p</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sonner-style Operational Toast Stack */}
      <div
        className="fixed bottom-16 lg:bottom-5 right-4 sm:right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md animate-console-enter ${
              t.type === 'success'
                ? 'bg-[#131926]/95 border-emerald-500/45 text-emerald-200'
                : t.type === 'warning'
                ? 'bg-[#131926]/95 border-amber-500/45 text-amber-200'
                : 'bg-[#131926]/95 border-rose-500/45 text-rose-200'
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
