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
  ArrowUpRight,
  Info,
  Code2,
  Cpu,
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
    return vehiculos.find((v) => v.id === selectedVehiculoId) || vehiculos[0];
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
    onNotify(`Plantilla "${tpl.nombre}" cargada en el plano.`, 'success');
  };

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
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* Top Designer Control Header */}
      <div className="bg-[#0D111A] border border-white/[0.07] rounded-xl p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-mono-tabular uppercase tracking-widest text-amber-400">
              <Cpu className="w-3.5 h-3.5" />
              <span>MÓDULO 03 · INGENIERO DE CHASIS & CABINA · EVE-13</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-display">
              Editor Interactivo de Layout y Mapa de Asientos
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Plano CAD en perspectiva superior (Blueprint): configurá niveles, pasillos, butacas físicas y códigos alfanuméricos.
            </p>
          </div>

          {/* Vehicle Selector + Primary Save CTA */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#07090E] border border-white/[0.09] rounded-xl px-3.5 py-2">
              <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                UNIDAD:
              </span>
              <select
                value={activeVehiculo?.id || ''}
                onChange={(e) => onSelectVehiculo(e.target.value)}
                aria-label="Seleccionar vehículo de la flota"
                className="bg-transparent text-xs sm:text-sm font-mono-tabular font-bold text-slate-100 focus:outline-none cursor-pointer pr-2"
              >
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#07090E] text-slate-100">
                    {formatPatenteMercosur(v.patente)} · {v.interno || 'FLOTA'} ({v.capacidad_asientos} pax)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSaveDistribution}
              disabled={saving || !activeVehiculo}
              className={`btn-tactile inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer shadow-lg ${
                justSaved
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_24px_rgba(16,185,129,0.4)]'
                  : 'bg-[#F59E0B] hover:bg-amber-400 text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.3)]'
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

        {/* Selected Vehicle Telemetry Strip */}
        {activeVehiculo && (
          <div className="pt-4 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <MercosurPlate patente={activeVehiculo.patente} size="sm" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">
                    {activeVehiculo.marca_modelo || 'Chasis Larga Distancia'}
                  </span>
                  <span className="text-[11px] font-mono-tabular px-2 py-0.5 rounded bg-[#131926] border border-white/[0.08] text-amber-400 font-semibold">
                    {activeVehiculo.interno || 'INT-100'}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${serviceBadge.badgeClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${serviceBadge.dotClass}`} />
                    {serviceBadge.label}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono-tabular">
                    POST /v1/vehiculos/{activeVehiculo.id}/layout
                  </span>
                </div>
              </div>
            </div>

            {/* Real-time Seat Counter Badges */}
            <div className="px-3.5 py-2 rounded-xl bg-[#07090E] border border-white/[0.08] flex items-center gap-3.5">
              <div className="text-right">
                <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                  Planta Baja (P1)
                </div>
                <div className="text-xs sm:text-sm font-bold font-mono-tabular text-emerald-400">
                  {floor1Seats} butacas
                </div>
              </div>
              {pisosCount === 2 && (
                <>
                  <div className="h-6 w-[1px] bg-white/[0.08]" />
                  <div className="text-right">
                    <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                      Planta Alta (P2)
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-mono-tabular text-sky-400">
                      {floor2Seats} butacas
                    </div>
                  </div>
                </>
              )}
              <div className="h-6 w-[1px] bg-white/[0.08]" />
              <div className="text-right">
                <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-amber-400">
                  Total Asignadas
                </div>
                <div className="text-base sm:text-lg font-extrabold font-mono-tabular text-amber-400 leading-none">
                  {totalSeatsAssigned} plazas
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace Grid: Left Engineering Tools (4 cols) + Right Automotive Blueprint (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Sidebar: Floor Architecture + 1-Click Templates + Row Tools */}
        <div className="lg:col-span-4 space-y-4">
          {/* 1. Floor Configuration Switcher */}
          <div className="bg-[#0D111A] border border-white/[0.07] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-tabular uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
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
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-[#07090E] border-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>1 Piso (Simple)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPisosCount(2)}
                className={`btn-tactile py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                  pisosCount === 2
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-[#07090E] border-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>2 Pisos (Doble Piso)</span>
              </button>
            </div>
          </div>

          {/* 2. Quick 1-Click Templates */}
          <div className="bg-[#0D111A] border border-white/[0.07] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-tabular uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Plantillas Rápidas (1 Clic)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Precargá una configuración de carrocería homologada y personalizá cualquier fila.
            </p>

            <div className="space-y-2">
              {Object.values(LAYOUT_TEMPLATES).map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl.id)}
                  className="btn-tactile w-full text-left p-3 rounded-xl bg-[#07090E] hover:bg-[#131926] border border-white/[0.07] hover:border-amber-500/40 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                      {tpl.nombre}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 leading-snug">{tpl.subtitulo}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-mono-tabular">
                    <span className="px-1.5 py-0.5 rounded bg-[#131926] border border-white/[0.08] text-amber-300">
                      {tpl.butacas} butacas
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#131926] border border-white/[0.08] text-emerald-300">
                      {tpl.pisos} {tpl.pisos === 2 ? 'Pisos' : 'Piso'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Active Floor Row Controls */}
          <div className="bg-[#0D111A] border border-white/[0.07] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-tabular uppercase tracking-wider text-slate-300">
                Ingeniería de Filas · Piso {activeFloorTab}
              </span>
              <span className="text-xs font-mono-tabular text-amber-400 font-semibold">
                {currentFloorData.filas.length} filas
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAddRow(activeFloorTab)}
                className="btn-tactile inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Fila</span>
              </button>

              <button
                type="button"
                onClick={() => handleRemoveLastRow(activeFloorTab)}
                disabled={currentFloorData.filas.length <= 1}
                className="btn-tactile inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-orange-500/12 hover:bg-orange-500/20 disabled:opacity-40 border border-orange-500/30 text-orange-300 text-xs font-medium cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Quitar Fila</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleAutoRenumberFloor(activeFloorTab)}
              className="btn-tactile w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#07090E] hover:bg-[#131926] border border-white/[0.08] text-slate-200 text-xs font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Autonumerar Etiquetas del Piso {activeFloorTab}</span>
            </button>

            <div className="p-3 rounded-lg bg-[#07090E] border border-white/[0.07] space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Interacción Táctil en Cabina</span>
              </div>
              <p>• Tocá cualquier celda para alternar entre Butaca Física y Pasillo.</p>
              <p>
                • Tocá el botón <Edit2 className="w-3 h-3 inline text-amber-400" /> en una butaca
                para editar su código (`1A`, `P1B`, `VIP`).
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowJsonPreview((s) => !s)}
              className="btn-tactile w-full inline-flex items-center justify-between py-2 px-3 rounded-lg bg-[#07090E] border border-white/[0.08] text-xs font-mono-tabular text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Payload API (`/layout`)</span>
              </span>
              <span>{showJsonPreview ? 'Ocultar' : 'Ver JSON'}</span>
            </button>

            {showJsonPreview && (
              <pre className="p-3 rounded-lg bg-[#05070B] border border-white/[0.08] text-[10px] font-mono-tabular text-emerald-300 overflow-x-auto max-h-52">
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

        {/* Right Area: Automotive / Aviation Grade Interactive Coach Blueprint */}
        <div className="lg:col-span-8 bg-[#0D111A] border border-white/[0.07] rounded-xl p-4 sm:p-5 space-y-5 shadow-2xl">
          {/* Floor Tabs Switcher + Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.07]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveFloorTab(1)}
                className={`btn-tactile px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                  activeFloorTab === 1
                    ? 'bg-[#F59E0B] text-slate-950 shadow-[0_0_18px_rgba(245,158,11,0.35)]'
                    : 'bg-[#07090E] text-slate-300 border border-white/[0.08] hover:bg-[#131926]'
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
                      ? 'bg-[#F59E0B] text-slate-950 shadow-[0_0_18px_rgba(245,158,11,0.35)]'
                      : 'bg-[#07090E] text-slate-300 border border-white/[0.08] hover:bg-[#131926]'
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

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500/25 border border-emerald-400/70 inline-block" />
                <span>Piso 1 Activa</span>
              </span>
              {pisosCount === 2 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-sky-500/25 border border-sky-400/70 inline-block" />
                  <span>Piso 2 Activa</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-dashed border-slate-700 bg-[#07090E] inline-block" />
                <span>Pasillo</span>
              </span>
            </div>
          </div>

          {/* CAD Blueprint Canvas */}
          <div className="bg-blueprint-grid rounded-2xl p-4 sm:p-8 border border-white/[0.08] flex flex-col items-center overflow-x-auto relative">
            {/* Side Wing Mirrors + Fuselage Container */}
            <div className="relative w-full max-w-[470px]">
              {/* Left & Right Aerodynamic Side Mirrors */}
              <div
                className="hidden sm:block absolute -left-4 top-12 w-3.5 h-10 rounded-l-full bg-[#131926] border border-slate-600/80 shadow-md"
                aria-hidden="true"
              />
              <div
                className="hidden sm:block absolute -right-4 top-12 w-3.5 h-10 rounded-r-full bg-[#131926] border border-slate-600/80 shadow-md"
                aria-hidden="true"
              />

              {/* Bus Fuselage Top-Down Silhouette */}
              <div className="w-full bg-[#090D15]/95 border-2 border-slate-700/90 rounded-t-[54px] rounded-b-[26px] shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden">
                {/* Aerodynamic Front Nose + Amber Headlight Beams + Cockpit */}
                <div className="relative bg-gradient-to-b from-[#162033] via-[#0D1320] to-[#090D15] border-b border-white/[0.08] px-5 pt-4 pb-4">
                  {/* Front Amber Reflector Headlights */}
                  <div className="flex items-center justify-between px-6 mb-2.5">
                    <span className="w-10 h-1.5 rounded-full bg-amber-400 shadow-[0_0_14px_#F59E0B]" />
                    <span className="text-[9px] font-mono-tabular uppercase tracking-[0.25em] text-slate-400">
                      FRENTE AERODINÁMICO
                    </span>
                    <span className="w-10 h-1.5 rounded-full bg-amber-400 shadow-[0_0_14px_#F59E0B]" />
                  </div>

                  {/* Curved Panoramic Windshield SVG */}
                  <div className="mx-auto w-11/12 h-3 rounded-t-full bg-sky-400/15 border-t-2 border-x border-sky-400/40 mb-4" />

                  <div className="grid grid-cols-2 gap-3">
                    {/* Left Side: Driver Cockpit with Schematic Steering Wheel (Piso 1) or Front Panorama (Piso 2) */}
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#07090E]/90 border border-white/[0.08]">
                      {/* Schematic Steering Wheel SVG */}
                      <svg
                        viewBox="0 0 24 24"
                        className="w-6 h-6 text-amber-400 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="2.5" />
                        <path d="M12 14.5V21M4.5 9.5L9.8 11M19.5 9.5L14.2 11" />
                      </svg>
                      <div className="min-w-0">
                        <div className="text-[9px] font-mono-tabular uppercase tracking-wider text-amber-400">
                          {activeFloorTab === 1 ? 'PUESTO DE MANDO' : 'VISTA PANORÁMICA'}
                        </div>
                        <div className="text-xs font-semibold text-slate-100 truncate">
                          {activeFloorTab === 1 ? 'Cabina Conductor' : 'Frente Planta Alta'}
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Stairwell / Access Door */}
                    <div className="px-3 py-2 rounded-xl bg-[#07090E]/90 border border-dashed border-amber-500/40 flex flex-col justify-center text-right">
                      <div className="text-[9px] font-mono-tabular uppercase tracking-wider text-amber-400">
                        {activeFloorTab === 1 ? 'ACCESO & ESCALERA' : 'ESCALERA INTERNA'}
                      </div>
                      <div className="text-xs font-medium text-slate-300 truncate">
                        {activeFloorTab === 1 ? 'Ascenso Pasajeros' : 'Bajada a Piso 1'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column Coordinate Header */}
                <div className="px-4 sm:px-5 py-2.5 bg-[#07090E] border-b border-white/[0.07] grid grid-cols-11 gap-2 items-center text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                  <div className="col-span-1 text-center">FILA</div>
                  <div className="col-span-2 text-center text-amber-400">VENT. A</div>
                  <div className="col-span-2 text-center">PAS. B</div>
                  <div className="col-span-2 text-center text-slate-500">PASILLO</div>
                  <div className="col-span-2 text-center">PAS. C</div>
                  <div className="col-span-2 text-center text-amber-400">VENT. D</div>
                </div>

                {/* Seat Matrix Rows */}
                <div className="p-4 sm:p-5 space-y-2.5">
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
                            className="col-span-2 h-13 rounded-xl bg-[#07090E] border-2 border-amber-400 flex items-center justify-center p-1"
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

                      const isUpperDeck = activeFloorTab === 2;
                      const activeSeatClasses = isUpperDeck
                        ? 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-400/50 text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                        : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/50 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]';

                      const headrestClass = isUpperDeck ? 'bg-sky-400/80' : 'bg-emerald-400/80';

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
                            className={`seat-cell w-full h-13 rounded-xl border flex flex-col items-center justify-center relative cursor-pointer select-none ${
                              isAssigned
                                ? activeSeatClasses
                                : 'bg-[#07090E]/70 hover:bg-white/[0.04] border-dashed border-slate-700/80 text-slate-600'
                            }`}
                          >
                            {/* Physical Seat Anatomy: Top Headrest Pillow + Side Armrests */}
                            {isAssigned && (
                              <>
                                <span
                                  className={`w-8 h-1.5 rounded-b-md absolute top-0 ${headrestClass}`}
                                />
                                <span className="w-1 h-6 rounded-r bg-white/15 absolute left-0 top-1/2 -translate-y-1/2" />
                                <span className="w-1 h-6 rounded-l bg-white/15 absolute right-0 top-1/2 -translate-y-1/2" />
                              </>
                            )}

                            {isAssigned ? (
                              <>
                                <span className="text-[9px] font-mono-tabular uppercase tracking-wider opacity-70 mt-1">
                                  {colIndex === 0 || colIndex === 3 ? 'VENT' : 'PAS'}
                                </span>
                                <span className="font-mono-tabular font-bold text-xs sm:text-sm tracking-tight text-white">
                                  {seatCode}
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] font-mono-tabular uppercase tracking-wider">
                                Vacío
                              </span>
                            )}
                          </button>

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
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#07090E] border border-amber-400/70 text-amber-300 flex items-center justify-center shadow cursor-pointer z-10"
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
                        {/* Lateral Fuselage Row Coordinate */}
                        <div className="col-span-1 flex items-center justify-center">
                          <span className="w-6 h-6 rounded-md bg-[#07090E] border border-white/[0.08] font-mono-tabular text-[11px] font-bold text-slate-400 flex items-center justify-center">
                            {filaObj.fila}
                          </span>
                        </div>

                        {renderSeatSlot(0)}
                        {renderSeatSlot(1)}

                        {/* Central Walk Aisle with Longitudinal Guide Line */}
                        <div className="col-span-2 h-13 rounded-lg bg-[#07090E]/50 border-x border-dashed border-white/[0.07] flex flex-col items-center justify-center select-none relative">
                          <span className="text-[8px] font-mono-tabular uppercase tracking-widest text-slate-600">
                            PASILLO
                          </span>
                        </div>

                        {renderSeatSlot(2)}
                        {renderSeatSlot(3)}
                      </div>
                    );
                  })}
                </div>

                {/* Bus Rear Chassis Tail (WC / Minibar / Motor Telemetry) */}
                <div className="px-5 py-3.5 bg-[#07090E] border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono-tabular text-slate-400">
                  <span>COLA DE FUSELAJE · WC / BAR A BORDO</span>
                  <span className="text-amber-400 font-bold">
                    NIVEL {activeFloorTab}: {activeFloorTab === 1 ? floor1Seats : floor2Seats} PLAZAS
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ergonomic Bottom Floating Engineering Toolbar inside Canvas */}
          <div className="p-3 rounded-xl bg-[#07090E] border border-white/[0.09] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddRow(activeFloorTab)}
                className="btn-tactile px-3 py-2 rounded-lg bg-[#131926] hover:bg-slate-800 border border-white/[0.09] text-xs font-medium text-emerald-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Fila Piso {activeFloorTab}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAutoRenumberFloor(activeFloorTab)}
                className="btn-tactile px-3 py-2 rounded-lg bg-[#131926] hover:bg-slate-800 border border-white/[0.09] text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Renumerar Piso {activeFloorTab}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveDistribution}
              disabled={saving || !activeVehiculo}
              className="btn-tactile px-4 py-2 rounded-lg bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Plano ({totalSeatsAssigned} butacas)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
