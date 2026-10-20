import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Armchair, ArrowLeft, ArrowRight, BusFront, CalendarDays, ChevronRight, Plus, RefreshCw, Search } from 'lucide-react';
import { ApiError, createViaje, getViajes, formatPatenteMercosur, type Ruta, type Vehiculo, type Viaje, type ViajeFilters } from '../services/api';
import { formatARS, formatARSDecimal, formatServiceTypeLabel } from '../utils/formatters';
import { formatTripTime, getArgentinaDay, searchDepartures, toArgentinaTimestamp } from '../utils/trips';
import { Modal } from '../components/Modal';

const statuses = [['programado','Programado'],['en_curso','En curso'],['finalizado','Finalizado'],['cancelado','Cancelado']] as const;
const blank = { ruta_id: '', vehiculo_id: '', salida: '', llegada: '', precio: '' };
interface Props {
  rutas: Ruta[]; vehiculos: Vehiculo[]; catalogLoading: boolean;
  onNotify: (message: string, type?: 'success' | 'warning' | 'error') => void;
}
export function TripsView({ rutas, vehiculos, catalogLoading, onNotify }: Props) {
  const [trips,setTrips] = useState<Viaje[]>([]);
  const [filters,setFilters] = useState<ViajeFilters>(() => {
    const day = getArgentinaDay();
    return { fecha_desde: day, fecha_hasta: day };
  });
  const [query,setQuery] = useState('');
  const [periodMode,setPeriodMode] = useState(false);
  const [filtersOpen,setFiltersOpen] = useState(false);
  const [selectedId,setSelectedId] = useState<string | null>(null);
  const [mobileDetail,setMobileDetail] = useState(false);
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const selectedButton = useRef<HTMLButtonElement | null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [reload,setReload] = useState(0);
  const [formOpen,setFormOpen] = useState(false);
  const [values,setValues] = useState(blank);
  const [formError,setFormError] = useState('');
  const [saving,setSaving] = useState(false);
  const [uncertain,setUncertain] = useState(false);
  const activeRoutes = rutas.filter(r => r.activa);
  const activeVehicles = vehiculos.filter(v => v.estado === 'activo');
  const chosenRoute = activeRoutes.find(r => r.id === values.ruta_id);
  const visibleTrips = searchDepartures(trips,query);
  const selected = visibleTrips.find(trip => trip.id === selectedId) || visibleTrips[0];
  const selectedDay = filters.fecha_desde === filters.fecha_hasta ? filters.fecha_desde || '' : '';

  useEffect(() => {
    if (mobileDetail && window.matchMedia('(max-width: 767px)').matches) {
      detailTitle.current?.focus();
      detailTitle.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [mobileDetail,selectedId]);
  function changeFilters(next: ViajeFilters) { setMobileDetail(false); setFilters(next); }
  function showDay(day: string) {
    setPeriodMode(false);
    changeFilters({ ...filters, fecha_desde: day || undefined, fecha_hasta: day || undefined });
  }
  function backToAgenda() {
    setMobileDetail(false);
    requestAnimationFrame(() => selectedButton.current?.focus());
  }

  useEffect(() => {
    let current = true;
    setLoading(true); setError('');
    getViajes(filters).then(data => { if (current) setTrips(data); })
      .catch(err => { if (current) setError(err instanceof Error ? err.message : 'No se pudieron cargar los viajes.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [filters,reload]);
  function openForm() { setValues(blank); setFormError(''); setUncertain(false); setFormOpen(true); }
  async function save(event: FormEvent) {
    event.preventDefault(); setFormError('');
    const salida = toArgentinaTimestamp(values.salida); const llegada = toArgentinaTimestamp(values.llegada);
    if (!values.ruta_id || !values.vehiculo_id || !salida || !llegada || Date.parse(llegada) <= Date.parse(salida)) {
      setFormError('Seleccioná ruta y unidad e ingresá una llegada posterior a la salida.'); return;
    }
    const price = values.precio.trim() === '' ? null : Number(values.precio);
    if (price !== null && (!Number.isFinite(price) || price < .01 || price > 9999999999.99 || Math.abs(price * 100 - Math.round(price * 100)) > .000001)) {
      setFormError('Ingresá una tarifa positiva con hasta dos decimales, o dejala vacía para usar la tarifa base.'); return;
    }
    setSaving(true);
    try {
      const created = await createViaje({ ruta_id:values.ruta_id,vehiculo_id:values.vehiculo_id,fecha_salida:salida,fecha_llegada:llegada,precio_override:price });
      const day = getArgentinaDay(created.fecha_salida);
      setQuery(''); setPeriodMode(false); setSelectedId(created.id); setMobileDetail(false);
      setFilters({ fecha_desde: day, fecha_hasta: day });
      setFormOpen(false); setReload(n => n+1); onNotify('Viaje programado. La unidad quedó asignada a ese horario.','success');
    } catch (err) {
      setFormError(err instanceof ApiError && err.code === 'VEHICLE_CONFLICT' ? 'La unidad ya tiene un viaje en ese horario. Elegí otra unidad o ajustá la salida y la llegada.' : err instanceof Error ? err.message : 'No se pudo programar el viaje.');
      if (err instanceof ApiError && err.code === 'CONNECTION_ERROR') setUncertain(true);
    } finally { setSaving(false); }
  }
  const badge = (trip: Viaje) => <span className={`et-badge ${trip.estado === 'en_curso' ? 'is-green' : trip.estado === 'programado' ? 'is-blue' : ''}`}>{statuses.find(s => s[0] === trip.estado)?.[1]}</span>;

  return <>
    <div className="et-page-heading et-dispatch-heading"><div><span className="et-eyebrow">CONTROL DE SALIDAS</span><h1>Cada salida, bajo control.</h1></div><div className="et-heading-actions"><button className="et-icon-button" aria-label="Actualizar salidas" disabled={loading} onClick={() => setReload(n => n+1)}><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button><button className="et-button et-primary" disabled={catalogLoading || !activeRoutes.length || !activeVehicles.length} onClick={openForm}><Plus size={17}/>Programar viaje</button></div></div>
    {!catalogLoading && (!activeRoutes.length || !activeVehicles.length) && <p className="et-form-warning">Necesitás una ruta activa y una unidad disponible para programar un viaje.</p>}
    <div className="et-dispatch-filters" aria-label="Filtros de salidas">
      <div className="et-dispatch-date-row">
        {periodMode ? <><label>Desde<input type="date" value={filters.fecha_desde || ''} onChange={e => changeFilters({...filters,fecha_desde:e.target.value})}/></label><label>Hasta<input type="date" value={filters.fecha_hasta || ''} onChange={e => changeFilters({...filters,fecha_hasta:e.target.value})}/></label></> : <label className="et-operation-day">Día de salida<span><CalendarDays size={17}/><input aria-label="Día de salida" type="date" value={selectedDay} onChange={e => showDay(e.target.value)}/></span></label>}
        <div className="et-dispatch-date-actions"><button className="et-button et-secondary" onClick={() => showDay(getArgentinaDay())}>Hoy</button><button className="et-button et-secondary" aria-pressed={!periodMode && !filters.fecha_desde && !filters.fecha_hasta} onClick={() => showDay('')}>Todas las fechas</button><button className="et-text-button" aria-pressed={periodMode} onClick={() => {if (periodMode) showDay(filters.fecha_desde || getArgentinaDay()); else {setMobileDetail(false);setPeriodMode(true);}}}>Por período</button></div>
        <label className="et-dispatch-search">Buscar salida<span className="et-search"><Search size={17}/><input aria-label="Buscar salida" placeholder="Recorrido, patente o ID…" value={query} onChange={e => {setMobileDetail(false);setQuery(e.target.value);}}/></span></label>
      </div>
      <button className="et-dispatch-more et-text-button" aria-expanded={filtersOpen} aria-controls="departure-filters" onClick={() => setFiltersOpen(value => !value)}>{filtersOpen ? 'Ocultar filtros' : 'Filtrar por recorrido y estado'}{(filters.ruta_id || filters.estado) ? ' · Activos' : ''}</button>
      <div id="departure-filters" className={`et-dispatch-select-row ${filtersOpen ? 'is-open' : ''}`}><label>Recorrido<select aria-label="Filtrar salidas por ruta" value={filters.ruta_id || ''} onChange={e => changeFilters({...filters,ruta_id:e.target.value})}><option value="">Todos los recorridos</option>{rutas.map(r => <option key={r.id} value={r.id}>{r.origen} → {r.destino}</option>)}</select></label><label>Estado<select value={filters.estado || ''} onChange={e => changeFilters({...filters,estado:e.target.value})}><option value="">Todos los estados</option>{statuses.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>{(filters.ruta_id || filters.estado || query) && <button className="et-text-button" onClick={() => {setQuery('');changeFilters({fecha_desde:filters.fecha_desde,fecha_hasta:filters.fecha_hasta});}}>Limpiar búsqueda y filtros</button>}<span className="et-dispatch-timezone">Horarios de Argentina · UTC−3</span></div>
    </div>
    <div className={`et-dispatch-grid ${!loading && !error && selected ? 'has-detail' : ''} ${mobileDetail && selected && !loading && !error ? 'is-detail-open' : ''}`}>
      <section className="et-panel et-departure-board" aria-labelledby="departure-board-title">
        <div className="et-list-title"><h2 id="departure-board-title">{selectedDay === getArgentinaDay() ? 'Agenda de hoy' : 'Agenda de salidas'}</h2><span className="et-muted et-small" role="status">{loading ? 'Consultando…' : error ? 'Consulta pendiente' : `${visibleTrips.length} ${visibleTrips.length === 1 ? 'salida' : 'salidas'}`}</span></div>
        {loading ? <div className="et-empty" role="status">Cargando salidas…</div> : error ? <div className="et-empty" role="alert"><h3>No pudimos consultar la programación</h3><p>{error}</p><button className="et-button et-secondary" onClick={() => setReload(n => n+1)}>Reintentar</button></div> : !visibleTrips.length ? <div className="et-empty"><CalendarDays size={30}/><h3>No hay salidas para mostrar</h3><p>{query ? 'Probá con otro recorrido, patente o ID.' : 'Programá una salida o consultá otra fecha y recorrido.'}</p>{!query && <button className="et-button et-secondary" onClick={() => {setPeriodMode(false);changeFilters({});}}>Ver todas las salidas</button>}</div> : <>
          <div className="et-departure-columns" aria-hidden="true"><span>SALIDA</span><span>RECORRIDO / UNIDAD</span><span>ESTADO</span><span/></div>
          <ul className="et-departure-list">{visibleTrips.map(trip => <li key={trip.id}><button aria-pressed={selected?.id === trip.id} className={`et-departure-row ${selected?.id === trip.id ? 'is-selected' : ''}`} onClick={event => {selectedButton.current=event.currentTarget;setSelectedId(trip.id);setMobileDetail(true);}} aria-controls="departure-detail">
            <span className="et-departure-clock"><time dateTime={trip.fecha_salida}>{formatTripTime(trip.fecha_salida)}</time><small>{getArgentinaDay(trip.fecha_salida).split('-').reverse().join('/')}</small></span>
            <span className="et-departure-route"><strong>{trip.ruta.destino}</strong><span>Desde {trip.ruta.origen}<ArrowRight size={11}/><time dateTime={trip.fecha_llegada}>{formatTripTime(trip.fecha_llegada)}</time>{getArgentinaDay(trip.fecha_llegada)!==getArgentinaDay(trip.fecha_salida) && <small>({getArgentinaDay(trip.fecha_llegada).split('-').reverse().join('/')})</small>}</span><small>{formatPatenteMercosur(trip.vehiculo.patente)} · {formatServiceTypeLabel(trip.vehiculo.tipo).shortLabel}</small></span>
            {badge(trip)}<ChevronRight size={16}/>
          </button></li>)}</ul><footer className="et-table-footer">Seleccioná una salida para consultar su detalle.<ArrowRight size={15}/></footer>
        </>}
      </section>
      {!loading && !error && selected && <aside className="et-panel et-departure-detail" id="departure-detail" aria-labelledby="departure-detail-title">
        <button className="et-departure-back et-text-button" onClick={backToAgenda}><ArrowLeft size={16}/>Volver a la agenda</button>
        <div className="et-departure-detail-top"><span className="et-eyebrow">DETALLE DE SALIDA</span>{badge(selected)}</div>
        <h2 id="departure-detail-title" tabIndex={-1} ref={detailTitle}>{selected.ruta.destino}</h2><p className="et-departure-subtitle">Desde {selected.ruta.origen}</p>
        <div className="et-departure-journey"><div><span>SALIDA</span><time dateTime={selected.fecha_salida}>{formatTripTime(selected.fecha_salida)}</time><small>{getArgentinaDay(selected.fecha_salida).split('-').reverse().join('/')}</small></div><ArrowRight size={22}/><div><span>LLEGADA</span><time dateTime={selected.fecha_llegada}>{formatTripTime(selected.fecha_llegada)}</time><small>{getArgentinaDay(selected.fecha_llegada).split('-').reverse().join('/')}</small></div></div>
        <dl className="et-departure-facts"><div><dt><BusFront size={18}/>Unidad asignada</dt><dd>{formatPatenteMercosur(selected.vehiculo.patente)}</dd></div><div><dt><Armchair size={18}/>Servicio</dt><dd>{formatServiceTypeLabel(selected.vehiculo.tipo).label}</dd></div><div><dt>Capacidad del viaje</dt><dd>{selected.asientos_totales} asientos</dd></div></dl>
        <div className="et-departure-price"><span>Tarifa del viaje <small>ARS · por pasajero</small></span><strong>{formatARSDecimal(selected.precio)}</strong></div>
        <p className="et-departure-reference">ID del viaje<span>{selected.id}</span></p>
      </aside>}
    </div>
    {formOpen && <Modal wide title="Programar un viaje" description="Definí el recorrido y el período de uso de la unidad. Horarios de Argentina (UTC−3)." onClose={() => setFormOpen(false)} busy={saving}><form className="et-form" onSubmit={save}><fieldset className="et-form-body" disabled={saving}><div className="et-form-grid"><label className="et-span-full">Recorrido<select required value={values.ruta_id} onChange={e => setValues({...values,ruta_id:e.target.value})}><option value="">Elegir una ruta…</option>{activeRoutes.map(r => <option key={r.id} value={r.id}>{r.origen} → {r.destino}</option>)}</select></label><label className="et-span-full">Unidad<select required value={values.vehiculo_id} onChange={e => setValues({...values,vehiculo_id:e.target.value})}><option value="">Elegir una unidad…</option>{activeVehicles.map(v => <option key={v.id} value={v.id}>{formatPatenteMercosur(v.patente)} · {v.interno || v.marca_modelo || `${v.capacidad_asientos} asientos`}</option>)}</select></label><label>Salida<input required type="datetime-local" value={values.salida} onChange={e => setValues({...values,salida:e.target.value})}/></label><label>Llegada<input required type="datetime-local" min={values.salida || undefined} value={values.llegada} onChange={e => setValues({...values,llegada:e.target.value})}/></label><label className="et-span-full">Tarifa del viaje (ARS, opcional)<input type="number" min="0.01" max="9999999999.99" step="0.01" placeholder={chosenRoute ? `Base: ${formatARS(chosenRoute.precio_base)}` : 'Usar la tarifa base de la ruta'} value={values.precio} onChange={e => setValues({...values,precio:e.target.value})}/><small className="et-muted">Si la dejás vacía, se guarda la tarifa base vigente al programar.</small></label></div>{formError && <p className="et-form-error" role="alert">{formError}</p>}{uncertain && <button type="button" className="et-button et-secondary et-full" onClick={() => {setFormOpen(false);setFilters({});setReload(n => n+1);}}>Consultar viajes antes de reintentar</button>}</fieldset><footer className="et-form-actions"><button className="et-button et-secondary" disabled={saving} type="button" onClick={() => setFormOpen(false)}>Cancelar</button><button className="et-button et-primary" disabled={saving || uncertain} type="submit">{saving ? 'Programando…' : 'Confirmar viaje'}</button></footer></form></Modal>}
  </>;
}
