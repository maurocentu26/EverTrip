import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, MapPin, Plus, RefreshCw, Search } from 'lucide-react';
import { ApiError, createRuta, updateRuta, toggleRutaActiva, type Ruta } from '../services/api';
import { formatARS, formatKm } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { validateRuta } from '../utils/catalogValidation';

interface RoutesViewProps {
  rutas: Ruta[]; loading: boolean; onRefresh: () => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'warning' | 'error') => void;
  externalCreateTrigger?: number;
  externalSelectedId?: string | null;
}

export function RoutesView({ rutas, loading, onRefresh, onNotify, externalCreateTrigger, externalSelectedId }: RoutesViewProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [form, setForm] = useState<{ route: Ruta | null } | null>(null);
  const [values, setValues] = useState({ origen: '', destino: '', distancia_km: '', precio_base: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const filtered = rutas.filter(r => `${r.origen} ${r.destino}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
    (status === 'all' || r.activa === (status === 'active')) && (!origin || r.origen === origin) && (!destination || r.destino === destination));
  const selected = filtered.find(r => r.id === selectedId) || filtered[0];
  const active = rutas.filter(r => r.activa).length;
  const cities = new Set(rutas.flatMap(r => [r.origen, r.destino])).size;
  const duplicate = rutas.some(r => r.id !== form?.route?.id && r.origen.trim().toLocaleLowerCase() === values.origen.trim().toLocaleLowerCase() && r.destino.trim().toLocaleLowerCase() === values.destino.trim().toLocaleLowerCase());

  function openForm(route: Ruta | null = null) {
    setMobileDetail(false); setError(''); setForm({ route });
    setValues(route ? { origen: route.origen, destino: route.destino, distancia_km: String(route.distancia_km), precio_base: String(route.precio_base) } : { origen: '', destino: '', distancia_km: '', precio_base: '' });
  }
  useEffect(() => { if (externalCreateTrigger) openForm(); }, [externalCreateTrigger]);
  useEffect(() => {
    if (!externalSelectedId) return;
    setSelectedId(externalSelectedId); setQuery(''); setStatus('all'); setOrigin(''); setDestination('');
    setMobileDetail(window.matchMedia('(max-width: 1023px)').matches);
  }, [externalSelectedId]);
  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    const payload = { origen: values.origen.trim(), destino: values.destino.trim(), distancia_km: Number(values.distancia_km), precio_base: Number(values.precio_base) };
    const validation = validateRuta(payload);
    if (validation) { setError(validation); return; }
    setSaving(true);
    try {
      const route = form?.route ? await updateRuta(form.route.id, payload) : await createRuta(payload);
      setSelectedId(route.id); await onRefresh(); setForm(null);
      onNotify(form?.route ? 'Recorrido actualizado.' : 'Nueva ruta creada.', 'success');
    } catch (err) { setError(err instanceof ApiError ? err.message : 'No se pudo guardar la ruta. Intentá nuevamente.'); }
    finally { setSaving(false); }
  }
  async function toggle(route: Ruta) {
    setToggling(true);
    try { await toggleRutaActiva(route.id, !route.activa); await onRefresh(); onNotify(route.activa ? 'Ruta desactivada.' : 'Ruta activada.', route.activa ? 'warning' : 'success'); }
    catch (err) { onNotify(err instanceof Error ? err.message : 'No se pudo cambiar el estado.', 'error'); }
    finally { setToggling(false); }
  }
  function reset() { setQuery(''); setStatus('all'); setOrigin(''); setDestination(''); }
  function selectRoute(route: Ruta) {
    setSelectedId(route.id);
    setMobileDetail(window.matchMedia('(max-width: 1023px)').matches);
  }
  const detail = selected && <>
    <div className="et-journey"><span className="et-eyebrow">EL RECORRIDO <ArrowUpRight size={18}/></span><span className="et-journey-label">ORIGEN</span><h3>{selected.origen}</h3><div className="et-journey-line"><i/><span>{formatKm(selected.distancia_km)} de camino</span><MapPin size={17}/></div><span className="et-journey-label">DESTINO</span><h3>{selected.destino}</h3></div>
    <div className="et-detail-body"><div className="et-section-title"><h3>Detalle de ruta</h3><span className={`et-badge ${selected.activa ? 'is-green' : ''}`}>{selected.activa ? 'Activa' : 'Inactiva'}</span></div><dl className="et-detail-list"><div><dt>Distancia total</dt><dd>{formatKm(selected.distancia_km)}</dd></div><div><dt>Tarifa base</dt><dd className="et-detail-price">{formatARS(selected.precio_base)}</dd></div><div><dt>Moneda</dt><dd>Peso argentino · ARS</dd></div></dl><button className="et-button et-secondary et-full" onClick={() => openForm(selected)}>Editar recorrido<ArrowRight size={16}/></button><button className="et-text-button et-full" disabled={toggling} onClick={() => toggle(selected)}>{toggling ? 'Actualizando…' : selected.activa ? 'Desactivar ruta' : 'Activar ruta'}</button></div>
  </>;
  return <>
    <div className="et-page-heading"><div><span className="et-eyebrow">CONECTAMOS DESTINOS</span><h1>Cada ruta, una posibilidad.</h1><p>Tu red de recorridos, en un solo lugar.</p></div><div className="et-heading-actions"><button className="et-icon-button" title="Actualizar rutas" aria-label="Actualizar rutas" disabled={loading} onClick={() => void onRefresh()}><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button><button className="et-button et-primary" onClick={() => openForm()}><Plus size={17}/>Nueva ruta</button></div></div>
    <div className="et-metrics"><div><span>Rutas en la red</span><strong>{rutas.length}<small>recorridos</small></strong></div><div><span>Rutas activas</span><strong>{active}<small>habilitadas</small></strong></div><div><span>Destinos conectados</span><strong>{cities}<small>ciudades</small></strong></div></div>
    <div className="et-workspace"><section className="et-panel"><div className="et-list-title"><h2>Red de rutas <span>{rutas.length}</span></h2><span className="et-muted et-small">Tarifas en ARS</span></div><div className="et-toolbar"><div className="et-tabs" aria-label="Estado de rutas">{[['all','Todas'],['active','Activas'],['inactive','Inactivas']].map(([value,label]) => <button key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>{label}</button>)}</div><label className="et-search"><Search size={16}/><input aria-label="Buscar ruta" placeholder="Buscar recorrido…" value={query} onChange={e => setQuery(e.target.value)}/></label></div>
      <div className="et-filter-row"><select aria-label="Filtrar por origen" value={origin} onChange={e => setOrigin(e.target.value)}><option value="">Todos los orígenes</option>{Array.from(new Set(rutas.map(r => r.origen))).sort().map(city => <option key={city}>{city}</option>)}</select><select aria-label="Filtrar por destino" value={destination} onChange={e => setDestination(e.target.value)}><option value="">Todos los destinos</option>{Array.from(new Set(rutas.map(r => r.destino))).sort().map(city => <option key={city}>{city}</option>)}</select>{(query || origin || destination || status !== 'all') && <button className="et-text-button" onClick={reset}>Limpiar filtros</button>}</div>
      <div className="et-table-scroll"><table className="et-table"><thead><tr><th>RECORRIDO</th><th>DISTANCIA</th><th>TARIFA BASE</th><th>ESTADO</th><th><span className="sr-only">Detalle</span></th></tr></thead><tbody>{!loading && filtered.map(r => <tr key={r.id} className={selected?.id === r.id ? 'is-selected' : ''} onClick={() => { selectRoute(r); }}><td><button className="et-route-cell" aria-label={`Ver ruta ${r.origen} a ${r.destino}`} onClick={e => { e.stopPropagation(); selectRoute(r); }}><span className="et-route-symbol"><i/><span/><i/></span><span><strong>{r.origen}</strong><span>{r.destino}</span></span></button></td><td className="et-numeric">{formatKm(r.distancia_km)}</td><td className="et-numeric et-price">{formatARS(r.precio_base)}</td><td><span className={`et-badge ${r.activa ? 'is-green' : ''}`}>{r.activa ? 'Activa' : 'Inactiva'}</span></td><td><ArrowUpRight size={16}/></td></tr>)}</tbody></table></div>
      {loading ? <div className="et-empty" role="status">Cargando rutas…</div> : !filtered.length && <div className="et-empty"><Search size={26}/><h3>{rutas.length ? 'No encontramos recorridos' : 'Tu próxima ruta empieza acá'}</h3><p>{rutas.length ? 'Probá con otra ciudad o cambiá los filtros.' : 'Creá el primer recorrido de tu red.'}</p><button className="et-button et-secondary" onClick={rutas.length ? reset : () => openForm()}>{rutas.length ? 'Restablecer filtros' : 'Crear ruta'}</button></div>}
      <footer className="et-table-footer">{filtered.length} de {rutas.length} recorridos</footer>
    </section><aside className="et-panel et-route-detail" aria-label="Detalle del recorrido">{!loading && detail}{!selected && !loading && <div className="et-empty">Seleccioná un recorrido para ver su detalle.</div>}</aside></div>
    {mobileDetail && selected && !form && <Modal title="Detalle del recorrido" onClose={() => setMobileDetail(false)}>{detail}</Modal>}
    {form && <Modal title={form.route ? 'Editar recorrido' : 'Un nuevo destino.'} description="Definí las ciudades, la distancia y la tarifa base." onClose={() => setForm(null)} busy={saving}>
      <form className="et-form" onSubmit={save}><div className="et-form-body"><div className="et-form-grid">{([['origen','Origen','text'],['destino','Destino','text'],['distancia_km','Distancia (km)','number'],['precio_base','Tarifa base (ARS)','number']] as const).map(([key,label,type]) => <label key={key}>{label}<input required type={type} min={type === 'number' ? '0.01' : undefined} step={type === 'number' ? 'any' : undefined} value={values[key]} disabled={saving} onChange={e => { setError(''); setValues({ ...values, [key]: e.target.value }); }}/></label>)}</div>{duplicate && <p className="et-form-warning" role="status">Ya existe un recorrido con este origen y destino.</p>}{error && <p className="et-form-error" role="alert">{error}</p>}</div><footer className="et-form-actions"><button type="button" className="et-button et-secondary" disabled={saving} onClick={() => setForm(null)}>Cancelar</button><button className="et-button et-primary" disabled={saving || duplicate} type="submit">{saving ? 'Guardando…' : 'Guardar ruta'}</button></footer></form>
    </Modal>}
  </>;
}
