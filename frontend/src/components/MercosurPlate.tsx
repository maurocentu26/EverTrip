import React from 'react';
import { formatPatenteMercosur } from '../services/api';

interface MercosurPlateProps {
  patente: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Authentic Argentine Mercosur License Plate ("AB 123 CD")
 * Designed with precision typography (JetBrains Mono tabular-nums),
 * official Mercosur Cobalt Top Header + Argentine flag emblem.
 */
export const MercosurPlate: React.FC<MercosurPlateProps> = ({
  patente,
  size = 'md',
  className = '',
}) => {
  const formatted = formatPatenteMercosur(patente);

  const sizeStyles = {
    sm: {
      wrapper: 'w-[118px] rounded-[5px]',
      header: 'h-[11px] px-1.5 text-[6.5px]',
      body: 'py-0.5 px-2 text-[12px] tracking-[0.12em]',
    },
    md: {
      wrapper: 'w-[144px] rounded-[6px]',
      header: 'h-[14px] px-2 text-[7.5px]',
      body: 'py-1 px-2.5 text-[14px] tracking-[0.14em]',
    },
    lg: {
      wrapper: 'w-[168px] rounded-[7px]',
      header: 'h-[16px] px-2.5 text-[8.5px]',
      body: 'py-1.5 px-3 text-[16px] tracking-[0.16em]',
    },
  }[size];

  return (
    <div
      className={`inline-flex flex-col overflow-hidden border border-slate-400/80 bg-[#F8FAFC] shadow-[0_2px_10px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(15,23,42,0.18)] select-none shrink-0 ${sizeStyles.wrapper} ${className}`}
      title={`Dominio Mercosur República Argentina: ${formatted}`}
    >
      {/* Mercosur Official Blue Band */}
      <div
        className={`flex items-center justify-between bg-[#003399] text-white font-semibold uppercase tracking-wider leading-none ${sizeStyles.header}`}
      >
        <span className="flex items-center gap-1 opacity-90">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-300" />
          <span className="font-mono-tabular text-[6px] tracking-widest">MERCOSUR</span>
        </span>
        <span className="font-bold tracking-[0.16em]">REPÚBLICA ARGENTINA</span>
        {/* Mini Argentine Flag */}
        <span className="inline-flex flex-col w-2.5 h-1.5 rounded-[1px] overflow-hidden border border-white/30 shrink-0">
          <span className="h-1/3 bg-[#74ACDF]" />
          <span className="h-1/3 bg-white flex items-center justify-center">
            <span className="w-0.5 h-0.5 rounded-full bg-amber-400" />
          </span>
          <span className="h-1/3 bg-[#74ACDF]" />
        </span>
      </div>

      {/* Plate Number Body */}
      <div
        className={`flex items-center justify-center bg-gradient-to-b from-white via-[#F1F5F9] to-[#E2E8F0] text-[#090D16] font-mono-tabular font-bold leading-tight ${sizeStyles.body}`}
      >
        {formatted}
      </div>
    </div>
  );
};
