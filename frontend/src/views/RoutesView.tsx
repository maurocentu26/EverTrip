import React, { useMemo, useState } from 'react';
import {
  Route as RouteIcon,
  Plus,
  Search,
  MapPin,
  ArrowRight,
  Compass,
  DollarSign,
  Activity,
  Edit3,
  Power,
  AlertTriangle,
  CheckCircle2,
  X,
  Filter,
  Sparkles,
  RefreshCw,
  Clock,
  Bus,
  TrendingUp,
  ChevronRight,
  Gauge,
} from 'lucide-react';
import {
  Ruta,
  RutaInput,
  Vehiculo,
  ApiError,
  createRuta,
  updateRuta,
  toggleRutaActiva,
  formatPatenteMercosur,
} from '../services/api';
import { formatARS, formatARSDecimal, formatKm, formatServiceTypeLabel } from '../utils/formatters';

interface RoutesViewProps {
  rutas: Ruta[];
  vehiculos?: Vehiculo[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'warning' | 'error') => void;
  onOpenLayoutForVehicle?: (vehiculoId: string) => void;
  externalCreateTrigger?: number;
}

export const RoutesView: React.FC<RoutesViewProps> = ({
  rutas,
  vehiculos = [],
  loading,
  onRefresh,
  onNotify,
  onOpenLayoutForVehicle,
  externalCreateTrigger,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrigen, setSelectedOrigen] = useState<string>('ALL');
  const [selectedDestino, setSelectedDestino] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVA' | 'INACTIVA'>('ALL');

  // Split Inspector Selected Route State
  const [inspectedRutaId, setInspectedRutaId] = useState<string | null>(
    rutas[0]?.id || null
  );
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);

  // Modal state for Create / Edit Ruta
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuta, setEditingRuta] = useState<Ruta | null>(null);
  const [formOrigen, setFormOrigen] = useState('');
  const [formDestino, setFormDestino] = useState('');
  const [formDistancia, setFormDistancia] = useState('');
  const [formPrecio, setFormPrecio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<{ code?: string; message: string } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Open create modal when triggered from Command Palette
  React.useEffect(() => {
    if (externalCreateTrigger && externalCreateTrigger > 0) {
      openCreateModal();
    }
  }, [externalCreateTrigger]);

  // Keep inspectedRutaId valid
  const inspectedRuta = useMemo(() => {
    if (!rutas.length) return null;
    return rutas.find((r) => r.id === inspectedRutaId) || rutas[0];
  }, [rutas, inspectedRutaId]);

  const origenesDisponibles = useMemo(() => {
    return Array.from(new Set(rutas.map((r) => r.origen))).sort();
  }, [rutas]);

  const destinosDisponibles = useMemo(() => {
    return Array.from(new Set(rutas.map((r) => r.destino))).sort();
  }, [rutas]);

  const filteredRutas = useMemo(() => {
    return rutas.filter((r) => {
      if (selectedOrigen !== 'ALL' && r.origen !== selectedOrigen) return false;
      if (selectedDestino !== 'ALL' && r.destino !== selectedDestino) return false;
      if (statusFilter === 'ACTIVA' && !r.activa) return false;
      if (statusFilter === 'INACTIVA' && r.activa) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          r.origen.toLowerCase().includes(q) ||
          r.destino.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rutas, selectedOrigen, selectedDestino, statusFilter, searchQuery]);

  // KPIs computation (Stripe / Vercel 1px border ledger style)
  const kpis = useMemo(() => {
    const activas = rutas.filter((r) => r.activa);
    const totalKmRed = activas.reduce((acc, r) => acc + Number(r.distancia_km || 0), 0);
    const tarifaPromedio =
      activas.length > 0
        ? activas.reduce((acc, r) => acc + Number(r.precio_base || 0), 0) / activas.length
        : 0;
    const precioPorKmPromedio =
      totalKmRed > 0
        ? activas.reduce((acc, r) => acc + Number(r.precio_base || 0), 0) / totalKmRed
        : 0;

    return {
      totalRutas: rutas.length,
      rutasActivas: activas.length,
      totalKmRed,
      tarifaPromedio,
      precioPorKmPromedio,
    };
  }, [rutas]);

  const liveDuplicateWarning = useMemo(() => {
    const cleanO = formOrigen.trim().toLowerCase();
    const cleanD = formDestino.trim().toLowerCase();
    if (!cleanO || !cleanD) return null;
    return rutas.find(
      (r) =>
        r.id !== editingRuta?.id &&
        r.origen.trim().toLowerCase() === cleanO &&
        r.destino.trim().toLowerCase() === cleanD
    );
  }, [formOrigen, formDestino, rutas, editingRuta]);

  function openCreateModal() {
    setEditingRuta(null);
    setFormOrigen('');
    setFormDestino('');
    setFormDistancia('');
    setFormPrecio('');
    setFormError(null);
    setIsModalOpen(true);
  }

  const openEditModal = (ruta: Ruta, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingRuta(ruta);
    setFormOrigen(ruta.origen);
    setFormDestino(ruta.destino);
    setFormDistancia(String(ruta.distancia_km));
    setFormPrecio(String(ruta.precio_base));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSelectRutaForInspector = (ruta: Ruta) => {
    setInspectedRutaId(ruta.id);
    setMobileInspectorOpen(true);
  };

  const handleSaveRuta = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanOrigen = formOrigen.trim();
    const cleanDestino = formDestino.trim();
    const dist = Number(formDistancia);
    const precio = Number(formPrecio);

    if (!cleanOrigen || !cleanDestino) {
      setFormError({
        code: 'VALIDATION_ERROR',
        message: 'Debés especificar tanto la terminal de origen como la de destino.',
      });
      return;
    }

    if (cleanOrigen.toLowerCase() === cleanDestino.toLowerCase()) {
      setFormError({
        code: 'VALIDATION_ERROR',
        message: 'La terminal de origen y destino no pueden ser idénticas.',
      });
      return;
    }

    if (!Number.isFinite(dist) || dist <= 0) {
      setFormError({
        code: 'VALIDATION_ERROR',
        message: 'La distancia del corredor debe ser mayor a 0 kilómetros.',
      });
      return;
    }

    if (!Number.isFinite(precio) || precio <= 0) {
      setFormError({
        code: 'VALIDATION_ERROR',
        message: 'La tarifa base debe ser un importe válido en ARS mayor a $ 0.',
      });
      return;
    }

    const payload: RutaInput = {
      origen: cleanOrigen,
      destino: cleanDestino,
      distancia_km: dist,
      precio_base: precio,
    };

    try {
      setSubmitting(true);
      if (editingRuta) {
        await updateRuta(editingRuta.id, payload);
        onNotify(`Tramo ${cleanOrigen} → ${cleanDestino} actualizado.`, 'success');
      } else {
        const created = await createRuta(payload);
        setInspectedRutaId(created.id);
        onNotify(`Nueva ruta ${cleanOrigen} → ${cleanDestino} incorporada.`, 'success');
      }
      await onRefresh();
      setIsModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError({ code: err.code, message: err.message });
      } else {
        setFormError({
          code: 'INTERNAL_ERROR',
          message: 'No se pudo procesar la solicitud. Verificá los datos.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEstado = async (ruta: Ruta, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setTogglingId(ruta.id);
      const nextState = !ruta.activa;
      await toggleRutaActiva(ruta.id, nextState);
      await onRefresh();
      onNotify(
        nextState
          ? `Corredor ${ruta.origen} → ${ruta.destino} habilitado.`
          : `Corredor ${ruta.origen} → ${ruta.destino} pausado.`,
        nextState ? 'success' : 'warning'
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Error al cambiar el estado de la ruta.',
        'error'
      );
    } finally {
      setTogglingId(null);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedOrigen('ALL');
    setSelectedDestino('ALL');
    setStatusFilter('ALL');
  };

  const previewCostPerKm = useMemo(() => {
    const d = Number(formDistancia);
    const p = Number(formPrecio);
    if (d > 0 && p > 0) return p / d;
    return 0;
  }, [formDistancia, formPrecio]);

  // Suggested vehicles for the inspected route based on distance
  const suggestedVehiculos = useMemo(() => {
    if (!inspectedRuta) return [];
    const actives = vehiculos.filter((v) => v.estado === 'activo');
    if (inspectedRuta.distancia_km >= 550) {
      // Long haul: prefer cama_ejecutivo or suite_primera
      return actives.sort((a, b) =>
        a.tipo.includes('cama') || a.tipo.includes('suite') ? -1 : 1
      );
    }
    return actives;
  }, [inspectedRuta, vehiculos]);

  const renderInspectorContent = (ruta: Ruta) => {
    const yieldKm = ruta.distancia_km > 0 ? ruta.precio_base / ruta.distancia_km : 0;
    const avgYieldDiff =
      kpis.precioPorKmPromedio > 0
        ? ((yieldKm - kpis.precioPorKmPromedio) / kpis.precioPorKmPromedio) * 100
        : 0;
    const totalMinutes = Math.round((ruta.distancia_km / 78) * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const tarifaCamaEjecutivo = Math.round(ruta.precio_base * 1.25);
    const tarifaSuitePrimera = Math.round(ruta.precio_base * 1.45);

    return (
      <div className="space-y-5">
        {/* Inspector Header */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/[0.07]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono-tabular uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                INSPECTOR DE TRAZA
              </span>
              <span className="text-[11px] font-mono-tabular text-slate-500">
                #{ruta.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <h3 className="mt-2 text-base font-bold font-display text-slate-100 leading-snug">
              {ruta.origen} → {ruta.destino}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setMobileInspectorOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/[0.04]"
            aria-label="Cerrar inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Schematic Telemetry Visualizer */}
        <div className="p-4 rounded-xl bg-[#07090E] border border-white/[0.07] space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Gauge className="w-3.5 h-3.5" /> Telemetría del Corredor
            </span>
            <span>Crucero 78 km/h prom.</span>
          </div>

          {/* Graphic Node-to-Node Corridor */}
          <div className="py-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-100 mb-2">
              <span className="truncate max-w-[42%]">{ruta.origen}</span>
              <span className="truncate max-w-[42%] text-right">{ruta.destino}</span>
            </div>

            <div className="relative flex items-center justify-between">
              <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_#F59E0B] z-10" />
              <div className="flex-1 h-[2px] bg-gradient-to-r from-amber-500 via-sky-400 to-emerald-400 mx-1 relative flex items-center justify-center">
                <span className="px-2.5 py-0.5 rounded-full bg-[#0D111A] border border-amber-500/40 font-mono-tabular text-[11px] font-bold text-amber-300 shadow-md">
                  {ruta.distancia_km} KM · ~{hours}h {mins > 0 ? `${mins}m` : '00m'} est.
                </span>
              </div>
              <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#10B981] z-10" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.05] text-[11px] font-mono-tabular">
            <div>
              <span className="text-slate-500 block">YIELD DEL TRAMO</span>
              <span className="text-slate-100 font-semibold">
                {formatARSDecimal(yieldKm)}/km
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">VS MEDIA DE RED</span>
              <span
                className={`font-semibold ${
                  avgYieldDiff >= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {avgYieldDiff >= 0 ? '+' : ''}
                {avgYieldDiff.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Economic Tier Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Escala Tarifaria Proyectada (ARS)
            </span>
          </div>

          <div className="divide-y divide-white/[0.06] rounded-xl bg-[#07090E] border border-white/[0.07] overflow-hidden text-xs">
            <div className="p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">Base Semicama</div>
                <div className="text-[11px] text-slate-500">Tarifa troncal estándar (1.00x)</div>
              </div>
              <div className="text-right font-mono-tabular">
                <div className="font-bold text-amber-400 text-sm">
                  {formatARS(ruta.precio_base)}
                </div>
                <div className="text-[10px] text-slate-500">
                  {formatARSDecimal(yieldKm)} / km
                </div>
              </div>
            </div>

            <div className="p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sky-300">Cama Ejecutivo (+25%)</div>
                <div className="text-[11px] text-slate-500">Reclinación 160° · Servicio a bordo</div>
              </div>
              <div className="text-right font-mono-tabular">
                <div className="font-bold text-slate-100 text-sm">
                  {formatARS(tarifaCamaEjecutivo)}
                </div>
                <div className="text-[10px] text-slate-500">
                  {formatARSDecimal(tarifaCamaEjecutivo / ruta.distancia_km)} / km
                </div>
              </div>
            </div>

            <div className="p-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-amber-300">Suite Primera Clase (+45%)</div>
                <div className="text-[11px] text-slate-500">Butaca 180° Box Privado</div>
              </div>
              <div className="text-right font-mono-tabular">
                <div className="font-bold text-slate-100 text-sm">
                  {formatARS(tarifaSuitePrimera)}
                </div>
                <div className="text-[10px] text-slate-500">
                  {formatARSDecimal(tarifaSuitePrimera / ruta.distancia_km)} / km
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Suggested Fleet Units for this Corridor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1.5">
              <Bus className="w-3.5 h-3.5 text-emerald-400" />
              Unidades Sugeridas para Despacho
            </span>
            <span>{suggestedVehiculos.length} disp.</span>
          </div>

          <div className="space-y-1.5">
            {suggestedVehiculos.slice(0, 3).map((v) => {
              const badge = formatServiceTypeLabel(v.tipo);
              return (
                <div
                  key={v.id}
                  className="p-2.5 rounded-lg bg-[#07090E] border border-white/[0.06] flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-[#131926] border border-white/[0.1] font-mono-tabular font-bold text-slate-100 text-[11px]">
                      {formatPatenteMercosur(v.patente)}
                    </span>
                    <div className="truncate">
                      <span className="text-slate-300 font-medium">{v.interno || 'FLOTA'}</span>
                      <span className="text-slate-500 mx-1">·</span>
                      <span className="text-[11px] text-slate-400">{badge.shortLabel}</span>
                    </div>
                  </div>
                  {onOpenLayoutForVehicle && (
                    <button
                      type="button"
                      onClick={() => onOpenLayoutForVehicle(v.id)}
                      className="text-[11px] font-mono-tabular text-amber-400 hover:text-amber-300 shrink-0 cursor-pointer"
                    >
                      Plano ({v.capacidad_asientos}p) →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Inspector Actions */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={(e) => openEditModal(ruta, e)}
            className="btn-tactile py-2.5 px-3 rounded-lg bg-[#131926] hover:bg-slate-800 border border-white/[0.1] text-xs font-semibold text-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Editar Traza</span>
          </button>

          <button
            type="button"
            disabled={togglingId === ruta.id}
            onClick={(e) => handleToggleEstado(ruta, e)}
            className={`btn-tactile py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
              ruta.activa
                ? 'border-orange-500/35 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300'
                : 'border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{ruta.activa ? 'Desactivar' : 'Reactivar'}</span>
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
          <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-widest text-amber-400">
            <Compass className="w-3.5 h-3.5" />
            <span>MÓDULO 01 · RED TRONCAL & TARIFARIO · EVE-5</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-display">
            Catálogo de Rutas y Telemetría de Corredores
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Seleccioná cualquier corredor para inspeccionar su escala tarifaria proyectada, rendimiento por kilómetro (`$/km`) y unidades sugeridas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onRefresh()}
            disabled={loading}
            className="btn-tactile inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-white/[0.08] bg-[#07090E] hover:bg-[#131926] text-slate-300 text-xs font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Sincronizar</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="btn-tactile inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm shadow-[0_0_24px_rgba(245,158,11,0.28)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Ruta</span>
          </button>
        </div>
      </div>

      {/* Stripe / Vercel Precision 1px Border KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-[#0D111A] border border-white/[0.07] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-white/[0.07]">
        <div className="p-4">
          <div className="flex items-center justify-between text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
            <span>Rutas Operativas</span>
            <RouteIcon className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-tabular text-slate-100">
              {kpis.rutasActivas}
            </span>
            <span className="text-xs font-mono-tabular text-slate-500">
              / {kpis.totalRutas} totales
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Despacho CNRT activo</span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
            <span>Extensión de Red</span>
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-tabular text-slate-100">
              {formatKm(kpis.totalKmRed)}
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            Kilometraje troncal habilitado
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
            <span>Tarifa Base Media</span>
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-tabular text-amber-400">
              {formatARS(kpis.tarifaPromedio)}
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            Promedio ponderado en ARS
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
            <span>Yield Promedio Red</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono-tabular text-slate-100">
              {formatARSDecimal(kpis.precioPorKmPromedio)}
            </span>
            <span className="text-xs font-mono-tabular text-slate-500">/ km</span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            Coeficiente tarifario federal
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0D111A] border border-white/[0.07] rounded-xl p-3.5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por terminal de origen, destino o ID..."
              aria-label="Buscar ruta"
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

          <div className="md:col-span-3">
            <select
              value={selectedOrigen}
              onChange={(e) => setSelectedOrigen(e.target.value)}
              aria-label="Filtrar por ciudad de origen"
              className="w-full px-3 py-2 bg-[#07090E] border border-white/[0.08] rounded-lg text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
            >
              <option value="ALL">Origen: Todas las terminales</option>
              {origenesDisponibles.map((ciudad) => (
                <option key={ciudad} value={ciudad}>
                  Desde: {ciudad}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedDestino}
              onChange={(e) => setSelectedDestino(e.target.value)}
              aria-label="Filtrar por ciudad de destino"
              className="w-full px-3 py-2 bg-[#07090E] border border-white/[0.08] rounded-lg text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
            >
              <option value="ALL">Destino: Todas las terminales</option>
              {destinosDisponibles.map((ciudad) => (
                <option key={ciudad} value={ciudad}>
                  Hacia: {ciudad}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1 flex items-center justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full md:w-auto px-3 py-2 rounded-lg border border-white/[0.08] bg-[#07090E] hover:bg-[#131926] text-xs text-slate-300 font-medium cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-400" /> Estado:
            </span>
            {(
              [
                { id: 'ALL', label: `Todas (${rutas.length})` },
                { id: 'ACTIVA', label: `Activas (${rutas.filter((r) => r.activa).length})` },
                { id: 'INACTIVA', label: `Pausadas (${rutas.filter((r) => !r.activa).length})` },
              ] as const
            ).map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                className={`btn-tactile px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  statusFilter === pill.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-[#07090E] text-slate-400 border border-white/[0.07] hover:text-slate-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono-tabular text-slate-400">
            Mostrando <span className="text-slate-100 font-semibold">{filteredRutas.length}</span> de{' '}
            {rutas.length} corredores
          </div>
        </div>
      </div>

      {/* SPLIT CANVAS: Left Table/Cards (7 cols) + Right Contextual Route Inspector (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Ledger */}
        <div className="lg:col-span-7 xl:col-span-8 bg-[#0D111A] border border-white/[0.07] rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.07] bg-[#07090E] text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Corredor / Traza Nacional</th>
                  <th className="py-3 px-3 text-right">Tarifa Base</th>
                  <th className="py-3 px-3 text-right hidden sm:table-cell">Yield $/KM</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-sm">
                {filteredRutas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 px-4 text-center">
                      <div className="max-w-sm mx-auto space-y-2">
                        <RouteIcon className="w-7 h-7 text-slate-500 mx-auto" />
                        <p className="text-slate-200 font-medium text-sm">
                          Sin corredores para el filtro activo
                        </p>
                        <p className="text-xs text-slate-500">
                          Restablecé la búsqueda o creá una nueva ruta comercial.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRutas.map((ruta) => {
                    const costoPorKm =
                      ruta.distancia_km > 0 ? ruta.precio_base / ruta.distancia_km : 0;
                    const estHours = Math.max(1, Math.round((ruta.distancia_km / 78) * 10) / 10);
                    const isSelected = inspectedRuta?.id === ruta.id;

                    return (
                      <tr
                        key={ruta.id}
                        onClick={() => handleSelectRutaForInspector(ruta)}
                        className={`group transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/[0.08]'
                            : ruta.activa
                            ? 'hover:bg-white/[0.03]'
                            : 'bg-[#07090E]/60 opacity-65 hover:opacity-95'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isSelected
                                    ? 'bg-amber-400 shadow-[0_0_8px_#F59E0B]'
                                    : ruta.activa
                                    ? 'bg-emerald-400'
                                    : 'bg-slate-600'
                                }`}
                              />
                              <span className="font-semibold text-slate-100 text-xs sm:text-sm">
                                {ruta.origen}
                              </span>

                              <span className="inline-flex items-center gap-1 font-mono-tabular text-[11px] text-amber-400">
                                <span>──[{ruta.distancia_km} km]──►</span>
                              </span>

                              <span className="font-semibold text-slate-100 text-xs sm:text-sm">
                                {ruta.destino}
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5 text-[11px] font-mono-tabular text-slate-500 pl-4">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" /> ~{estHours}h
                              </span>
                              <span>·</span>
                              <span>ID {ruta.id.slice(0, 6).toUpperCase()}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono-tabular font-bold text-amber-400 whitespace-nowrap text-xs sm:text-sm">
                          {formatARS(ruta.precio_base)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono-tabular text-xs text-slate-300 whitespace-nowrap hidden sm:table-cell">
                          {formatARSDecimal(costoPorKm)}
                        </td>

                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {ruta.activa ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/12 text-emerald-300 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Activa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-400 border border-white/[0.08]">
                              Pausada
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => openEditModal(ruta, e)}
                              className="btn-tactile p-1.5 rounded-lg border border-white/[0.08] bg-[#07090E] hover:bg-[#131926] text-slate-300 cursor-pointer"
                              title="Editar ruta"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            </button>
                            <button
                              type="button"
                              disabled={togglingId === ruta.id}
                              onClick={(e) => handleToggleEstado(ruta, e)}
                              className={`btn-tactile p-1.5 rounded-lg border cursor-pointer ${
                                ruta.activa
                                  ? 'border-orange-500/30 bg-orange-500/10 text-orange-300'
                                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              }`}
                              title={ruta.activa ? 'Desactivar ruta' : 'Reactivar ruta'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <ChevronRight
                              className={`w-4 h-4 transition-transform ${
                                isSelected ? 'text-amber-400 translate-x-0.5' : 'text-slate-600'
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Contextual Inspector (Desktop Sticky Panel) */}
        <aside className="hidden lg:block lg:col-span-5 xl:col-span-4 bg-[#131926] border border-white/[0.09] rounded-xl p-5 sticky top-20 shadow-2xl">
          {inspectedRuta ? (
            renderInspectorContent(inspectedRuta)
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Seleccioná una ruta de la tabla para abrir su telemetría.
            </div>
          )}
        </aside>
      </div>

      {/* Mobile / iPhone Slide-Up Bottom Sheet Inspector */}
      {mobileInspectorOpen && inspectedRuta && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-modal-backdrop"
          onClick={() => setMobileInspectorOpen(false)}
        >
          <div
            className="bg-[#131926] border-t border-white/[0.14] rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto pb-safe-bottom animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-600 mx-auto mb-4" />
            {renderInspectorContent(inspectedRuta)}
          </div>
        </div>
      )}

      {/* Modal: Alta y Edición de Ruta con validación en vivo y 409 DUPLICATE_ROUTE */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-ruta-title"
        >
          <div className="w-full max-w-lg bg-[#131926] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden animate-modal-panel">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#07090E]/80">
              <div>
                <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-amber-400">
                  {editingRuta ? 'EDICIÓN DE CORREDOR' : 'ALTA DE CORREDOR NACIONAL'}
                </span>
                <h2 id="modal-ruta-title" className="text-lg font-bold text-slate-100 font-display">
                  {editingRuta
                    ? `${editingRuta.origen} → ${editingRuta.destino}`
                    : 'Registrar Nueva Ruta Comercial'}
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

            <form onSubmit={handleSaveRuta} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/12 border border-rose-500/40 flex items-start gap-3 text-rose-200 text-xs">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-mono-tabular font-semibold uppercase tracking-wider text-rose-300">
                      {formError.code === 'DUPLICATE_ROUTE'
                        ? 'HTTP 409 · DUPLICATE_ROUTE (Ruta Duplicada)'
                        : `Código: ${formError.code || 'VALIDATION_ERROR'}`}
                    </div>
                    <p className="text-rose-100/90 leading-relaxed">{formError.message}</p>
                  </div>
                </div>
              )}

              {!formError && liveDuplicateWarning && (
                <div className="p-3 rounded-xl bg-amber-500/12 border border-amber-500/35 flex items-start gap-2.5 text-amber-200 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300">
                      Detección preventiva (409 DUPLICATE_ROUTE):
                    </span>{' '}
                    Ya existe una ruta activa o inactiva entre{' '}
                    <strong className="font-mono-tabular">{liveDuplicateWarning.origen}</strong> y{' '}
                    <strong className="font-mono-tabular">{liveDuplicateWarning.destino}</strong>.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="ruta-origen"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Ciudad / Terminal de Origen *
                  </label>
                  <input
                    id="ruta-origen"
                    type="text"
                    required
                    value={formOrigen}
                    onChange={(e) => {
                      setFormOrigen(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="Ej: Buenos Aires (Retiro)"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/[0.1] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ruta-destino"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Ciudad / Terminal de Destino *
                  </label>
                  <input
                    id="ruta-destino"
                    type="text"
                    required
                    value={formDestino}
                    onChange={(e) => {
                      setFormDestino(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="Ej: San Carlos de Bariloche"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/[0.1] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="ruta-distancia"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Distancia Oficial (KM) *
                  </label>
                  <input
                    id="ruta-distancia"
                    type="number"
                    min={1}
                    max={5000}
                    required
                    value={formDistancia}
                    onChange={(e) => setFormDistancia(e.target.value)}
                    placeholder="Ej: 404"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/[0.1] text-sm font-mono-tabular text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ruta-precio"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Tarifa Base (ARS $) *
                  </label>
                  <input
                    id="ruta-precio"
                    type="number"
                    min={100}
                    step="100"
                    required
                    value={formPrecio}
                    onChange={(e) => setFormPrecio(e.target.value)}
                    placeholder="Ej: 34800"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#07090E] border border-white/[0.1] text-sm font-mono-tabular text-amber-400 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#07090E] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Sparkles className="w-3.5 h-3.5" /> Telemetría Previa
                  </span>
                  <span>
                    Yield:{' '}
                    <strong className="text-slate-100">
                      {formatARSDecimal(previewCostPerKm)}/km
                    </strong>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-200 pt-1">
                  <span className="truncate">{formOrigen.trim() || 'Terminal Origen'}</span>
                  <span className="font-mono-tabular text-amber-400 shrink-0">
                    ──[{Number(formDistancia) || 0} km]──►
                  </span>
                  <span className="truncate text-right">
                    {formDestino.trim() || 'Terminal Destino'}
                  </span>
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
                      : editingRuta
                      ? 'Guardar Cambios'
                      : 'Confirmar y Crear Ruta'}
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
