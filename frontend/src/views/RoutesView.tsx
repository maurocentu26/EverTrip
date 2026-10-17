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
} from 'lucide-react';
import {
  Ruta,
  RutaInput,
  ApiError,
  createRuta,
  updateRuta,
  toggleRutaActiva,
} from '../services/api';
import { formatARS, formatARSDecimal, formatKm } from '../utils/formatters';

interface RoutesViewProps {
  rutas: Ruta[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'warning' | 'error') => void;
}

export const RoutesView: React.FC<RoutesViewProps> = ({
  rutas,
  loading,
  onRefresh,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrigen, setSelectedOrigen] = useState<string>('ALL');
  const [selectedDestino, setSelectedDestino] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVA' | 'INACTIVA'>('ALL');

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

  // Unique origin & destination cities for quick pill filters
  const origenesDisponibles = useMemo(() => {
    return Array.from(new Set(rutas.map((r) => r.origen))).sort();
  }, [rutas]);

  const destinosDisponibles = useMemo(() => {
    return Array.from(new Set(rutas.map((r) => r.destino))).sort();
  }, [rutas]);

  // Filtered routes
  const filteredRutas = useMemo(() => {
    return rutas.filter((r) => {
      if (selectedOrigen !== 'ALL' && r.origen !== selectedOrigen) return false;
      if (selectedDestino !== 'ALL' && r.destino !== selectedDestino) return false;
      if (statusFilter === 'ACTIVA' && !r.activa) return false;
      if (statusFilter === 'INACTIVA' && r.activa) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchOrigen = r.origen.toLowerCase().includes(q);
        const matchDestino = r.destino.toLowerCase().includes(q);
        const matchId = r.id.toLowerCase().includes(q);
        return matchOrigen || matchDestino || matchId;
      }
      return true;
    });
  }, [rutas, selectedOrigen, selectedDestino, statusFilter, searchQuery]);

  // KPIs computation
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

  // Live duplicate check inside modal before submitting
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

  const openCreateModal = () => {
    setEditingRuta(null);
    setFormOrigen('');
    setFormDestino('');
    setFormDistancia('');
    setFormPrecio('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ruta: Ruta) => {
    setEditingRuta(ruta);
    setFormOrigen(ruta.origen);
    setFormDestino(ruta.destino);
    setFormDistancia(String(ruta.distancia_km));
    setFormPrecio(String(ruta.precio_base));
    setFormError(null);
    setIsModalOpen(true);
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
        onNotify(`Tramo ${cleanOrigen} → ${cleanDestino} actualizado correctamente.`, 'success');
      } else {
        await createRuta(payload);
        onNotify(`Nueva ruta ${cleanOrigen} → ${cleanDestino} incorporada a la red.`, 'success');
      }
      await onRefresh();
      setIsModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError({ code: err.code, message: err.message });
      } else {
        setFormError({
          code: 'INTERNAL_ERROR',
          message: 'No se pudo procesar la solicitud. Verificá los datos e intentá nuevamente.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEstado = async (ruta: Ruta) => {
    try {
      setTogglingId(ruta.id);
      const nextState = !ruta.activa;
      await toggleRutaActiva(ruta.id, nextState);
      await onRefresh();
      onNotify(
        nextState
          ? `Ruta ${ruta.origen} → ${ruta.destino} reactivada para despacho.`
          : `Ruta ${ruta.origen} → ${ruta.destino} desactivada temporalmente.`,
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-[#0F1623]/90 border border-slate-800/80 rounded-xl p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-widest text-amber-400">
            <Compass className="w-3.5 h-3.5" />
            <span>Módulo 01 · Red Troncal Nacional · EVE-5</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 font-display">
            Gestión de Rutas y Corredores Tarifarios
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Administrá las trazas habilitadas por CNRT, kilometrajes oficiales y tarifas base de referencia por kilómetro recorrido.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onRefresh()}
            disabled={loading}
            className="btn-tactile inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-800 bg-slate-900/90 hover:bg-slate-800/80 text-slate-300 text-xs font-medium cursor-pointer"
            title="Sincronizar con servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Sincronizar</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="btn-tactile inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm shadow-[0_0_20px_rgba(245,158,11,0.28)] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Ruta</span>
          </button>
        </div>
      </div>

      {/* KPI Operational Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Rutas Activas
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <RouteIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-tabular text-slate-100">
              {kpis.rutasActivas}
            </span>
            <span className="text-xs font-mono-tabular text-slate-400">
              / {kpis.totalRutas} registradas
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Habilitadas para programación de viajes</span>
          </div>
        </div>

        <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Kilómetros de Red Activa
            </span>
            <span className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <MapPin className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-tabular text-slate-100">
              {formatKm(kpis.totalKmRed)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Extensión acumulada en corredores nacionales
          </div>
        </div>

        <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Tarifa Base Promedio
            </span>
            <span className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-tabular text-amber-300">
              {formatARS(kpis.tarifaPromedio)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Valor promedio por tramo troncal activo
          </div>
        </div>

        <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Yield / Precio Promedio x KM
            </span>
            <span className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-tabular text-slate-100">
              {formatARSDecimal(kpis.precioPorKmPromedio)}
            </span>
            <span className="text-xs font-mono-tabular text-slate-400">/ km</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Coeficiente tarifario ponderado de red
          </div>
        </div>
      </div>

      {/* Search & Quick Filters Console */}
      <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por terminal de origen, destino o código..."
              aria-label="Buscar ruta por ciudad de origen o destino"
              className="w-full pl-10 pr-9 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/70 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Origin Selector */}
          <div className="md:col-span-3">
            <select
              value={selectedOrigen}
              onChange={(e) => setSelectedOrigen(e.target.value)}
              aria-label="Filtrar por ciudad de origen"
              className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
            >
              <option value="ALL">Origen: Todas las terminales</option>
              {origenesDisponibles.map((ciudad) => (
                <option key={ciudad} value={ciudad}>
                  Desde: {ciudad}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Selector */}
          <div className="md:col-span-3">
            <select
              value={selectedDestino}
              onChange={(e) => setSelectedDestino(e.target.value)}
              aria-label="Filtrar por ciudad de destino"
              className="w-full px-3 py-2 bg-[#090D16] border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/70"
            >
              <option value="ALL">Destino: Todas las terminales</option>
              {destinosDisponibles.map((ciudad) => (
                <option key={ciudad} value={ciudad}>
                  Hacia: {ciudad}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button */}
          <div className="md:col-span-1 flex items-center justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full md:w-auto px-3 py-2 rounded-lg border border-slate-800 bg-[#090D16] hover:bg-slate-800/70 text-xs text-slate-300 font-medium cursor-pointer"
              title="Restablecer filtros"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Quick Status Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-400" /> Estado:
            </span>
            {(
              [
                { id: 'ALL', label: `Todas (${rutas.length})` },
                {
                  id: 'ACTIVA',
                  label: `Activas (${rutas.filter((r) => r.activa).length})`,
                },
                {
                  id: 'INACTIVA',
                  label: `Inactivas (${rutas.filter((r) => !r.activa).length})`,
                },
              ] as const
            ).map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                className={`btn-tactile px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                  statusFilter === pill.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-[#090D16] text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono-tabular text-slate-400">
            Mostrando <span className="text-slate-200 font-semibold">{filteredRutas.length}</span> de{' '}
            {rutas.length} corredores
          </div>
        </div>
      </div>

      {/* Routes Operational Table */}
      <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/90 bg-[#090D16]/70 text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Corredor / Visualización de Traza</th>
                <th className="py-3.5 px-4 text-right">Distancia</th>
                <th className="py-3.5 px-4 text-right">Tarifa Base (ARS)</th>
                <th className="py-3.5 px-4 text-right">Costo / KM</th>
                <th className="py-3.5 px-4 text-center">Estado Operativo</th>
                <th className="py-3.5 px-4 text-right">Acciones de Despacho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredRutas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <RouteIcon className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-slate-200 font-medium">
                        No se encontraron rutas con los filtros aplicados
                      </p>
                      <p className="text-xs text-slate-400">
                        Probá limpiar los criterios de búsqueda o registrá un nuevo corredor nacional.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRutas.map((ruta) => {
                  const costoPorKm =
                    ruta.distancia_km > 0 ? ruta.precio_base / ruta.distancia_km : 0;
                  const estHours = Math.max(1, Math.round((ruta.distancia_km / 78) * 10) / 10);

                  return (
                    <tr
                      key={ruta.id}
                      className={`group transition-colors ${
                        ruta.activa
                          ? 'hover:bg-slate-800/35'
                          : 'bg-[#090D16]/40 opacity-70 hover:opacity-95'
                      }`}
                    >
                      {/* Visual Trajectory Column */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            {/* Origin node */}
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  ruta.activa
                                    ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.65)]'
                                    : 'bg-slate-600'
                                }`}
                              />
                              <span className="font-semibold text-slate-100 tracking-tight">
                                {ruta.origen}
                              </span>
                            </div>

                            {/* Trajectory Graphic Connector: Origen ──[304 km]──► Destino */}
                            <div className="flex items-center gap-1 text-xs font-mono-tabular select-none">
                              <span className="w-5 sm:w-8 h-[1.5px] bg-gradient-to-r from-sky-400/60 to-amber-400/70" />
                              <span className="px-2 py-0.5 rounded-full bg-[#090D16] border border-slate-700/90 text-amber-300 text-[11px] font-medium">
                                {ruta.distancia_km} km
                              </span>
                              <span className="w-5 sm:w-8 h-[1.5px] bg-gradient-to-r from-amber-400/70 to-emerald-400/70" />
                              <ArrowRight className="w-3.5 h-3.5 text-emerald-400 -ml-1" />
                            </div>

                            {/* Destination node */}
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-100 tracking-tight">
                                {ruta.destino}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] font-mono-tabular text-slate-400">
                            <span>ID: {ruta.id.slice(0, 8).toUpperCase()}</span>
                            <span>•</span>
                            <span>Tiempo est. crucero: ~{estHours} h</span>
                          </div>
                        </div>
                      </td>

                      {/* Distance */}
                      <td className="py-4 px-4 text-right font-mono-tabular font-medium text-slate-200 whitespace-nowrap">
                        {formatKm(ruta.distancia_km)}
                      </td>

                      {/* Price ARS */}
                      <td className="py-4 px-4 text-right font-mono-tabular font-bold text-amber-300 whitespace-nowrap">
                        {formatARS(ruta.precio_base)}
                      </td>

                      {/* Cost per Km */}
                      <td className="py-4 px-4 text-right font-mono-tabular text-xs text-slate-300 whitespace-nowrap">
                        {formatARSDecimal(costoPorKm)} <span className="text-slate-400">/km</span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {ruta.activa ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/12 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            Inactiva
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(ruta)}
                            className="btn-tactile inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/80 bg-[#090D16] hover:bg-slate-800 text-xs font-medium text-slate-200 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            disabled={togglingId === ruta.id}
                            onClick={() => handleToggleEstado(ruta)}
                            className={`btn-tactile inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                              ruta.activa
                                ? 'border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300'
                                : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{ruta.activa ? 'Desactivar' : 'Reactivar'}</span>
                          </button>
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

      {/* Modal: Alta y Edición de Ruta con validación en vivo y 409 DUPLICATE_ROUTE */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-ruta-title"
        >
          <div className="w-full max-w-lg bg-[#0F1623] border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden animate-modal-panel">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#090D16]/60">
              <div>
                <span className="text-[11px] font-mono-tabular uppercase tracking-widest text-amber-400">
                  {editingRuta ? 'Edición de Corredor' : 'Alta de Corredor Nacional'}
                </span>
                <h2 id="modal-ruta-title" className="text-lg font-bold text-slate-100 font-display">
                  {editingRuta
                    ? `Modificar Ruta: ${editingRuta.origen} → ${editingRuta.destino}`
                    : 'Registrar Nueva Ruta Comercial'}
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

            <form onSubmit={handleSaveRuta} className="p-6 space-y-4">
              {/* Error Banner (including 409 DUPLICATE_ROUTE) */}
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

              {/* Live Duplicate Detection Warning before hitting submit */}
              {!formError && liveDuplicateWarning && (
                <div className="p-3 rounded-xl bg-amber-500/12 border border-amber-500/35 flex items-start gap-2.5 text-amber-200 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300">
                      Detección preventiva (409 DUPLICATE_ROUTE):
                    </span>{' '}
                    Ya existe una ruta registrada entre{' '}
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
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#090D16] border border-slate-700/90 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#090D16] border border-slate-700/90 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#090D16] border border-slate-700/90 text-sm font-mono-tabular text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#090D16] border border-slate-700/90 text-sm font-mono-tabular text-amber-300 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Live Trajectory Preview Box */}
              <div className="p-3.5 rounded-xl bg-[#090D16] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <Sparkles className="w-3.5 h-3.5" /> Vista Previa de Despacho
                  </span>
                  <span>
                    Yield:{' '}
                    <strong className="text-slate-200">
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

              {/* Modal Actions */}
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
