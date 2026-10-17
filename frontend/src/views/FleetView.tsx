import { useEffect, useState, type FormEvent } from 'react';
import { Armchair, ArrowRight, ArrowUpRight, BusFront, Edit3, Layers, Plus, RefreshCw, Search } from 'lucide-react';
import { ApiError, createVehiculo, updateVehiculo, normalizePatente, type Vehiculo, type VehiculoInput, type EstadoVehiculo } from '../services/api';
import { formatServiceTypeLabel } from '../utils/formatters';
import { MercosurPlate } from '../components/MercosurPlate';
import { Modal } from '../components/Modal';
import { validateVehiculo } from '../utils/catalogValidation';

interface FleetViewProps {
  vehiculos: Vehiculo[]; loading: boolean; onRefresh: () => Promise<void>;
  onOpenLayoutEditor: (id: string) => void;
  onNotify: (message: string, type?: 'success' | 'warning' | 'error') => void;
  externalCreateTrigger?: number;
}
const serviceOptions = [['semicama','Semicama'],['cama_ejecutivo','Cama Ejecutivo'],['suite_primera','Suite Primera Clase']];
const states: [EstadoVehiculo,string][] = [['activo','Disponible'],['mantenimiento','Mantenimiento'],['inactivo','Fuera de servicio']];

export function FleetView({ vehiculos, loading, onRefresh, onOpenLayoutEditor, onNotify, externalCreateTrigger }: FleetViewProps) {
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('all'); const [service, setService] = useState('all');
  const [form, setForm] = useState<{ vehicle: Vehiculo | null } | null>(null);
  const [values, setValues] = useState({ patente: '', interno: '', marca_modelo: '', tipo: 'semicama', pisos: 2 as 1 | 2, capacidad_asientos: '44', estado: 'activo' as EstadoVehiculo });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const filtered = vehiculos.filter(v => {
    const q = query.trim().toLowerCase();
    return (v.patente.toLowerCase().includes(q.replace(/\s/g,'')) || `${v.interno || ''} ${v.marca_modelo || ''}`.toLowerCase().includes(q)) && (status === 'all' || v.estado === status) && (service === 'all' || formatServiceTypeLabel(v.tipo).label === formatServiceTypeLabel(service).label);
  });
  function openForm(vehicle: Vehiculo | null = null) {
    setError(''); setForm({ vehicle });
    setValues(vehicle ? { patente: vehicle.patente, interno: vehicle.interno || '', marca_modelo: vehicle.marca_modelo || '', tipo: vehicle.tipo, pisos: vehicle.pisos || 2, capacidad_asientos: String(vehicle.capacidad_asientos), estado: vehicle.estado } : { patente: '', interno: '', marca_modelo: '', tipo: 'semicama', pisos: 2, capacidad_asientos: '44', estado: 'activo' });
  }
  useEffect(() => { if (externalCreateTrigger) openForm(); }, [externalCreateTrigger]);
  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    const plate = normalizePatente(values.patente); const capacity = Number(values.capacidad_asientos);
    const payload: VehiculoInput = { patente: plate, interno: values.interno.trim() || undefined, marca_modelo: values.marca_modelo.trim() || undefined, tipo: values.tipo, pisos: values.pisos, capacidad_asientos: capacity, estado: values.estado };
    const validation = validateVehiculo(payload);
    if (validation) { setError(validation); return; }
    setSaving(true);
    try {
      if (form?.vehicle) await updateVehiculo(form.vehicle.id, payload); else await createVehiculo(payload);
      await onRefresh(); setForm(null); onNotify(form?.vehicle ? 'Unidad actualizada.' : 'Unidad incorporada a la flota.', 'success');
    } catch (err) { setError(err instanceof ApiError ? err.message : 'No se pudo guardar el vehículo. Intentá nuevamente.'); }
    finally { setSaving(false); }
  }
  return <>
    <div className="et-page-heading"><div><span className="et-eyebrow">LISTOS PARA EL CAMINO</span><h1>Tu flota, en movimiento.</h1><p>Conocé cada unidad. Prepará cada recorrido.</p></div><div className="et-heading-actions"><button className="et-icon-button" aria-label="Actualizar flota" disabled={loading} onClick={() => void onRefresh()}><RefreshCw size={18} className={loading ? 'animate-spin' : ''}/></button><button className="et-button et-primary" onClick={() => openForm()}><Plus size={17}/>Registrar unidad</button></div></div>
    <div className="et-metrics"><div><span>Unidades en flota</span><strong>{vehiculos.length}<small>vehículos</small></strong></div><div><span>Disponibles</span><strong>{vehiculos.filter(v => v.estado === 'activo').length}<small>en servicio</small></strong></div><div><span>En mantenimiento</span><strong>{vehiculos.filter(v => v.estado === 'mantenimiento').length}<small>unidades</small></strong></div></div>
    <section className="et-panel"><div className="et-list-title"><h2>Unidades <span>{vehiculos.length}</span></h2></div><div className="et-toolbar"><div className="et-tabs" aria-label="Estado de vehículos">{[['all','Todas'],['activo','Disponibles'],['mantenimiento','En taller'],['inactivo','Inactivas']].map(([value,label]) => <button key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>{label}</button>)}</div><label className="et-search"><Search size={16}/><input aria-label="Buscar vehículo" placeholder="Patente, interno o modelo…" value={query} onChange={e => setQuery(e.target.value)}/></label></div>
      <div className="et-filter-row"><select aria-label="Filtrar por servicio" value={service} onChange={e => setService(e.target.value)}><option value="all">Todos los servicios</option>{serviceOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>{(query || status !== 'all' || service !== 'all') && <button className="et-text-button" onClick={() => {setQuery('');setStatus('all');setService('all');}}>Limpiar filtros</button>}</div>
      {loading ? <div className="et-empty" role="status">Cargando flota…</div> : <div className="et-fleet-grid">{filtered.map(v => <article className="et-vehicle-card" key={v.id}><div className="et-vehicle-top"><span className="et-eyebrow">{v.interno || 'Sin interno'}</span><button className="et-icon-button" aria-label={`Editar unidad ${v.patente}`} onClick={() => openForm(v)}><Edit3 size={17}/></button></div><button className="et-vehicle-preview" aria-label={`Ver asientos de ${v.patente}`} onClick={() => onOpenLayoutEditor(v.id)}><BusFront size={78} strokeWidth={1}/><span className="et-road-line"/></button><div className="et-plate"><MercosurPlate patente={v.patente} size="md"/></div><h3>{v.marca_modelo || 'Modelo sin especificar'}</h3><div className="et-vehicle-spec"><span><Armchair size={15}/>{v.capacidad_asientos} asientos</span><span><Layers size={14}/>{v.pisos || 2} {(v.pisos || 2) === 1 ? 'piso' : 'pisos'}</span></div><p className="et-service-label">{formatServiceTypeLabel(v.tipo).label}</p><div className="et-vehicle-bottom"><span className={`et-badge ${v.estado === 'activo' ? 'is-green' : v.estado === 'mantenimiento' ? 'is-amber' : ''}`}>{states.find(s => s[0] === v.estado)?.[1]}</span><button className="et-link" onClick={() => onOpenLayoutEditor(v.id)}>Ver asientos<ArrowRight size={15}/></button></div></article>)}</div>}
      {!loading && !filtered.length && <div className="et-empty"><BusFront size={28}/><h3>{vehiculos.length ? 'No encontramos unidades' : 'Sumá la primera unidad'}</h3><p>{vehiculos.length ? 'Probá con otra búsqueda o cambiá los filtros.' : 'Registrá un vehículo para empezar a configurar tu flota.'}</p></div>}
    </section>
    {form && <Modal wide title={form.vehicle ? 'Editar unidad' : 'Sumar una unidad.'} description="Los datos esenciales de tu vehículo, en un solo lugar." busy={saving} onClose={() => setForm(null)}><form className="et-form" onSubmit={save}><fieldset disabled={saving} className="et-form-body"><section className="et-form-section"><h3>Identificación</h3><div className="et-form-grid"><label>Patente<input required maxLength={9} autoComplete="off" placeholder="AB123CD" value={values.patente} onChange={e => setValues({...values,patente:e.target.value.toUpperCase()})}/></label><label>Interno<input placeholder="Ej. INT-108" value={values.interno} onChange={e => setValues({...values,interno:e.target.value})}/></label><label className="et-span-full">Marca y modelo<input placeholder="Ej. Mercedes-Benz · Marcopolo G7" value={values.marca_modelo} onChange={e => setValues({...values,marca_modelo:e.target.value})}/></label></div></section><section className="et-form-section"><h3>Servicio y capacidad</h3><div className="et-form-grid"><label className="et-span-full">Tipo de servicio<select value={values.tipo} onChange={e => setValues({...values,tipo:e.target.value})}>{!serviceOptions.some(s => s[0] === values.tipo) && <option value={values.tipo}>{formatServiceTypeLabel(values.tipo).label}</option>}{serviceOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Pisos<select value={values.pisos} onChange={e => setValues({...values,pisos:Number(e.target.value) as 1 | 2})}><option value={1}>1 piso</option><option value={2}>2 pisos</option></select></label><label>Capacidad de asientos<input type="number" required min={8} max={90} step={1} value={values.capacidad_asientos} onChange={e => setValues({...values,capacidad_asientos:e.target.value})}/></label><label className="et-span-full">Estado operativo<select value={values.estado} onChange={e => setValues({...values,estado:e.target.value as EstadoVehiculo})}>{states.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></section>{error && <p className="et-form-error" role="alert">{error}</p>}</fieldset><footer className="et-form-actions"><button type="button" className="et-button et-secondary" disabled={saving} onClick={() => setForm(null)}>Cancelar</button><button className="et-button et-primary" disabled={saving} type="submit">{saving ? 'Guardando…' : 'Guardar unidad'}</button></footer></form></Modal>}
  </>;
}
