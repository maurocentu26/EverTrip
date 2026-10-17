import React, { useEffect, useMemo, useState } from 'react';
import {
  Grid,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  RotateCcw,
  Edit2,
  Disc,
  ArrowUpRight,
  Info,
  Armchair,
  Code2,
} from 'lucide-react';
import {
  Vehiculo,
  VehiculoLayoutPayload,
  PisoLayout,
  LAYOUT_TEMPLATES,
  buildStandardFloor,
  countActiveSeatsInLayout,
  saveVehiculoLayout,
  formatPatenteMercosur,
} from '../services/api';
import { MercosurPlate } from '../components/MercosurPlate';
import { formatServiceTypeLabel } from '../utils/formatters';

interface LayoutEditorViewProps {
  vehiculos: Vehiculo[];
  selectedVehiculoId: string | null;
  onSelectVehiculo: (id: string) => void;
  onRefresh: () => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'warning' | 'error') => void;
}

const COLUMN_LETTERS = ['A', 'B', 'C', 'D'] as const;

function ensureFourSlots(asientos: string[], filaNum: number, piso: 1 | 2): string[] {
  const prefix = piso === 2 ? 'P' : '';
  if (asientos.length === 4) return [...asientos];
  // Reconstruct 4-slot matrix if loaded from condensed API array
  const result = ['', '', '', ''];
  asientos.forEach((code, idx) => {
    const upper = code.toUpperCase();
    if (upper.endsWith('A')) result[0] = code;
    else if (upper.endsWith('B')) result[1] = code;
    else if (upper.endsWith('C')) result[2] = code;
    else if (upper.endsWith('D')) result[3] = code;
    else if (idx < 4) result[idx] = code || `${prefix}${filaNum}${COLUMN_LETTERS[idx]}`;
  });
  return result;
}

export const LayoutEditorView: React.FC<LayoutEditorViewProps> = ({
  vehiculos,
  selectedVehiculoId,
  onSelectVehiculo,
  onRefresh,
  onNotify,
}) => {
  const activeVehiculo = useMemo(() => {
    if (vehiculos.length === 0) return null;
    return (
      vehiculos.find((v) => v.id === selectedVehiculoId) ||
      vehiculos[0]
    );
  }, [vehiculos, selectedVehiculoId]);

  const [pisosCount, setPisosCount] = useState<1 | 2>(2);
  const [activeFloorTab, setActiveFloorTab] = useState<1 | 2>(1);
  const [floors, setFloors] = useState<Record<1 | 2, PisoLayout>>({
    1: buildStandardFloor(1, 3, ''),
    2: buildStandardFloor(2, 8, 'P'),
  });

  // Inline label editing state
  const [editingCell, setEditingCell] = useState<{
    piso: 1 | 2;
    filaIndex: number;
    colIndex: number;
  } | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState('');

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // Sync layout state whenever selected vehicle changes
  useEffect(() => {
    if (!activeVehiculo) return;
    setEditingCell(null);
    setJustSaved(false);

    if (activeVehiculo.layout_data && activeVehiculo.layout_data.layout.length > 0) {
      const pCount = activeVehiculo.layout_data.pisos === 1 ? 1 : 2;
      setPisosCount(pCount);
      setActiveFloorTab(1);

      const f1Raw = activeVehiculo.layout_data.layout.find((l) => l.piso === 1);
      const f2Raw = activeVehiculo.layout_data.layout.find((l) => l.piso === 2);

      const f1: PisoLayout = f1Raw
        ? {
            piso: 1,
            filas: f1Raw.filas.map((f) => ({
              fila: f.fila,
              asientos: ensureFourSlots(f.asientos, f.fila, 1),
            })),
          }
        : buildStandardFloor(1, 3, '');

      const f2: PisoLayout = f2Raw
        ? {
            piso: 2,
            filas: f2Raw.filas.map((f) => ({
              fila: f.fila,
              asientos: ensureFourSlots(f.asientos, f.fila, 2),
            })),
          }
        : buildStandardFloor(2, 8, 'P');

      setFloors({ 1: f1, 2: f2 });
    } else {
      // Default template based on vehicle service or floor count
      const defaultPisos = activeVehiculo.pisos === 1 ? 1 : 2;
      setPisosCount(defaultPisos);
      setActiveFloorTab(1);
      if (defaultPisos === 1) {
        setFloors({
          1: buildStandardFloor(1, 9, ''),
          2: buildStandardFloor(2, 6, 'P'),
        });
      } else {
        setFloors({
          1: buildStandardFloor(1, 3, ''),
          2: buildStandardFloor(2, 8, 'P'),
        });
      }
    }
  }, [activeVehiculo?.id]);

  // Build current payload for API & live counters
  const currentPayload: VehiculoLayoutPayload = useMemo(() => {
    const layoutList: PisoLayout[] = [floors[1]];
    if (pisosCount === 2) {
      layoutList.push(floors[2]);
    }
    return {
      pisos: pisosCount,
      layout: layoutList,
    };
  }, [pisosCount, floors]);

  const totalSeatsAssigned = useMemo(
    () => countActiveSeatsInLayout(currentPayload),
    [currentPayload]
  );

  const floor1Seats = useMemo(
    () =>
      floors[1].filas.reduce(
        (acc, f) => acc + f.asientos.filter((s) => s.trim() !== '').length,
        0
      ),
    [floors]
  );

  const floor2Seats = useMemo(
    () =>
      pisosCount === 2
        ? floors[2].filas.reduce(
            (acc, f) => acc + f.asientos.filter((s) => s.trim() !== '').length,
            0
          )
        : 0,
    [floors, pisosCount]
  );

  const handleSwitchPisosCount = (nextPisos: 1 | 2) => {
    setPisosCount(nextPisos);
    if (nextPisos === 1 && activeFloorTab === 2) {
      setActiveFloorTab(1);
    }
    setJustSaved(false);
  };

  const handleApplyTemplate = (templateKey: string) => {
    const tpl = LAYOUT_TEMPLATES[templateKey];
    if (!tpl) return;
    const built = tpl.build();
    setPisosCount(built.pisos);
    setActiveFloorTab(1);
    const f1 = built.layout.find((p) => p.piso === 1) || buildStandardFloor(1, 3, '');
    const f2 = built.layout.find((p) => p.piso === 2) || buildStandardFloor(2, 8, 'P');
    setFloors({ 1: f1, 2: f2 });
    setEditingCell(null);
    setJustSaved(false);
    onNotify(`Plantilla "${tpl.nombre}" aplicada al plano activo.`, 'success');
  };

  // Toggle seat active vs empty aisle space
  const handleToggleSeat = (piso: 1 | 2, filaIndex: number, colIndex: number) => {
    setJustSaved(false);
    setFloors((prev) => {
      const targetFloor = prev[piso];
      const nextFilas = targetFloor.filas.map((filaObj, rIdx) => {
        if (rIdx !== filaIndex) return filaObj;
        const currentCode = filaObj.asientos[colIndex] || '';
        const prefix = piso === 2 ? 'P' : '';
        const defaultCode = `${prefix}${filaObj.fila}${COLUMN_LETTERS[colIndex]}`;
        const nextAsientos = [...filaObj.asientos];
        nextAsientos[colIndex] = currentCode.trim() !== '' ? '' : defaultCode;
        return { ...filaObj, asientos: nextAsientos };
      });
      return {
        ...prev,
        [piso]: { ...targetFloor, filas: nextFilas },
      };
    });
  };

  const handleStartEditLabel = (
    e: React.MouseEvent,
    piso: 1 | 2,
    filaIndex: number,
    colIndex: number,
    currentLabel: string
  ) => {
    e.stopPropagation();
    setEditingCell({ piso, filaIndex, colIndex });
    setEditingLabelValue(currentLabel);
  };

  const handleCommitEditLabel = () => {
    if (!editingCell) return;
    const { piso, filaIndex, colIndex } = editingCell;
    const clean = editingLabelValue.trim().toUpperCase();
    setFloors((prev) => {
      const targetFloor = prev[piso];
      const nextFilas = targetFloor.filas.map((f, idx) => {
        if (idx !== filaIndex) return f;
        const nextAsientos = [...f.asientos];
        nextAsientos[colIndex] = clean;
        return { ...f, asientos: nextAsientos };
      });
      return { ...prev, [piso]: { ...targetFloor, filas: nextFilas } };
    });
    setEditingCell(null);
    setJustSaved(false);
  };

  const handleAddRow = (piso: 1 | 2) => {
    setJustSaved(false);
    setFloors((prev) => {
      const currentFilas = prev[piso].filas;
      if (currentFilas.length >= 16) return prev;
      const nextFilaNum = currentFilas.length + 1;
      const prefix = piso === 2 ? 'P' : '';
      const newRow = {
        fila: nextFilaNum,
        asientos: [
          `${prefix}${nextFilaNum}A`,
          `${prefix}${nextFilaNum}B`,
          `${prefix}${nextFilaNum}C`,
          `${prefix}${nextFilaNum}D`,
        ],
      };
      return {
        ...prev,
        [piso]: {
          ...prev[piso],
          filas: [...currentFilas, newRow],
        },
      };
    });
  };

  const handleRemoveLastRow = (piso: 1 | 2) => {
    setJustSaved(false);
    setFloors((prev) => {
      const currentFilas = prev[piso].filas;
      if (currentFilas.length <= 1) return prev;
      return {
        ...prev,
        [piso]: {
          ...prev[piso],
          filas: currentFilas.slice(0, -1),
        },
      };
    });
  };

  const handleAutoRenumberFloor = (piso: 1 | 2) => {
    setJustSaved(false);
    const prefix = piso === 2 ? 'P' : '';
    setFloors((prev) => {
      const nextFilas = prev[piso].filas.map((f, idx) => {
        const filaNum = idx + 1;
        return {
          fila: filaNum,
          asientos: f.asientos.map((code, colIdx) =>
            code.trim() === '' ? '' : `${prefix}${filaNum}${COLUMN_LETTERS[colIdx]}`
          ),
        };
      });
      return {
        ...prev,
        [piso]: { ...prev[piso], filas: nextFilas },
      };
    });
    onNotify(`Nomenclatura recalculada automáticamente en Piso ${piso}.`, 'success');
  };

  const handleSaveDistribution = async () => {
    if (!activeVehiculo) return;
    if (totalSeatsAssigned === 0) {
      onNotify('El vehículo debe contar con al menos 1 butaca habilitada.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const res = await saveVehiculoLayout(activeVehiculo.id, currentPayload);
      await onRefresh();
      setJustSaved(true);
      onNotify(
        `Distribución guardada en ${formatPatenteMercosur(
          activeVehiculo.patente
        )} (${res.total_asientos} butacas activas).`,
        'success'
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Error al guardar el mapa de asientos.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const currentFloorData = floors[activeFloorTab];
  const serviceBadge = activeVehiculo
    ? formatServiceTypeLabel(activeVehiculo.tipo)
    : formatServiceTypeLabel('semicama');

  return (
    <div className="space-y-6">
      {/* Top Designer Control Bar */}
      <div className="bg-[#0F1623]/95 border border-slate-800/80 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-widest text-emerald-400">
              <Grid className="w-3.5 h-3.5" />
              <span>Módulo 03 · Ingeniería de Cabina y Planos · EVE-13</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 font-display">
              Editor Interactivo de Layout y Mapa de Asientos
            </h1>
            <p className="text-sm text-slate-400">
              Diseñá la matriz física de butacas por piso, pasillos de circulación y códigos alfanuméricos para venta de pasajes.
            </p>
          </div>

          {/* Vehicle Selector + Primary Save CTA */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#090D16] border border-slate-800 rounded-xl px-3 py-2">
              <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400">
                Unidad:
              </span>
              <select
                value={activeVehiculo?.id || ''}
                onChange={(e) => onSelectVehiculo(e.target.value)}
                aria-label="Seleccionar vehículo de la flota"
                className="bg-transparent text-sm font-mono-tabular font-semibold text-slate-100 focus:outline-none cursor-pointer pr-2"
              >
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#090D16] text-slate-100">
                    {formatPatenteMercosur(v.patente)} · {v.interno || 'FLOTA'} ({v.capacidad_asientos} pax)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSaveDistribution}
              disabled={saving || !activeVehiculo}
              className={`btn-tactile inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer shadow-lg ${
                justSaved
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
              }`}
            >
              {justSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Distribución Guardada</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 stroke-[2.2]" />
                  <span>{saving ? 'Guardando Layout...' : 'Guardar Distribución'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selected Vehicle Summary Strip */}
        {activeVehiculo && (
          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <MercosurPlate patente={activeVehiculo.patente} size="sm" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">
                    {activeVehiculo.marca_modelo || 'Chasis Larga Distancia'}
                  </span>
                  <span className="text-xs font-mono-tabular px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {activeVehiculo.interno || 'INT-100'}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${serviceBadge.badgeClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${serviceBadge.dotClass}`} />
                    {serviceBadge.label}
                  </span>
                  <span className="text-xs text-slate-400">
                    Endpoint:{' '}
                    <code className="font-mono-tabular text-sky-400">
                      POST /v1/vehiculos/{activeVehiculo.id}/layout
                    </code>
                  </span>
                </div>
              </div>
            </div>

            {/* Real-time Seat Counter Badges */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3.5 py-2 rounded-lg bg-[#090D16] border border-slate-800 flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                    Planta Baja (P1)
                  </div>
                  <div className="text-sm font-bold font-mono-tabular text-slate-200">
                    {floor1Seats} butacas
                  </div>
                </div>
                {pisosCount === 2 && (
                  <>
                    <div className="h-6 w-[1px] bg-slate-800" />
                    <div className="text-right">
                      <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                        Planta Alta (P2)
                      </div>
                      <div className="text-sm font-bold font-mono-tabular text-slate-200">
                        {floor2Seats} butacas
                      </div>
                    </div>
                  </>
                )}
                <div className="h-6 w-[1px] bg-slate-800" />
                <div className="text-right">
                  <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-amber-400">
                    Total Asignadas
                  </div>
                  <div className="text-lg font-extrabold font-mono-tabular text-amber-300 leading-none">
                    {totalSeatsAssigned} plazas
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace Grid: Left Templates & Controls (4 cols) + Right Coach Blueprint (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Floor Architecture + 1-Click Templates + Row Tools */}
        <div className="lg:col-span-4 space-y-5">
          {/* 1. Floor Configuration Switcher */}
          <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-tabular uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                Configuración de Niveles
              </span>
              <span className="text-[11px] font-mono-tabular text-slate-400">
                {pisosCount === 2 ? 'Doble Piso (DD)' : 'Piso Único'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSwitchPisosCount(1)}
                className={`btn-tactile py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                  pisosCount === 1
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                    : 'bg-[#090D16] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>1 Piso (Simple)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPisosCount(2)}
                className={`btn-tactile py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                  pisosCount === 2
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                    : 'bg-[#090D16] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>2 Pisos (Doble Piso)</span>
              </button>
            </div>
          </div>

          {/* 2. Quick 1-Click Templates */}
          <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-tabular uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Plantillas Rápidas (1 Clic)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Precargá una distribución homologada de larga distancia y ajustá butacas individuales a medida.
            </p>

            <div className="space-y-2.5">
              {Object.values(LAYOUT_TEMPLATES).map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl.id)}
                  className="btn-tactile w-full text-left p-3 rounded-xl bg-[#090D16] hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                      {tpl.nombre}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 leading-snug">{tpl.subtitulo}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-mono-tabular text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800/90 text-amber-300">
                      {tpl.butacas} butacas
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800/90 text-sky-300">
                      {tpl.pisos} {tpl.pisos === 2 ? 'Pisos' : 'Piso'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Active Floor Row Controls */}
          <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-tabular uppercase tracking-wider text-slate-300">
                Herramientas · Piso {activeFloorTab}
              </span>
              <span className="text-xs font-mono-tabular text-sky-400 font-semibold">
                {currentFloorData.filas.length} filas
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAddRow(activeFloorTab)}
                className="btn-tactile inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Fila</span>
              </button>

              <button
                type="button"
                onClick={() => handleRemoveLastRow(activeFloorTab)}
                disabled={currentFloorData.filas.length <= 1}
                className="btn-tactile inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-500/12 hover:bg-rose-500/20 disabled:opacity-40 border border-rose-500/30 text-rose-300 text-xs font-medium cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Quitar Fila</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleAutoRenumberFloor(activeFloorTab)}
              className="btn-tactile w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#090D16] hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              <span>Autonumerar Etiquetas del Piso {activeFloorTab}</span>
            </button>

            <div className="p-3 rounded-lg bg-[#090D16]/90 border border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Controles del Plano Blueprint</span>
              </div>
              <p>• Clic en una celda para alternar entre Butaca Activa y Pasillo / Espacio Vacío.</p>
              <p>
                • Clic en el ícono <Edit2 className="w-3 h-3 inline text-sky-400" /> de cualquier
                butaca para personalizar su código (`1A`, `P1B`, `VIP1`).
              </p>
            </div>

            {/* Toggle API Payload Inspector */}
            <button
              type="button"
              onClick={() => setShowJsonPreview((s) => !s)}
              className="btn-tactile w-full inline-flex items-center justify-between py-2 px-3 rounded-lg bg-[#090D16] border border-slate-800 text-xs font-mono-tabular text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Ver Payload JSON (`/layout`)</span>
              </span>
              <span>{showJsonPreview ? 'Ocultar' : 'Mostrar'}</span>
            </button>

            {showJsonPreview && (
              <pre className="p-3 rounded-lg bg-[#060911] border border-slate-800 text-[10px] font-mono-tabular text-emerald-300 overflow-x-auto max-h-52">
                {JSON.stringify(
                  {
                    pisos: currentPayload.pisos,
                    layout: currentPayload.layout.map((p) => ({
                      piso: p.piso,
                      filas: p.filas.map((f) => ({
                        fila: f.fila,
                        asientos: f.asientos.filter((s) => s.trim() !== ''),
                      })),
                    })),
                  },
                  null,
                  2
                )}
              </pre>
            )}
          </div>
        </div>

        {/* Right Area: Interactive Top-Down Coach Blueprint */}
        <div className="lg:col-span-8 bg-[#0F1623] border border-slate-800/80 rounded-xl p-5 space-y-5 shadow-xl">
          {/* Floor Tabs Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveFloorTab(1)}
                className={`btn-tactile px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                  activeFloorTab === 1
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_16px_rgba(245,158,11,0.3)]'
                    : 'bg-[#090D16] text-slate-300 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span>Planta Baja (Piso 1)</span>
                <span
                  className={`px-1.5 py-0.5 rounded font-mono-tabular text-[10px] ${
                    activeFloorTab === 1
                      ? 'bg-slate-950/20 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {floor1Seats} pax
                </span>
              </button>

              {pisosCount === 2 && (
                <button
                  type="button"
                  onClick={() => setActiveFloorTab(2)}
                  className={`btn-tactile px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                    activeFloorTab === 2
                      ? 'bg-amber-500 text-slate-950 shadow-[0_0_16px_rgba(245,158,11,0.3)]'
                      : 'bg-[#090D16] text-slate-300 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span>Planta Alta (Piso 2)</span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono-tabular text-[10px] ${
                      activeFloorTab === 2
                        ? 'bg-slate-950/20 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {floor2Seats} pax
                  </span>
                </button>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500/25 border border-emerald-400/70 inline-block" />
                <span>Butaca Activa</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-dashed border-slate-700 bg-slate-900/50 inline-block" />
                <span>Pasillo / Vacío</span>
              </span>
            </div>
          </div>

          {/* Blueprint Canvas Container */}
          <div className="bg-blueprint-grid rounded-2xl p-6 sm:p-8 border border-sky-500/20 flex flex-col items-center overflow-x-auto">
            {/* Bus Chassis Top-Down Silhouette */}
            <div className="w-full max-w-[460px] bg-[#0B1220]/95 border-2 border-slate-700/90 rounded-t-[44px] rounded-b-[24px] shadow-[0_0_50px_rgba(0,0,0,0.65)] overflow-hidden">
              {/* Front Windshield & Driver Cockpit / Stairwell */}
              <div className="relative bg-gradient-to-b from-slate-800/80 via-[#0F172A] to-[#0B1220] border-b border-slate-700/80 px-6 pt-5 pb-4">
                {/* Windshield Curved Glass Highlight */}
                <div className="mx-auto w-4/5 h-2.5 rounded-full bg-sky-400/20 border border-sky-400/30 mb-4" />

                <div className="flex items-center justify-between gap-4">
                  {/* Left Side: Driver Cockpit (Piso 1) or Panoramic Front Lounge (Piso 2) */}
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#090D16]/90 border border-slate-700/80">
                    <Disc className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-sky-400">
                        {activeFloorTab === 1 ? 'Cabina Conductor' : 'Parabrisas Panorámico'}
                      </div>
                      <div className="text-xs font-semibold text-slate-200">
                        {activeFloorTab === 1 ? 'Puesto de Mando' : 'Frente Planta Alta'}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Entry Door / Internal Staircase */}
                  <div className="px-3 py-2 rounded-xl bg-[#090D16]/90 border border-dashed border-amber-500/40 text-right">
                    <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-amber-400">
                      {activeFloorTab === 1 ? 'Acceso Principal' : 'Escalera Interna'}
                    </div>
                    <div className="text-xs font-medium text-slate-300">
                      {activeFloorTab === 1 ? 'Puerta Ascenso / Bodega' : 'Conexión Piso 1 ↕ Piso 2'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Column Headers (Ventanilla Izq | Pasillo | PasilloCentral | Pasillo | Ventanilla Der) */}
              <div className="px-5 py-2.5 bg-[#090D16]/90 border-b border-slate-800 grid grid-cols-11 gap-2 items-center text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                <div className="col-span-1 text-center">Fila</div>
                <div className="col-span-2 text-center text-sky-400">Vent. A</div>
                <div className="col-span-2 text-center">Pas. B</div>
                <div className="col-span-2 text-center text-slate-500">Pasillo</div>
                <div className="col-span-2 text-center">Pas. C</div>
                <div className="col-span-2 text-center text-sky-400">Vent. D</div>
              </div>

              {/* Seat Matrix Rows */}
              <div className="p-5 space-y-2.5">
                {currentFloorData.filas.map((filaObj, filaIndex) => {
                  const slots = ensureFourSlots(
                    filaObj.asientos,
                    filaObj.fila,
                    activeFloorTab
                  );

                  const renderSeatSlot = (colIndex: number) => {
                    const seatCode = slots[colIndex] || '';
                    const isAssigned = seatCode.trim() !== '';
                    const isEditingThis =
                      editingCell?.piso === activeFloorTab &&
                      editingCell?.filaIndex === filaIndex &&
                      editingCell?.colIndex === colIndex;

                    if (isEditingThis) {
                      return (
                        <div
                          key={colIndex}
                          className="col-span-2 h-12 rounded-xl bg-slate-900 border-2 border-amber-400 flex items-center justify-center p-1"
                        >
                          <input
                            type="text"
                            autoFocus
                            maxLength={5}
                            value={editingLabelValue}
                            onChange={(e) => setEditingLabelValue(e.target.value.toUpperCase())}
                            onBlur={handleCommitEditLabel}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitEditLabel();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            aria-label="Editar etiqueta de butaca"
                            className="w-full text-center font-mono-tabular font-bold text-xs text-amber-300 bg-transparent focus:outline-none uppercase"
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={colIndex} className="col-span-2 relative group">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleSeat(activeFloorTab, filaIndex, colIndex)
                          }
                          title={
                            isAssigned
                              ? `Butaca ${seatCode}: clic para convertir en pasillo/espacio vacío`
                              : 'Espacio vacío: clic para habilitar butaca'
                          }
                          className={`seat-cell w-full h-12 rounded-xl flex flex-col items-center justify-center relative cursor-pointer select-none ${
                            isAssigned
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/45 text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                              : 'bg-[#090D16]/60 hover:bg-slate-800/60 border border-dashed border-slate-700/80 text-slate-500'
                          }`}
                        >
                          {/* Top Headrest Accent Bar for Active Seats */}
                          {isAssigned && (
                            <span className="w-7 h-1 rounded-b-sm bg-emerald-400/70 absolute top-0" />
                          )}

                          {isAssigned ? (
                            <>
                              <Armchair className="w-3.5 h-3.5 text-emerald-400/90 mt-0.5" />
                              <span className="font-mono-tabular font-bold text-xs tracking-tight text-slate-100">
                                {seatCode}
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] font-mono-tabular uppercase tracking-wider">
                              Vacío
                            </span>
                          )}
                        </button>

                        {/* Quick Label Edit Trigger on Assigned Seat */}
                        {isAssigned && (
                          <button
                            type="button"
                            onClick={(e) =>
                              handleStartEditLabel(
                                e,
                                activeFloorTab,
                                filaIndex,
                                colIndex,
                                seatCode
                              )
                            }
                            title={`Editar código de butaca ${seatCode}`}
                            aria-label={`Editar código de butaca ${seatCode}`}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 border border-sky-400/60 text-sky-300 flex items-center justify-center shadow cursor-pointer"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div
                      key={filaObj.fila}
                      className="grid grid-cols-11 gap-2 items-center"
                    >
                      {/* Row Number Indicator */}
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="w-6 h-6 rounded-md bg-[#090D16] border border-slate-800 font-mono-tabular text-[11px] font-semibold text-slate-400 flex items-center justify-center">
                          {filaObj.fila}
                        </span>
                      </div>

                      {/* Left 2 Seats (Window A + Aisle B) */}
                      {renderSeatSlot(0)}
                      {renderSeatSlot(1)}

                      {/* Central Bus Aisle */}
                      <div className="col-span-2 h-12 rounded-lg bg-[#090D16]/40 border-x border-dashed border-slate-800/80 flex flex-col items-center justify-center select-none">
                        <span className="text-[9px] font-mono-tabular uppercase tracking-widest text-slate-600">
                          PASILLO
                        </span>
                      </div>

                      {/* Right 2 Seats (Aisle C + Window D) */}
                      {renderSeatSlot(2)}
                      {renderSeatSlot(3)}
                    </div>
                  );
                })}
              </div>

              {/* Bus Rear Chassis Tail (Engine / WC / Bar Module) */}
              <div className="px-6 py-3.5 bg-[#090D16]/90 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
                <span>COLA DE CHASIS · SANITARIO / BAR</span>
                <span className="text-amber-400 font-semibold">
                  PISO {activeFloorTab}: {activeFloorTab === 1 ? floor1Seats : floor2Seats} BUTACAS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
