import React, { useMemo, useState } from 'react';
import {
  Bus,
  Plus,
  Wrench,
  Users,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  Edit3,
  Grid,
  Search,
  X,
  AlertTriangle,
  Layers,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  Vehiculo,
  VehiculoInput,
  EstadoVehiculo,
  ApiError,
  createVehiculo,
  updateVehiculo,
  normalizePatente,
  countActiveSeatsInLayout,
} from '../services/api';
import { MercosurPlate } from '../components/MercosurPlate';
import {
  formatServiceTypeLabel,
  formatEstadoVehiculoBadge,
} from '../utils/formatters';

interface FleetViewProps {
  vehiculos: Vehiculo[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onOpenLayoutEditor: (vehiculoId: string) => void;
  onNotify: (message: string, type?: 'success' | 'warning' | 'error') => void;
}

export const FleetView: React.FC<FleetViewProps> = ({
  vehiculos,
  loading,
  onRefresh,
  onOpenLayoutEditor,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EstadoVehiculo>('ALL');

  // Create / Edit Vehicle Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehiculo, setEditingVehiculo] = useState<Vehiculo | null>(null);
  const [formPatente, setFormPatente] = useState('');
  const [formInterno, setFormInterno] = useState('');
  const [formMarcaModelo, setFormMarcaModelo] = useState('');
  const [formTipo, setFormTipo] = useState<string>('semicama');
  const [formPisos, setFormPisos] = useState<1 | 2>(2);
  const [formCapacidad, setFormCapacidad] = useState('44');
  const [formEstado, setFormEstado] = useState<EstadoVehiculo>('activo');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // KPIs computation
  const kpis = useMemo(() => {
    const operativos = vehiculos.filter((v) => v.estado === 'activo');
    const enTaller = vehiculos.filter((v) => v.estado === 'mantenimiento');
    const plazasTotalesDisponibles = operativos.reduce(
      (acc, v) => acc + Number(v.capacidad_asientos || 0),
      0
    );
    const layoutsConfigurados = vehiculos.filter((v) => v.layout_configurado).length;

    return {
      totalFlota: vehiculos.length,
      operativos: operativos.length,
      enTaller: enTaller.length,
      plazasTotalesDisponibles,
      layoutsConfigurados,
    };
  }, [vehiculos]);

  // Filtered Fleet
  const filteredVehiculos = useMemo(() => {
    return vehiculos.filter((v) => {
      if (statusFilter !== 'ALL' && v.estado !== statusFilter) return false;

      if (serviceFilter !== 'ALL') {
        const normTipo = v.tipo.toLowerCase();
        if (serviceFilter === 'semicama' && !normTipo.includes('semi')) return false;
        if (
          serviceFilter === 'cama_ejecutivo' &&
          !(normTipo.includes('cama') && !normTipo.includes('semi'))
        ) {
          return false;
        }
        if (
          serviceFilter === 'suite_primera' &&
          !(normTipo.includes('suite') || normTipo.includes('primera'))
        ) {
          return false;
        }
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().replace(/\s+/g, '');
        const matchPatente = v.patente.toLowerCase().includes(q);
        const matchInterno = (v.interno || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchModelo = (v.marca_modelo || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        return matchPatente || matchInterno || matchModelo;
      }

      return true;
    });
  }, [vehiculos, statusFilter, serviceFilter, searchQuery]);

  const openCreateModal = () => {
    setEditingVehiculo(null);
    setFormPatente('');
    setFormInterno(`INT-${101 + vehiculos.length}`);
    setFormMarcaModelo('Marcopolo Paradiso G8 1800 DD');
    setFormTipo('semicama');
    setFormPisos(2);
    setFormCapacidad('44');
    setFormEstado('activo');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (vehiculo: Vehiculo) => {
    setEditingVehiculo(vehiculo);
    setFormPatente(vehiculo.patente);
    setFormInterno(vehiculo.interno || '');
    setFormMarcaModelo(vehiculo.marca_modelo || '');
    setFormTipo(vehiculo.tipo);
    setFormPisos(vehiculo.pisos || 2);
    setFormCapacidad(String(vehiculo.capacidad_asientos));
    setFormEstado(vehiculo.estado);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPatente = normalizePatente(formPatente);
    if (cleanPatente.length < 6 || cleanPatente.length > 7) {
      setFormError(
        'Ingresá una patente válida formato Mercosur (7 caracteres ej. AB123CD) o formato previo (6 caracteres).'
      );
      return;
    }

    const cap = Number(formCapacidad);
    if (!Number.isFinite(cap) || cap < 8 || cap > 90) {
      setFormError('La capacidad de asientos debe estar comprendida entre 8 y 90 plazas.');
      return;
    }

    const payload: VehiculoInput = {
      patente: cleanPatente,
      tipo: formTipo,
      capacidad_asientos: cap,
      estado: formEstado,
      interno: formInterno.trim() || undefined,
      marca_modelo: formMarcaModelo.trim() || undefined,
      pisos: formPisos,
    };

    try {
      setSubmitting(true);
      if (editingVehiculo) {
        await updateVehiculo(editingVehiculo.id, payload);
        onNotify(`Unidad ${cleanPatente} actualizada en el padrón de flota.`, 'success');
      } else {
        await createVehiculo(payload);
        onNotify(`Nueva unidad ${cleanPatente} incorporada a la flota.`, 'success');
      }
      await onRefresh();
      setIsModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('No se pudo guardar el vehículo. Verificá los datos.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-[#0F1623]/90 border border-slate-800/80 rounded-xl p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-widest text-sky-400">
            <Bus className="w-3.5 h-3.5" />
            <span>Módulo 02 · Parque Móvil y Unidades · EVE-9</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 font-display">
            Gestión de Flota y Configuración de Unidades
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Control técnico de unidades habilitadas, patentes Mercosur, categoría de servicio y estado de distribución de butacas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onRefresh()}
            disabled={loading}
            className="btn-tactile inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-800 bg-slate-900/90 hover:bg-slate-800/80 text-slate-300 text-xs font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            <span>Actualizar Flota</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="btn-tactile inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm shadow-[0_0_20px_rgba(245,158,11,0.28)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Registrar Unidad</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Unidades Operativas
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-tabular text-slate-100">
              {kpis.operativos}
            </span>
            <span className="text-xs font-mono-tabular text-slate-400">
              / {kpis.totalFlota} en padrón
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Listas para asignación de diagrama</span>
          </div>
        </div>

        <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              En Taller / Mantenimiento
            </span>
            <span className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Wrench className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-tabular text-amber-300">
              {kpis.enTaller}
            </span>
            <span className="text-xs font-mono-tabular text-slate-400">unidades en revisión</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Bloqueadas preventivamente para despacho
          </div>
        </div>

        <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Plazas Totales Disponibles
            </span>
            <span className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-tabular text-sky-300">
              {kpis.plazasTotalesDisponibles}
            </span>
            <span className="text-xs font-mono-tabular text-slate-400">butacas activas</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {kpis.layoutsConfigurados} de {kpis.totalFlota} unidades con plano verificado
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por patente (ej. AG482KM), interno o chasis..."
              aria-label="Buscar vehículo por patente, interno o chasis"
              className="w-full pl-10 pr-9 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/70"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Service Type Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-sky-400" /> Servicio:
            </span>
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'semicama', label: 'Semicama' },
              { id: 'cama_ejecutivo', label: 'Cama Ejecutivo' },
              { id: 'suite_primera', label: 'Suite Primera Clase' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setServiceFilter(item.id)}
                className={`btn-tactile px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  serviceFilter === item.id
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-[#090D16] text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400 mr-1">
              Estado:
            </span>
            {(
              [
                { id: 'ALL', label: 'Toda la flota' },
                { id: 'activo', label: 'Activo' },
                { id: 'mantenimiento', label: 'Mantenimiento' },
                { id: 'inactivo', label: 'Inactivo' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`btn-tactile px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-[#090D16] text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono-tabular text-slate-400">
            Unidades listadas:{' '}
            <strong className="text-slate-200">{filteredVehiculos.length}</strong>
          </span>
        </div>
      </div>

      {/* Technical Fleet Cards Grid */}
      {filteredVehiculos.length === 0 ? (
        <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-12 text-center space-y-2">
          <Bus className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-slate-200 font-medium">
            No se encontraron unidades con los filtros seleccionados
          </p>
          <p className="text-xs text-slate-400">
            Cambiá los filtros de servicio/estado o registrá un nuevo vehículo en el padrón.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVehiculos.map((vehiculo) => {
            const serviceBadge = formatServiceTypeLabel(vehiculo.tipo);
            const estadoBadge = formatEstadoVehiculoBadge(vehiculo.estado);
            const pisosCount = vehiculo.pisos || 2;
            const configuredSeats = vehiculo.layout_data
              ? countActiveSeatsInLayout(vehiculo.layout_data)
              : vehiculo.capacidad_asientos;

            return (
              <div
                key={vehiculo.id}
                className="bg-[#0F1623] border border-slate-800/80 hover:border-slate-700/90 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-lg transition-colors"
              >
                {/* Top Card Header: Mercosur Plate + Internal Number + Status */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <MercosurPlate patente={vehiculo.patente} size="md" />

                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${estadoBadge.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${estadoBadge.dotClass}`} />
                        {estadoBadge.label}
                      </span>
                      <span className="text-xs font-mono-tabular font-semibold text-slate-400">
                        {vehiculo.interno || 'INT-S/N'}
                      </span>
                    </div>
                  </div>

                  {/* Chassis / Model Name */}
                  <div>
                    <div className="text-sm font-semibold text-slate-100 truncate">
                      {vehiculo.marca_modelo || 'Unidad de Larga Distancia'}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${serviceBadge.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${serviceBadge.dotClass}`} />
                        {serviceBadge.label}
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono-tabular bg-[#090D16] text-slate-300 border border-slate-800">
                        <Layers className="w-3 h-3 text-sky-400" />
                        {pisosCount === 2 ? 'Doble Piso (2P)' : 'Piso Simple (1P)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Technical Specs Grid */}
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg bg-[#090D16]/90 border border-slate-800/80">
                  <div>
                    <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                      Capacidad Homologada
                    </div>
                    <div className="mt-0.5 text-base font-bold font-mono-tabular text-slate-100">
                      {configuredSeats}{' '}
                      <span className="text-xs font-normal text-slate-400">butacas</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                      Estado del Layout
                    </div>
                    <div className="mt-1">
                      {vehiculo.layout_configurado ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Configurado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          Pendiente de plano
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(vehiculo)}
                    className="btn-tactile inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700/80 bg-[#090D16] hover:bg-slate-800 text-xs font-medium text-slate-200 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ficha Técnica</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenLayoutEditor(vehiculo.id)}
                    className="btn-tactile flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 font-semibold text-xs cursor-pointer"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>Diseñar Mapa de Asientos</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Registrar / Editar Unidad */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-vehiculo-title"
        >
          <div className="w-full max-w-lg bg-[#0F1623] border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden animate-modal-panel">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#090D16]/60">
              <div>
                <span className="text-[11px] font-mono-tabular uppercase tracking-widest text-sky-400">
                  {editingVehiculo ? 'Actualización de Unidad' : 'Registro de Parque Móvil'}
                </span>
                <h2
                  id="modal-vehiculo-title"
                  className="text-lg font-bold text-slate-100 font-display"
                >
                  {editingVehiculo
                    ? `Ficha Técnica · Dominio ${editingVehiculo.patente}`
                    : 'Incorporar Nuevo Vehículo a la Flota'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehiculo} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/12 border border-rose-500/40 flex items-start gap-2.5 text-rose-200 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Live Plate Preview */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#090D16] border border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
                    Previsualización Chapa Mercosur
                  </span>
                  <p className="text-xs text-slate-400">
                    Formato oficial RNPA / CNRT República Argentina
                  </p>
                </div>
                <MercosurPlate patente={formPatente || 'AB123CD'} size="md" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="veh-patente"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Dominio / Patente Mercosur *
                  </label>
                  <input
                    id="veh-patente"
                    type="text"
                    required
                    maxLength={9}
                    value={formPatente}
                    onChange={(e) => setFormPatente(e.target.value.toUpperCase())}
                    placeholder="Ej: AG482KM"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#090D16] border border-slate-700/90 text-sm font-mono-tabular uppercase text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="veh-interno"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Legajo / Interno Operativo
                  </label>
                  <input
                    id="veh-interno"
                    type="text"
                    value={formInterno}
                    onChange={(e) => setFormInterno(e.target.value)}
                    placeholder="Ej: INT-108"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#090D16] border border-slate-700/90 text-sm font-mono-tabular text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="veh-modelo"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Chasis y Carrocería
                </label>
                <input
                  id="veh-modelo"
                  type="text"
                  value={formMarcaModelo}
                  onChange={(e) => setFormMarcaModelo(e.target.value)}
                  placeholder="Ej: Scania K440EB / Marcopolo Paradiso G8 1800 DD"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#090D16] border border-slate-700/90 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="veh-tipo"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Tipo de Servicio *
                  </label>
                  <select
                    id="veh-tipo"
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#090D16] border border-slate-700/90 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="semicama">Semicama</option>
                    <option value="cama_ejecutivo">Cama Ejecutivo</option>
                    <option value="suite_primera">Suite Primera Clase</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="veh-pisos"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Niveles / Pisos *
                  </label>
                  <select
                    id="veh-pisos"
                    value={formPisos}
                    onChange={(e) => setFormPisos(Number(e.target.value) as 1 | 2)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#090D16] border border-slate-700/90 text-sm font-mono-tabular text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value={2}>2 Pisos (Doble Piso)</option>
                    <option value={1}>1 Piso (Simple)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="veh-capacidad"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Plazas Totales *
                  </label>
                  <input
                    id="veh-capacidad"
                    type="number"
                    min={8}
                    max={90}
                    required
                    value={formCapacidad}
                    onChange={(e) => setFormCapacidad(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#090D16] border border-slate-700/90 text-sm font-mono-tabular text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Estado Operativo de la Unidad *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { id: 'activo', label: 'Activo en Red' },
                      { id: 'mantenimiento', label: 'En Taller' },
                      { id: 'inactivo', label: 'Inactivo' },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFormEstado(option.id)}
                      className={`btn-tactile py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                        formEstado === option.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-[#090D16] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-tactile px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-tactile inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs shadow-[0_0_16px_rgba(245,158,11,0.3)] cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Guardando...'
                      : editingVehiculo
                      ? 'Guardar Cambios'
                      : 'Registrar Unidad'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
