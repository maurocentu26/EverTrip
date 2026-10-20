import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Armchair, ArrowRight, BusFront, CalendarDays, Check, ChevronRight, Plus, Route, Search, X } from 'lucide-react';
import { getConnectionSource, getRutas, getVehiculos, subscribeConnectionSource, formatPatenteMercosur, type Ruta, type Vehiculo } from './services/api';
import { formatARS } from './utils/formatters';
import { RoutesView } from './views/RoutesView';
import { FleetView } from './views/FleetView';
import { LayoutEditorView } from './views/LayoutEditorView';
import { TripsView } from './views/TripsView';
import { Modal } from './components/Modal';
import './terminal.css';
import './dispatch.css';
import './glass.css';
import { AnimatePresence, m } from 'framer-motion';
import { ThemeToggle } from './components/ThemeToggle';

type ActiveModule = 'rutas' | 'flota' | 'layout' | 'viajes';
interface ToastNotification { id: string; message: string; type: 'success' | 'warning' | 'error'; }
const navItems = [{ id: 'viajes', label: 'Salidas', icon: CalendarDays }, { id: 'rutas', label: 'Rutas', icon: Route }, { id: 'flota', label: 'Flota', icon: BusFront }, { id: 'layout', label: 'Asientos', icon: Armchair }] as const;

export function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('viajes');
  const [rutas, setRutas] = useState<Ruta[]>([]); const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [selectedRutaId, setSelectedRutaId] = useState<string | null>(null);
  const [selectedVehiculoId, setSelectedVehiculoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState('');
  const [connectionSource, setConnectionSource] = useState(getConnectionSource());
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [commandOpen, setCommandOpen] = useState(false); const [commandQuery, setCommandQuery] = useState('');
  const [createRutaTrigger, setCreateRutaTrigger] = useState(0); const [createVehiculoTrigger, setCreateVehiculoTrigger] = useState(0);
  const addNotification = useCallback((message: string, type: ToastNotification['type'] = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4200);
  }, []);
  const loadAllData = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [routes, vehicles] = await Promise.all([getRutas(), getVehiculos()]);
      setRutas(routes); setVehiculos(vehicles);
      setSelectedVehiculoId(prev => vehicles.some(v => v.id === prev) ? prev : vehicles[0]?.id || null);
    } catch (err) { setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar los datos. Intentá nuevamente.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadAllData(); return subscribeConnectionSource(setConnectionSource); }, [loadAllData]);
  useEffect(() => { window.scrollTo(0, 0); }, [activeModule]);
  useEffect(() => { setCreateRutaTrigger(0); setCreateVehiculoTrigger(0); if (activeModule !== 'rutas') setSelectedRutaId(null); }, [activeModule]);
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSelectedRutaId(null); setCommandQuery(''); setCommandOpen(true); return; }
      if ((e.target as HTMLElement)?.closest('input,textarea,select')) return;
      if (e.altKey && ['1','2','3','4'].includes(e.key)) { e.preventDefault(); setActiveModule(navItems[Number(e.key) - 1].id); }
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, []);
  const results = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    return { routes: rutas.filter(r => `${r.origen} ${r.destino}`.toLowerCase().includes(q)).slice(0,6), vehicles: vehiculos.filter(v => v.patente.toLowerCase().includes(q.replace(/\s/g,'')) || `${v.interno || ''} ${v.marca_modelo || ''}`.toLowerCase().includes(q)).slice(0,6) };
  }, [commandQuery,rutas,vehiculos]);
  function openLayout(id: string) { setSelectedVehiculoId(id); setActiveModule('layout'); setCommandOpen(false); }
  function search() { setSelectedRutaId(null); setCommandQuery(''); setCommandOpen(true); }
  return <div className="et-app">
    <aside className="et-sidebar"><button className="et-brand" aria-label="EverTrip, ir a Salidas" onClick={() => setActiveModule('viajes')}><span>evertrip<span className="et-brand-period">.</span><small>TERMINAL</small></span></button><div className="et-workspace-label"><span className="et-workspace-avatar">ET</span><div><strong>Consola operativa</strong><span>Transporte de pasajeros</span></div></div><span className="et-nav-label">OPERACIÓN</span><nav aria-label="Navegación principal">{navItems.map(({ id,label,icon: Icon },i) => <div className="et-nav-entry" key={id}>{i === 1 && <span className="et-nav-label">CATÁLOGOS</span>}<button key={id} aria-current={activeModule === id ? 'page' : undefined} onClick={() => setActiveModule(id)} title={`${label} · Alt+${i+1}`}><Icon size={19}/><span>{label}</span><small>0{i+1}</small></button></div>)}</nav><div className="et-sidebar-footer"><span className="et-workspace-avatar">ET</span><div><strong>EverTrip</strong><span>Gestión de transporte</span></div></div></aside>
    <div className="et-main-shell"><header className="et-topbar"><div className="et-breadcrumb"><span>Operación</span><ChevronRight size={14}/><strong>{navItems.find(n => n.id === activeModule)?.label}</strong></div><button className="et-command-trigger" aria-label="Buscar o ejecutar una acción" onClick={search}><Search size={16}/><span>Buscar o ejecutar una acción…</span><kbd>Ctrl K</kbd></button><ThemeToggle/><span className={`et-connection ${connectionSource === 'api' ? '' : 'is-local'}`}><i/>{connectionSource === 'api' ? 'Conectado' : 'Modo local'}</span></header>
      <main className="et-main">{import.meta.env.VITE_DEMO_MODE === 'true' && <div className="et-demo-banner" role="note"><strong>DEMO INTERACTIVA</strong><span>Datos ficticios · Edición pública habilitada · No ingreses datos personales.</span></div>}{loadError && <div className="et-load-error" role="alert"><AlertCircle size={18}/><p>{loadError}</p><button className="et-button et-secondary" onClick={() => void loadAllData()}>Reintentar</button></div>}
        <AnimatePresence mode="wait" initial={false}><m.div key={activeModule} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .26, ease: [.23, 1, .32, 1] }}>
        {activeModule === 'rutas' && <RoutesView externalSelectedId={selectedRutaId} rutas={rutas} loading={loading} onRefresh={loadAllData} onNotify={addNotification} externalCreateTrigger={createRutaTrigger}/>}
        {activeModule === 'flota' && <FleetView vehiculos={vehiculos} loading={loading} onRefresh={loadAllData} onNotify={addNotification} onOpenLayoutEditor={openLayout} externalCreateTrigger={createVehiculoTrigger}/>}
        {activeModule === 'layout' && (loading && !vehiculos.length ? <div className="et-empty" role="status">Cargando unidades…</div> : <LayoutEditorView vehiculos={vehiculos} selectedVehiculoId={selectedVehiculoId} onSelectVehiculo={setSelectedVehiculoId} onRefresh={loadAllData} onNotify={addNotification}/>)}
        {activeModule === 'viajes' && <TripsView rutas={rutas} vehiculos={vehiculos} catalogLoading={loading} onNotify={addNotification}/>}
        </m.div></AnimatePresence>
        <footer className="et-page-footer"><span>EVERTRIP TERMINAL</span><span>El camino, más simple.</span></footer>
      </main>
    </div>
    <nav className="et-mobile-nav" aria-label="Navegación rápida móvil">{navItems.map(({id,label,icon:Icon}) => <button key={id} aria-current={activeModule === id ? 'page' : undefined} onClick={() => setActiveModule(id)}><Icon size={20}/><span>{label}</span></button>)}<button onClick={search}><Search size={20}/><span>Buscar</span></button></nav>
    {commandOpen && <Modal title="¿A dónde vamos?" description="Buscá un recorrido, una unidad o elegí una acción." onClose={() => setCommandOpen(false)}><div className="et-command-content"><label className="et-search"><Search size={18}/><input aria-label="Búsqueda global" placeholder="Ciudad, patente o interno…" value={commandQuery} onChange={e => setCommandQuery(e.target.value)}/></label><div className="et-quick-actions"><button className="et-button et-secondary" onClick={() => {setCommandOpen(false);setActiveModule('rutas');setCreateRutaTrigger(n => n+1);}}><Plus size={16}/>Nueva ruta</button><button className="et-button et-secondary" onClick={() => {setCommandOpen(false);setActiveModule('flota');setCreateVehiculoTrigger(n => n+1);}}><Plus size={16}/>Registrar unidad</button></div><h3>Recorridos</h3>{results.routes.map(r => <button className="et-command-result" key={r.id} onClick={() => {setSelectedRutaId(r.id);setCommandOpen(false);setActiveModule('rutas');}}><Route size={17}/><span>{r.origen} → {r.destino}</span><small>{formatARS(r.precio_base)}</small></button>)}<h3>Unidades</h3>{results.vehicles.map(v => <button className="et-command-result" key={v.id} onClick={() => openLayout(v.id)}><BusFront size={17}/><span>{formatPatenteMercosur(v.patente)}<small>{v.interno} · {v.marca_modelo}</small></span><ArrowRight size={16}/></button>)}{!results.routes.length && !results.vehicles.length && <p className="et-empty">No encontramos resultados. Probá con otra búsqueda.</p>}</div></Modal>}
    <div className="et-toasts" aria-live="polite"><AnimatePresence initial={false}>{toasts.map(t => <m.div layout key={t.id} initial={{ opacity: 0, y: 18, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40, scale: .96 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }} className={`et-toast ${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>{t.type === 'success' ? <Check size={18}/> : <AlertCircle size={18}/>}<span>{t.message}</span><button aria-label="Cerrar notificación" onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}><X size={17}/></button></m.div>)}</AnimatePresence></div>
  </div>;
}
export default App;
