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
  Cpu,
  ChevronRight,
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
  buildStandardFloor,
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
  externalCreateTrigger?: number;
}

export const FleetView: React.FC<FleetViewProps> = ({
  vehiculos,
  loading,
  onRefresh,
  onOpenLayoutEditor,
  onNotify,
  externalCreateTrigger,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EstadoVehiculo>('ALL');

  // Split Canvas Inspector State
  const [inspectedVehiculoId, setInspectedVehiculoId] = useState<string | null>(
    vehiculos[0]?.id || null
  );
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);

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

  React.useEffect(() => {
    if (externalCreateTrigger && externalCreateTrigger > 0) {
      openCreateModal();
    }
  }, [externalCreateTrigger]);

  const inspectedVehiculo = useMemo(() => {
    if (!vehiculos.length) return null;
    return vehiculos.find((v) => v.id === inspectedVehiculoId) || vehiculos[0];
  }, [vehiculos, inspectedVehiculoId]);

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

  function openCreateModal() {
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
  }

  const openEditModal = (vehiculo: Vehiculo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const handleSelectVehiculo = (vehiculo: Vehiculo) => {
    setInspectedVehiculoId(vehiculo.id);
    setMobileInspectorOpen(true);
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
        onNotify(`Unidad ${cleanPatente} actualizada en el padrón.`, 'success');
      } else {
        const created = await createVehiculo(payload);
        setInspectedVehiculoId(created.id);
        onNotify(`Unidad ${cleanPatente} incorporada a la flota.`, 'success');
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

  const renderUnitInspector = (v: Vehiculo) => {
    const serviceBadge = formatServiceTypeLabel(v.tipo);
    const estadoBadge = formatEstadoVehiculoBadge(v.estado);
    const pisosCount = v.pisos || 2;
    const configuredSeats = v.layout_data
      ? countActiveSeatsInLayout(v.layout_data)
      : v.capacidad_asientos;

    // Preview floor 1 mini matrix
    const previewFloor1 =
      v.layout_data?.layout.find((p) => p.piso === 1) ||
      buildStandardFloor(1, pisosCount === 1 ? 6 : 3, '');

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/[0.07]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono-tabular uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                INSPECTOR TÉCNICO
              </span>
              <span className="text-xs font-mono-tabular font-semibold text-amber-400">
                {v.interno || 'INT-S/N'}
              </span>
            </div>
            <MercosurPlate patente={v.patente} size="md" />
          </div>

          <button
            type="button"
            onClick={() => setMobileInspectorOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/[0.05]"
            aria-label="Cerrar inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Technical Specs Summary */}
        <div className="p-3.5 rounded-xl bg-[#07090E] border border-white/[0.07] space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-mono-tabular uppercase text-[10px]">
              CARROCERÍA / CHASIS
            </span>
            <span className="text-slate-100 font-semibold text-right">
              {v.marca_modelo || 'Marcopolo Paradiso DD'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
            <span className="text-slate-500 font-mono-tabular uppercase text-[10px]">
              CLASE DE SERVICIO
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${serviceBadge.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${serviceBadge.dotClass}`} />
              {serviceBadge.label}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
            <span className="text-slate-500 font-mono-tabular uppercase text-[10px]">
              ESTADO DE TRÁFICO
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${estadoBadge.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${estadoBadge.dotClass}`} />
              {estadoBadge.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.05] font-mono-tabular">
            <div>
              <span className="text-[10px] text-slate-500 block">ARQUITECTURA</span>
              <span className="text-slate-200 font-semibold">
                {pisosCount === 2 ? 'Doble Piso (2P)' : 'Piso Simple (1P)'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">PLAZAS ACTIVAS</span>
              <span className="text-amber-400 font-bold">{configuredSeats} butacas</span>
            </div>
          </div>
        </div>

        {/* Live Miniature Seat Blueprint Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5 text-sky-400">
              <Cpu className="w-3.5 h-3.5" /> Previsualización de Cabina (Piso 1)
            </span>
            <span>{v.layout_configurado ? 'Plano Homologado' : 'Vista Estándar'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-blueprint-grid border border-sky-500/20">
            <div className="mx-auto max-w-[240px] bg-[#0B101B]/95 border border-slate-700/80 rounded-t-2xl rounded-b-xl p-3 space-y-1.5">
              {/* Mini Nose */}
              <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-white/[0.07] text-[9px] font-mono-tabular text-slate-500">
                <span>VOLANTE</span>
                <span className="text-amber-400">FRENTE</span>
                <span>ACCESO</span>
              </div>

              {previewFloor1.filas.slice(0, 5).map((f) => (
                <div key={f.fila} className="grid grid-cols-5 gap-1 items-center">
                  {[0, 1].map((cIdx) => {
                    const code = f.asientos[cIdx] || '';
                    return (
                      <div
                        key={cIdx}
                        className={`h-5 rounded text-[9px] font-mono-tabular font-bold flex items-center justify-center ${
                          code
                            ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                            : 'border border-dashed border-slate-800 text-slate-700'
                        }`}
                      >
                        {code || '·'}
                      </div>
                    );
                  })}
                  <div className="text-center text-[8px] font-mono-tabular text-slate-600">
                    F{f.fila}
                  </div>
                  {[2, 3].map((cIdx) => {
                    const code = f.asientos[cIdx] || '';
                    return (
                      <div
                        key={cIdx}
                        className={`h-5 rounded text-[9px] font-mono-tabular font-bold flex items-center justify-center ${
                          code
                            ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                            : 'border border-dashed border-slate-800 text-slate-700'
                        }`}
                      >
                        {code || '·'}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => onOpenLayoutEditor(v.id)}
            className="btn-tactile w-full py-2.5 px-4 rounded-xl bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.28)] cursor-pointer"
          >
            <Grid className="w-4 h-4 stroke-[2.2]" />
            <span>Abrir en Ingeniero de Chasis (Blueprint)</span>
          </button>

          <button
            type="button"
            onClick={(e) => openEditModal(v, e)}
            className="btn-tactile w-full py-2 px-4 rounded-xl bg-[#07090E] hover:bg-slate-800 border border-white/[0.1] text-slate-200 font-medium text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            <span>Editar Ficha Técnica y Estado</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-[#0D111A] border border-white/[0.07] rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-widest text-emerald-400">
            <Bus className="w-3.5 h-3.5" />
            <span>MÓDULO 02 · PARQUE MÓVIL MERCOSUR · EVE-9</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-display">
            Padrón de Flota e Inspector Técnico de Unidades
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Controlá el estado operativo de cada unidad, chapas patente Mercosur y distribución de butacas por nivel.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onRefresh()}
            disabled={loading}
            className="btn-tactile inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-white/[0.08] bg-[#07090E] hover:bg-[#131926] text-slate-300 text-xs font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="btn-tactile inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm shadow-[0_0_24px_rgba(245,158,11,0.28)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Registrar Unidad</span>
          </button>
        </div>
      </div>

      {/* 1px Border KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 bg-[#0D111A] border border-white/[0.07] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-white/[0.07]">
        <div className="p-4">
          <div className="flex items-center justify-between text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
            <span>Unidades Operativas</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-tabular text-slate-100">
              {kpis.operativos}
            </span>
            <span className="text-xs font-mono-tabular text-slate-500">
              / {kpis.totalFlota} en padrón
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Habilitadas para despacho inmediato</span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
            <span>En Taller / Mantenimiento</span>
            <Wrench className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-tabular text-orange-400">
              {kpis.enTaller}
            </span>
            <span className="text-xs font-mono-tabular text-slate-500">unidades en box</span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            Bloqueo preventivo de asignación
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
            <span>Plazas Totales Disponibles</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-tabular text-amber-400">
              {kpis.plazasTotalesDisponibles}
            </span>
            <span className="text-xs font-mono-tabular text-slate-500">butacas activas</span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            {kpis.layoutsConfigurados}/{kpis.totalFlota} unidades con plano homologado
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0D111A] border border-white/[0.07] rounded-xl p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por patente (AG 482 KM), interno o chasis..."
              aria-label="Buscar vehículo"
              className="w-full pl-9 pr-8 py-2 bg-[#07090E] border border-white/[0.08] rounded-lg text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/70"
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

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-amber-400" /> Servicio:
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
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-[#07090E] text-slate-400 border border-white/[0.07] hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400 mr-1">
              Semáforo de Estado:
            </span>
            {(
              [
                { id: 'ALL', label: 'Toda la flota' },
                { id: 'activo', label: 'Operativo' },
                { id: 'mantenimiento', label: 'En Taller' },
                { id: 'inactivo', label: 'Fuera de Servicio' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`btn-tactile px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-[#07090E] text-slate-400 border border-white/[0.07] hover:text-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono-tabular text-slate-400">
            Unidades visibles: <strong className="text-slate-100">{filteredVehiculos.length}</strong>
          </span>
        </div>
      </div>

      {/* SPLIT CANVAS: Fleet Cards Grid (7 cols) + Right Technical Inspector (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 xl:col-span-8">
          {filteredVehiculos.length === 0 ? (
            <div className="bg-[#0D111A] border border-white/[0.07] rounded-xl p-12 text-center space-y-2">
              <Bus className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-slate-200 font-medium text-sm">
                No se encontraron unidades con los filtros seleccionados
              </p>
              <p className="text-xs text-slate-500">
                Cambiá los filtros o registrá una nueva unidad en el padrón.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVehiculos.map((vehiculo) => {
                const serviceBadge = formatServiceTypeLabel(vehiculo.tipo);
                const estadoBadge = formatEstadoVehiculoBadge(vehiculo.estado);
                const pisosCount = vehiculo.pisos || 2;
                const configuredSeats = vehiculo.layout_data
                  ? countActiveSeatsInLayout(vehiculo.layout_data)
                  : vehiculo.capacidad_asientos;
                const isSelected = inspectedVehiculo?.id === vehiculo.id;

                return (
                  <div
                    key={vehiculo.id}
                    onClick={() => handleSelectVehiculo(vehiculo)}
                    className={`rounded-xl p-4 flex flex-col justify-between gap-4 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#131926] border-amber-500/50 shadow-[0_8px_30px_rgba(0,0,0,0.6)]'
                        : 'bg-[#0D111A] border-white/[0.07] hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <MercosurPlate patente={vehiculo.patente} size="md" />

                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${estadoBadge.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${estadoBadge.dotClass}`} />
                            {estadoBadge.label}
                          </span>
                          <span className="text-xs font-mono-tabular font-bold text-amber-400">
                            {vehiculo.interno || 'INT-S/N'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-100 truncate">
                            {vehiculo.marca_modelo || 'Unidad Larga Distancia'}
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 shrink-0 ${
                              isSelected ? 'text-amber-400' : 'text-slate-600'
                            }`}
                          />
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${serviceBadge.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${serviceBadge.dotClass}`} />
                            {serviceBadge.label}
                          </span>

                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-tabular bg-[#07090E] text-slate-300 border border-white/[0.07]">
                            <Layers className="w-3 h-3 text-amber-400" />
                            {pisosCount === 2 ? '2 Pisos (DD)' : '1 Piso'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Seat Capacity Visual Bar */}
                    <div className="p-2.5 rounded-lg bg-[#07090E] border border-white/[0.06] space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono-tabular">
                        <span className="text-slate-400">
                          Capacidad: <strong className="text-slate-100">{configuredSeats} pax</strong>
                        </span>
                        {vehiculo.layout_configurado ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Plano OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <Clock className="w-3 h-3" /> Sin plano
                          </span>
                        )}
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            vehiculo.layout_configurado ? 'bg-emerald-500' : 'bg-amber-500/60'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.round((configuredSeats / 50) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => openEditModal(vehiculo, e)}
                        className="btn-tactile inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-[#07090E] hover:bg-slate-800 text-xs font-medium text-slate-200 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenLayoutEditor(vehiculo.id);
                        }}
                        className="btn-tactile flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-semibold text-xs cursor-pointer"
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
        </div>

        {/* Right Technical Unit Inspector (Desktop Sticky Panel) */}
        <aside className="hidden lg:block lg:col-span-5 xl:col-span-4 bg-[#131926] border border-white/[0.09] rounded-xl p-5 sticky top-20 shadow-2xl">
          {inspectedVehiculo ? (
            renderUnitInspector(inspectedVehiculo)
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Seleccioná una unidad de la flota para inspeccionar su plano.
            </div>
          )}
        </aside>
      </div>

      {/* Mobile / iPhone Slide-Up Bottom Sheet Inspector */}
      {mobileInspectorOpen && inspectedVehiculo && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-modal-backdrop"
          onClick={() => setMobileInspectorOpen(false)}
        >
          <div
            className="bg-[#131926] border-t border-white/[0.14] rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto pb-safe-bottom animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-600 mx-auto mb-4" />
            {renderUnitInspector(inspectedVehiculo)}
          </div>
        </div>
      )}

      {/* Modal: Registrar / Editar Unidad */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-vehiculo-title"
        >
          <div className="w-full max-w-lg bg-[#131926] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden animate-modal-panel">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#07090E]/80">
              <div>
                <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-amber-400">
                  {editingVehiculo ? 'ACTUALIZACIÓN DE UNIDAD' : 'ALTA DE PARQUE MÓVIL'}
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]"
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

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#07090E] border border-white/[0.08]">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                    Chapa Mercosur Oficial
                  </span>
                  <p className="text-xs text-slate-400">República Argentina · RNPA / CNRT</p>
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
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/[0.1] text-sm font-mono-tabular uppercase text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/[0.1] text-sm font-mono-tabular text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
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
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/[0.1] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3 py-2.5 rounded-lg bg-[#07090E] border border-white/[0.1] text-sm text-slate-100 focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3 py-2.5 rounded-lg bg-[#07090E] border border-white/[0.1] text-sm font-mono-tabular text-slate-100 focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/[0.1] text-sm font-mono-tabular text-slate-100 focus:outline-none focus:border-amber-500"
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
                      { id: 'activo', label: 'Operativo' },
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
                          : 'bg-[#07090E] border-white/[0.08] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-tactile px-4 py-2 rounded-lg border border-white/[0.1] bg-[#07090E] hover:bg-slate-800 text-xs font-medium text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-tactile inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#F59E0B] hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer"
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
