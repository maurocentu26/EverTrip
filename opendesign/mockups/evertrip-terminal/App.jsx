import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, Armchair, BusFront, Check, ChevronRight, CircleHelp, Compass, MapPinned, Route, X } from 'lucide-react';
import { Routes, RouteForm } from './Routes';
import { Fleet, Seats } from './Fleet';
import { initialRoutes, palettes } from './data';

function App() {
  const [palette, setPalette] = useState(() => { try { return palettes.find(p => p.id === localStorage.getItem('evertrip-terminal-palette'))?.id || 'atlantic'; } catch { return 'atlantic'; } });
  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    try { localStorage.setItem('evertrip-terminal-palette', palette); } catch {}
  }, [palette]);
  const [page, setPage] = useState(() => { try { return ['routes','fleet','seats'].includes(localStorage.getItem('evertrip-terminal-page')) ? localStorage.getItem('evertrip-terminal-page') : 'routes'; } catch { return 'routes'; } });
  const [routes, setRoutes] = useState(initialRoutes); const [selectedId, setSelectedId] = useState('01');
  const [vehicleId, setVehicleId] = useState('101'); const [form, setForm] = useState(null); const [toast, setToast] = useState(''); const [help, setHelp] = useState(false);
  const opener = useRef(null);
  const selected = routes.find(r => r.id === selectedId) || routes[0];
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  useEffect(() => { try { localStorage.setItem('evertrip-terminal-page', page); } catch {} }, [page]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer); }, [toast]);
  function openForm(value) { opener.current = document.activeElement; setForm(value); }
  function closeForm() { setForm(null); opener.current?.focus(); }
  function saveRoute(value) {
    const id = value.id || String(Math.max(...routes.map(r => Number(r.id))) + 1).padStart(2,'0');
    setRoutes(value.id ? routes.map(r => r.id === id ? value : r) : [...routes, { ...value, id }]);
    setSelectedId(id); closeForm(); setToast(value.id ? 'Recorrido actualizado en la demo' : 'Nueva ruta creada en la demo');
  }
  const nav = [['routes','Rutas',Route],['fleet','Flota',BusFront],['seats','Asientos',Armchair]];
  return <div className="app-shell"><aside className="sidebar"><a href="#" className="brand" aria-label="EverTrip, ir a Rutas" onClick={e => {e.preventDefault();setPage('routes');}}><span className="brand-symbol"><Route size={25} strokeWidth={2}/></span><span>evertrip<span className="brand-period">.</span><small>TERMINAL</small></span></a>
    <div className="workspace-label"><span className="workspace-avatar">ET</span><div><strong>Consola operativa</strong><span>Transporte de pasajeros</span></div></div>
    <div className="nav-label">TU OPERACIÓN</div><nav aria-label="Navegación principal">{nav.map(([id,label,Icon],i) => <button key={id} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}><Icon size={19}/><span>{label}</span><span className="nav-index">0{i+1}</span></button>)}</nav>
    <div className="sidebar-bottom"><div className="sidebar-message"><Compass size={24} strokeWidth={1.3}/><p>Más cerca.<br/><strong>Más lejos.</strong></p><span>Todo empieza con un destino.</span></div><button className="help-button" aria-expanded={help} onClick={() => setHelp(!help)}><CircleHelp size={18}/>Acerca del prototipo<ArrowUpRight size={15}/></button><div className="profile"><span className="avatar">OP</span><div><strong>Operador</strong><span>Entorno de demostración</span></div><span className="online-dot"/></div></div>
  </aside><div className="main-shell"><div className="demo-bar"><span><span className="status-dot"/>EXPLORACIÓN DE DISEÑO</span><span>Concepto 01 <i/> Terminal <i/> Datos de ejemplo</span></div><header className="topbar"><div className="breadcrumb">Operación <ChevronRight size={14}/><strong>{nav.find(n => n[0] === page)[1]}</strong></div><div className="topbar-right"><label className="palette-picker"><span className="palette-swatch"/><span className="palette-label">Paleta</span><select aria-label="Paleta de colores" value={palette} onChange={e => setPalette(e.target.value)}>{palettes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><span className="topbar-rule"/><span className="avatar small-avatar">OP</span></div></header>
  <main>{page === 'routes' && <Routes routes={routes} selected={selected} onSelect={r => setSelectedId(r.id)} onCreate={() => openForm({})} onEdit={r => openForm({route:r})} onToggle={r => {setRoutes(routes.map(item => item.id === r.id ? {...item, active:!item.active} : item)); setToast(r.active ? 'Ruta desactivada en la demo' : 'Ruta activada en la demo');}}/>}{page === 'fleet' && <Fleet onOpen={id => {setVehicleId(id);setPage('seats');}}/>}<div hidden={page !== 'seats'}><Seats vehicleId={vehicleId} onVehicle={setVehicleId} notify={setToast}/></div></main>
  </div>{form && <div className="modal-backdrop" onClick={e => {if (e.target === e.currentTarget) closeForm();}}><RouteForm route={form.route} onSave={saveRoute} onClose={closeForm}/></div>}
  {help && <aside className="help-panel" aria-label="Acerca del prototipo"><button className="icon-button help-close" aria-label="Cerrar ayuda" onClick={() => setHelp(false)}><X size={18}/></button><span className="eyebrow">EVERTRIP · TERMINAL</span><h2>Una identidad<br/>con destino propio.</h2><p>Cuatro paletas y una jerarquía pensada para operar con claridad. Comparalas desde el selector Paleta.</p><p>Explorá Rutas, filtrá recorridos, creá uno nuevo o abrí una unidad en Flota para editar sus asientos.</p><small>Datos ficticios. No se conecta con la API. Los cambios se reinician al recargar; se conservan la sección y la paleta elegidas.</small></aside>}
  {toast && <div className="toast" role="status"><Check size={18}/>{toast}<button aria-label="Cerrar aviso" onClick={() => setToast('')}><X size={16}/></button></div>}</div>;
}
createRoot(document.getElementById('root')).render(<App/>);
