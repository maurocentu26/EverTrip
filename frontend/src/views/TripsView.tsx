import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, Plus, RefreshCw } from 'lucide-react';
import { ApiError, createViaje, getViajes, formatPatenteMercosur, type Ruta, type Vehiculo, type Viaje, type ViajeFilters } from '../services/api';
import { formatARS, formatARSDecimal } from '../utils/formatters';
import { formatTripDate, toArgentinaTimestamp } from '../utils/trips';
import { Modal } from '../components/Modal';

const statuses = [['programado','Programado'],['en_curso','En curso'],['finalizado','Finalizado'],['cancelado','Cancelado']] as const;
const blank = { ruta_id: '', vehiculo_id: '', salida: '', llegada: '', precio: '' };
interface Props {
  rutas: Ruta[]; vehiculos: Vehiculo[]; catalogLoading: boolean;
  onNotify: (message: string, type?: 'success' | 'warning' | 'error') => void;
}
export function TripsView({ rutas, vehiculos, catalogLoading, onNotify }: Props) {
  const [trips,setTrips] = useState<Viaje[]>([]);
  const [filters,setFilters] = useState<ViajeFilters>({});
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
      await createViaje({ ruta_id:values.ruta_id,vehiculo_id:values.vehiculo_id,fecha_salida:salida,fecha_llegada:llegada,precio_override:price });
      setFormOpen(false); setReload(n => n+1); onNotify('Viaje programado. La unidad quedó asignada a ese horario.','success');
    } catch (err) {
      setFormError(err instanceof ApiError && err.code === 'VEHICLE_CONFLICT' ? 'La unidad ya tiene un viaje en ese horario. Elegí otra unidad o ajustá la salida y la llegada.' : err instanceof Error ? err.message : 'No se pudo programar el viaje.');
      if (err instanceof ApiError && err.code === 'CONNECTION_ERROR') setUncertain(true);
    } finally { setSaving(false); }
  }
  const badge = (trip: Viaje) => <span className={`et-badge ${trip.estado === 'en_curso' ? 'is-green' : trip.estado === 'programado' ? 'is-blue' : ''}`}>{statuses.find(s => s[0] === trip.estado)?.[1]}</span>;

  return <>
    <div className="et-page-heading"><div><span className="et-eyebrow">EL PRÓXIMO DESTINO</span><h1>Cada salida, un nuevo viaje.</h1><p>Planificá recorridos, unidades y horarios sin superposiciones.</p></div><div className="et-heading-actions"><button className="et-icon-button" aria-label="Actualizar viajes" disabled={loading} onClick={() => setReload(n => n+1)}><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button><button className="et-button et-primary" disabled={catalogLoading || !activeRoutes.length || !activeVehicles.length} onClick={openForm}><Plus size={17}/>Programar viaje</button></div></div>
    {!catalogLoading && (!activeRoutes.length || !activeVehicles.length) && <p className="et-form-warning">Necesitás una ruta activa y una unidad disponible para programar un viaje.</p>}
    <section className="et-panel et-trips-panel"><div className="et-list-title"><h2>Programación</h2><span className="et-muted et-small">Horarios de Argentina · UTC−3</span></div>
      <div className="et-trip-filters"><label>Desde<input type="date" value={filters.fecha_desde || ''} onChange={e => setFilters({...filters,fecha_desde:e.target.value})}/></label><label>Hasta<input type="date" value={filters.fecha_hasta || ''} onChange={e => setFilters({...filters,fecha_hasta:e.target.value})}/></label><label>Recorrido<select aria-label="Filtrar viajes por ruta" value={filters.ruta_id || ''} onChange={e => setFilters({...filters,ruta_id:e.target.value})}><option value="">Todos los recorridos</option>{rutas.map(r => <option key={r.id} value={r.id}>{r.origen} → {r.destino}</option>)}</select></label><label>Estado<select value={filters.estado || ''} onChange={e => setFilters({...filters,estado:e.target.value})}><option value="">Todos los estados</option>{statuses.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>{Object.values(filters).some(Boolean) && <button className="et-text-button" onClick={() => setFilters({})}>Limpiar filtros</button>}</div>
      {loading ? <div className="et-empty" role="status">Cargando viajes…</div> : error ? <div className="et-empty" role="alert"><h3>No pudimos consultar la programación</h3><p>{error}</p><button className="et-button et-secondary" onClick={() => setReload(n => n+1)}>Reintentar</button></div> : !trips.length ? <div className="et-empty"><CalendarDays size={30}/><h3>No hay viajes para mostrar</h3><p>Programá una salida o probá con otro período y recorrido.</p></div> : <>
        <div className="et-table-scroll et-trips-desktop"><table className="et-table et-trip-table"><thead><tr><th>RECORRIDO</th><th>UNIDAD</th><th>SALIDA</th><th>LLEGADA</th><th>TARIFA</th><th>ESTADO</th></tr></thead><tbody>{trips.map(trip => <tr key={trip.id}><td><strong>{trip.ruta.origen}</strong><span className="et-trip-destination">{trip.ruta.destino}</span></td><td>{formatPatenteMercosur(trip.vehiculo.patente)}</td><td><time dateTime={trip.fecha_salida}>{formatTripDate(trip.fecha_salida)}</time></td><td><time dateTime={trip.fecha_llegada}>{formatTripDate(trip.fecha_llegada)}</time></td><td className="et-numeric et-price">{formatARSDecimal(trip.precio)}</td><td>{badge(trip)}</td></tr>)}</tbody></table></div>
        <div className="et-trip-cards">{trips.map(trip => <article key={trip.id}><div className="et-section-title"><span className="et-eyebrow">{formatPatenteMercosur(trip.vehiculo.patente)}</span>{badge(trip)}</div><h3>{trip.ruta.origen}<ArrowRight size={15}/>{trip.ruta.destino}</h3><dl className="et-detail-list"><div><dt>Salida</dt><dd><time dateTime={trip.fecha_salida}>{formatTripDate(trip.fecha_salida)}</time></dd></div><div><dt>Llegada</dt><dd><time dateTime={trip.fecha_llegada}>{formatTripDate(trip.fecha_llegada)}</time></dd></div><div><dt>Tarifa</dt><dd className="et-price">{formatARSDecimal(trip.precio)}</dd></div></dl></article>)}</div><footer className="et-table-footer">{trips.length} {trips.length === 1 ? 'viaje' : 'viajes'} en el listado</footer>
      </>}
    </section>
    {formOpen && <Modal wide title="Programar un viaje" description="Definí el recorrido y el período de uso de la unidad. Horarios de Argentina (UTC−3)." onClose={() => setFormOpen(false)} busy={saving}><form className="et-form" onSubmit={save}><fieldset className="et-form-body" disabled={saving}><div className="et-form-grid"><label className="et-span-full">Recorrido<select required value={values.ruta_id} onChange={e => setValues({...values,ruta_id:e.target.value})}><option value="">Elegir una ruta…</option>{activeRoutes.map(r => <option key={r.id} value={r.id}>{r.origen} → {r.destino}</option>)}</select></label><label className="et-span-full">Unidad<select required value={values.vehiculo_id} onChange={e => setValues({...values,vehiculo_id:e.target.value})}><option value="">Elegir una unidad…</option>{activeVehicles.map(v => <option key={v.id} value={v.id}>{formatPatenteMercosur(v.patente)} · {v.interno || v.marca_modelo || `${v.capacidad_asientos} asientos`}</option>)}</select></label><label>Salida<input required type="datetime-local" value={values.salida} onChange={e => setValues({...values,salida:e.target.value})}/></label><label>Llegada<input required type="datetime-local" min={values.salida || undefined} value={values.llegada} onChange={e => setValues({...values,llegada:e.target.value})}/></label><label className="et-span-full">Tarifa del viaje (ARS, opcional)<input type="number" min="0.01" max="9999999999.99" step="0.01" placeholder={chosenRoute ? `Base: ${formatARS(chosenRoute.precio_base)}` : 'Usar la tarifa base de la ruta'} value={values.precio} onChange={e => setValues({...values,precio:e.target.value})}/><small className="et-muted">Si la dejás vacía, se guarda la tarifa base vigente al programar.</small></label></div>{formError && <p className="et-form-error" role="alert">{formError}</p>}{uncertain && <button type="button" className="et-button et-secondary et-full" onClick={() => {setFormOpen(false);setFilters({});setReload(n => n+1);}}>Consultar viajes antes de reintentar</button>}</fieldset><footer className="et-form-actions"><button className="et-button et-secondary" disabled={saving} type="button" onClick={() => setFormOpen(false)}>Cancelar</button><button className="et-button et-primary" disabled={saving || uncertain} type="submit">{saving ? 'Programando…' : 'Confirmar viaje'}</button></footer></form></Modal>}
  </>;
}
