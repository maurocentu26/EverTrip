import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, MapPin, Plus, Route, Search, X } from 'lucide-react';
import { filterRoutes, money, number } from './data';

export function RouteForm({ route, onSave, onClose }) {
  const [values, setValues] = useState(route || { origin: '', destination: '', km: '', price: '', active: true });
  const [error, setError] = useState('');
  function submit(event) {
    event.preventDefault();
    if (!values.origin.trim() || !values.destination.trim() || values.origin.trim().toLowerCase() === values.destination.trim().toLowerCase()) {
      setError('Ingresá un origen y un destino diferentes.'); return;
    }
    onSave({ ...values, origin: values.origin.trim(), destination: values.destination.trim(), km: Number(values.km), price: Number(values.price) });
  }
  return <dialog open className="modal" aria-labelledby="form-title" onCancel={onClose} ref={node => { if (node && !node.dataset.focused) { node.querySelector('input')?.focus(); node.dataset.focused = 'true'; } }} onKeyDown={e => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Tab') {
      const items = Array.from(e.currentTarget.querySelectorAll('button,input')); const first = items[0]; const last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }}>
    <div className="modal-body"><div className="section-heading"><div><span className="eyebrow">RED DE RUTAS</span><h2 id="form-title">{route ? 'Editar recorrido' : 'Un nuevo destino.'}</h2></div><button className="icon-button" aria-label="Cerrar formulario" onClick={onClose}><X size={20}/></button></div>
    <p className="muted">Definí el recorrido y su tarifa base. Datos de demostración.</p>
    <form onSubmit={submit}>
      <div className="form-grid">{[['origin','Origen','text'],['destination','Destino','text'],['km','Distancia (km)','number'],['price','Tarifa base (ARS)','number']].map(([key,label,type]) => <label key={key}>{label}<input required type={type} min={type === 'number' ? '1' : undefined} step={type === 'number' ? 'any' : undefined} value={values[key]} onChange={e => { setError(''); setValues({ ...values, [key]: e.target.value }); }}/></label>)}</div>
      {error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" type="submit"><Check size={16}/>Guardar ruta</button></div>
    </form></div>
  </dialog>;
}

export function Routes({ routes, selected, onSelect, onCreate, onEdit, onToggle }) {
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('all');
  const filtered = filterRoutes(routes, query, filter);
  const activeCount = routes.filter(r => r.active).length;
  return <>
    <div className="page-heading"><div><div className="eyebrow"><span className="mini-line"/>CONECTAMOS DESTINOS</div><h1>Cada ruta, una posibilidad.</h1><p>Tu red de recorridos, en un solo lugar.</p></div><button className="button primary" onClick={onCreate}><Plus size={17}/>Nueva ruta</button></div>
    <div className="metrics"><div><span>Rutas en la red</span><strong>{String(routes.length).padStart(2,'0')}<small>recorridos</small></strong></div><div><span>Rutas activas</span><strong>{String(activeCount).padStart(2,'0')}<small><span className="status-dot"/>habilitadas</small></strong></div><div><span>Destinos conectados</span><strong>{String(new Set(routes.flatMap(r => [r.origin,r.destination])).size).padStart(2,'0')}<small>ciudades</small></strong></div><div className="metric-note"><Route size={28} strokeWidth={1.3}/><span>Un buen viaje empieza<br/>con una buena conexión.</span></div></div>
    <div className="workspace"><section className="list-panel"><div className="list-title"><h2>Red de rutas <span>{routes.length}</span></h2><span className="muted small">Tarifas en ARS</span></div>
      <div className="toolbar"><div className="tabs" aria-label="Estado de rutas">{[['all','Todas'],['active','Activas'],['inactive','Inactivas']].map(([value,label]) => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={filter === value ? 'selected' : ''}>{label}</button>)}</div><label className="search"><Search size={16}/><input aria-label="Buscar ruta" placeholder="Buscar recorrido…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Limpiar búsqueda" onClick={() => setQuery('')}><X size={14}/></button>}</label></div>
      <div className="table-scroll"><table><thead><tr><th>RECORRIDO</th><th>DISTANCIA</th><th>TARIFA BASE</th><th>ESTADO</th><th><span className="sr-only">Detalle</span></th></tr></thead><tbody>{filtered.map(r => <tr key={r.id} className={selected.id === r.id ? 'row-selected' : ''} onClick={() => onSelect(r)}>
        <td><button className="route-cell" onClick={() => onSelect(r)} aria-label={`Ver ruta ${r.origin} a ${r.destination}`}><span className="route-symbol"><span/><i/><span/></span><span><strong>{r.origin}</strong><span>{r.destination}</span></span></button></td><td className="numeric">{number(r.km)} <span className="muted">km</span></td><td className="numeric price">{money(r.price)}</td><td><span className={`badge ${r.active ? 'green' : 'neutral'}`}><span className="status-dot"/>{r.active ? 'Activa' : 'Inactiva'}</span></td><td><ArrowUpRight size={17} className="row-arrow"/></td>
      </tr>)}</tbody></table></div>
      {!filtered.length && <div className="empty"><Search size={28}/><h3>No encontramos recorridos</h3><p>Probá con otra ciudad o cambiá el estado.</p><button className="button secondary" onClick={() => { setQuery(''); setFilter('all'); }}>Restablecer filtros</button></div>}
      <footer className="table-footer"><span>{filtered.length} de {routes.length} recorridos</span><span><span className="status-dot"/>Red de media y larga distancia</span></footer>
    </section>
    <aside className="inspector" key={selected.id}><div className="inspector-label"><span className="eyebrow">EL RECORRIDO</span><ArrowUpRight size={18}/></div><div className="journey"><span className="journey-kicker">ORIGEN</span><h3>{selected.origin}</h3><div className="journey-connector"><span/><i/><span className="journey-distance">{number(selected.km)} km de camino</span><i/><MapPin size={18}/></div><span className="journey-kicker">DESTINO</span><h3>{selected.destination}</h3><span className="journey-foot">Conectar personas. Acercar lugares.</span></div>
      <div className="ticket-divider"><span/></div><div className="inspector-content"><div className="detail-heading"><h3>Detalle de ruta</h3><span className={`badge ${selected.active ? 'green' : 'neutral'}`}>{selected.active ? 'Activa' : 'Inactiva'}</span></div><dl><div><dt>Distancia total</dt><dd>{number(selected.km)} km</dd></div><div><dt>Tarifa base</dt><dd className="detail-price">{money(selected.price)}</dd></div><div><dt>Moneda</dt><dd>Peso argentino <span className="muted">· ARS</span></dd></div></dl><button className="button secondary full" onClick={() => onEdit(selected)}>Editar recorrido<ArrowRight size={16}/></button><button className="text-button full" onClick={() => onToggle(selected)}>{selected.active ? 'Desactivar ruta' : 'Activar ruta'}</button></div>
    </aside></div>
    <div className="bottom-note"><span className="small-caps">EVERTRIP TERMINAL</span><span>El camino, más simple.</span></div>
  </>;
}
