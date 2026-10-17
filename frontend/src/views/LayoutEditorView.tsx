import React, { useEffect, useMemo, useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Edit2,
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
import { Modal } from '../components/Modal';

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

  if (!activeVehiculo) return <div className="et-empty et-panel"><Layers size={28}/><h2>Todavía no hay unidades</h2><p>Registrá un vehículo en Flota para configurar sus asientos.</p></div>;
  return <>
    <div className="et-page-heading"><div><span className="et-eyebrow">CADA LUGAR CUENTA</span><h1>Un lugar para cada viaje.</h1><p>Distribución de asientos y capacidad de tus unidades.</p></div><label className="et-unit-select">Unidad<select aria-label="Seleccionar vehículo" disabled={saving} value={activeVehiculo.id} onChange={e => onSelectVehiculo(e.target.value)}>{vehiculos.map(v => <option key={v.id} value={v.id}>{v.interno || formatPatenteMercosur(v.patente)} · {formatPatenteMercosur(v.patente)}</option>)}</select></label></div>
    <div className="et-seat-workspace"><section className="et-seat-canvas"><div className="et-seat-canvas-heading"><div><span className="et-eyebrow">DISTRIBUCIÓN</span><h2>{activeVehiculo.interno || formatPatenteMercosur(activeVehiculo.patente)}</h2></div><div className="et-tabs" aria-label="Piso del vehículo">{([1,2] as const).filter(p => p <= pisosCount).map(p => <button key={p} aria-pressed={activeFloorTab === p} onClick={() => {setEditingCell(null);setActiveFloorTab(p);}}>Piso {p}</button>)}</div></div>
      <div className="et-bus-plan"><div className="et-windshield"/><div className="et-bus-front"><span>FRENTE DE LA UNIDAD</span><span aria-hidden="true">◯</span></div><div className="et-seat-rows">{currentFloorData.filas.map((row, rowIndex) => <div className="et-seat-row" key={row.fila}>{[0,1,2,3].map(col => {
        const code = row.asientos[col] || '';
        return <div className={`et-seat-slot ${col === 2 ? 'et-after-aisle' : ''}`} key={col}><button className={`et-seat ${code ? '' : 'is-empty'}`} disabled={saving} onClick={() => handleToggleSeat(activeFloorTab,rowIndex,col)} aria-label={code ? `Asiento ${code}, deshabilitar` : `Fila ${row.fila}, posición ${COLUMN_LETTERS[col]}, habilitar asiento`} aria-pressed={!!code}><span>{code || '+'}</span><i/></button>{code && <button className="et-seat-edit" disabled={saving} onClick={e => handleStartEditLabel(e,activeFloorTab,rowIndex,col,code)} aria-label={`Editar código ${code}`}><Edit2 size={12}/><span>Editar</span></button>}</div>;
      })}</div>)}</div><span className="et-bus-rear">PARTE TRASERA · PISO {activeFloorTab}</span></div>
      <div className="et-seat-legend"><span><i/>Asiento habilitado</span><span><i className="is-empty"/>Espacio vacío</span></div><p className="et-seat-hint">Tocá un asiento para alternar entre asiento y espacio vacío.</p>
    </section><aside className="et-panel et-seat-controls"><div className="et-detail-body"><span className="et-eyebrow">LA UNIDAD</span><h2>{activeVehiculo.interno || 'Vehículo'}</h2><p className="et-muted et-small">{activeVehiculo.marca_modelo || 'Modelo sin especificar'}</p><div className="et-unit-plate"><MercosurPlate patente={activeVehiculo.patente} size="md"/></div><dl className="et-detail-list"><div><dt>Servicio</dt><dd>{serviceBadge.label}</dd></div><div><dt>Capacidad del plano</dt><dd>{totalSeatsAssigned} asientos</dd></div>{pisosCount === 2 && <div><dt>Por piso</dt><dd>{floor1Seats} + {floor2Seats} asientos</dd></div>}</dl>
      <fieldset disabled={saving} className="et-editor-tools"><label>Pisos<select aria-label="Cantidad de pisos" value={pisosCount} onChange={e => handleSwitchPisosCount(Number(e.target.value) as 1 | 2)}><option value={1}>1 piso</option><option value={2}>2 pisos</option></select></label><label>Plantilla de distribución<select aria-label="Aplicar plantilla" value="" onChange={e => handleApplyTemplate(e.target.value)}><option value="">Elegir una plantilla…</option>{Object.values(LAYOUT_TEMPLATES).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></label><div className="et-row-tools"><span>Filas del piso {activeFloorTab}<strong>{currentFloorData.filas.length}</strong></span><div><button className="et-icon-button" aria-label="Quitar última fila" disabled={currentFloorData.filas.length <= 1} onClick={() => handleRemoveLastRow(activeFloorTab)}><Trash2 size={17}/></button><button className="et-icon-button" aria-label="Agregar fila" disabled={currentFloorData.filas.length >= 16} onClick={() => handleAddRow(activeFloorTab)}><Plus size={18}/></button></div></div><button className="et-button et-secondary et-full" onClick={() => handleAutoRenumberFloor(activeFloorTab)}><RotateCcw size={15}/>Renumerar piso {activeFloorTab}</button></fieldset>
      <div className="et-editor-save"><button className="et-button et-primary et-full" disabled={saving || !!editingCell} onClick={handleSaveDistribution}><Save size={16}/>{saving ? 'Guardando…' : 'Guardar distribución'}</button><span className="et-save-status" role="status">{justSaved ? 'Distribución guardada' : activeVehiculo.layout_configurado ? 'Editando distribución' : 'Distribución nueva, pendiente de guardar'}</span></div></div></aside></div>
    {editingCell && <Modal title="Código de asiento" description="Usá una identificación única dentro de la unidad." onClose={() => setEditingCell(null)}><form className="et-form" onSubmit={e => {e.preventDefault();handleCommitEditLabel();}}><div className="et-form-body"><label>Código<input required maxLength={5} value={editingLabelValue} onChange={e => setEditingLabelValue(e.target.value.toUpperCase())}/></label></div><footer className="et-form-actions"><button type="button" className="et-button et-secondary" onClick={() => setEditingCell(null)}>Cancelar</button><button className="et-button et-primary" disabled={!editingLabelValue.trim()} type="submit">Guardar código</button></footer></form></Modal>}
  </>;
};
