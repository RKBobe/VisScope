import React from 'react';
import { SprocketProject } from '../../types/sprocket';
import { lowesClient } from '../../services/lowes/lowesClient';
import { exportLowesPickSheetCSV } from '../../services/lowes/pickSheetExporter';
import {
  X,
  ShoppingCart,
  Download,
  Store,
  MapPin,
  Layers,
  Phone,
  Tag,
} from 'lucide-react';

interface LowesProcurementModalProps {
  project: SprocketProject;
  isOpen: boolean;
  onClose: () => void;
}

export const LowesProcurementModal: React.FC<LowesProcurementModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const procurementOrder = lowesClient.generateProcurementOrder(
    project.rooms,
    project.address.zip
  );

  const handleDownloadCSV = () => {
    const csvContent = exportLowesPickSheetCSV(procurementOrder);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `lowes_materials_buy_sheet_${project.address.zip}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Lowe's B2B Pro Procurement & Pick Sheet
                <span className="text-xs bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-full font-mono">
                  Store #{procurementOrder.store_id}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated takeoff-to-SKU mapping with waste factors, contractor pricing, and in-store routing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Store Location & Waste Multipliers Bar */}
        <div className="bg-slate-950/90 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Store className="w-4 h-4 text-sky-400" />
              {procurementOrder.store_name}
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <MapPin className="w-3.5 h-3.5" />
              {procurementOrder.store_address}
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <Phone className="w-3.5 h-3.5" />
              {procurementOrder.store_phone}
            </div>
          </div>

          {/* Waste Factor Badges */}
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-500">Waste Allowances:</span>
            <span className="bg-slate-800 text-sky-300 px-2 py-0.5 rounded border border-slate-700">
              Drywall: +10%
            </span>
            <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">
              Trim / Tile: +15%
            </span>
          </div>
        </div>

        {/* Aisle Route Shortcuts */}
        <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-sky-400" />
            Pick Route:
          </span>
          {procurementOrder.aisle_bay_summary.map((summary, idx) => (
            <span
              key={idx}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700 font-mono text-[11px] whitespace-nowrap"
            >
              {summary.aisle} ({summary.items_count} units)
            </span>
          ))}
        </div>

        {/* Line Items Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {procurementOrder.line_items.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No material line items need procurement. Add or scope deficiencies in the room drawer first.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Product Description</th>
                  <th className="py-2.5 px-3">Room Origin</th>
                  <th className="py-2.5 px-3 text-right">Raw Qty</th>
                  <th className="py-2.5 px-3 text-right">Waste</th>
                  <th className="py-2.5 px-3 text-right text-sky-400 font-bold">Order Qty</th>
                  <th className="py-2.5 px-3 text-right">Pro Price</th>
                  <th className="py-2.5 px-3 text-right text-emerald-400 font-bold">Extended</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {procurementOrder.line_items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-semibold text-sky-400 whitespace-nowrap">
                      {item.aisle} / {item.bay}
                    </td>
                    <td className="py-2 px-3 text-slate-400 font-sans">{item.sku}</td>
                    <td className="py-2 px-3 font-sans text-slate-200 max-w-[240px] truncate">
                      {item.product_name}
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-400">{item.room_name}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{item.raw_quantity}</td>
                    <td className="py-2 px-3 text-right text-amber-400">+{item.waste_factor_pct}%</td>
                    <td className="py-2 px-3 text-right text-sky-400 font-bold text-sm">
                      {item.order_units}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      ${item.unit_price.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                      ${item.extended_cost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Summary & Action */}
        <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Materials Subtotal</span>
              <span className="text-sm font-bold text-slate-200">
                ${procurementOrder.subtotal.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Est. Sales Tax</span>
              <span className="text-sm font-bold text-slate-400">
                ${procurementOrder.estimated_tax.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-emerald-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Purchase Order Total
              </span>
              <span className="text-base font-extrabold text-emerald-400">
                ${procurementOrder.total.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadCSV}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition"
            >
              <Download className="w-4 h-4" />
              Download Aisle/Bay Pick Sheet (CSV)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
