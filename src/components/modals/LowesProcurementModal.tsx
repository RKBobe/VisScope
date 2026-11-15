import React, { useState, useEffect } from 'react';
import {
  RetailerConnectionConfig,
  SprocketProject,
  SupplyRetailerId,
} from '../../types/sprocket';
import {
  getDefaultRetailerConnection,
  lowesClient,
  RETAILER_PROFILES,
  syncOrderWithSupplierEndpoint,
} from '../../services/lowes/lowesClient';
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
  Settings2,
  ExternalLink,
  Send,
} from 'lucide-react';

interface LowesProcurementModalProps {
  project: SprocketProject;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSupplyRetailer?: (config: RetailerConnectionConfig) => void;
}

export const LowesProcurementModal: React.FC<LowesProcurementModalProps> = ({
  project,
  isOpen,
  onClose,
  onUpdateSupplyRetailer,
}) => {
  const [selectedAisle, setSelectedAisle] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [localConfig, setLocalConfig] = useState<RetailerConnectionConfig>(
    () => project.supply_retailer || getDefaultRetailerConnection('lowes')
  );

  useEffect(() => {
    if (project.supply_retailer) {
      setLocalConfig(project.supply_retailer);
    }
  }, [project.supply_retailer]);

  if (!isOpen) return null;

  const activeConfig = project.supply_retailer || localConfig;
  const activeZip = project.cost_index?.zip_code || project.address.zip;
  const procurementOrder = lowesClient.generateProcurementOrder(
    project.rooms,
    activeZip,
    activeConfig
  );

  const visibleLineItems = selectedAisle
    ? procurementOrder.line_items.filter((item) => item.aisle === selectedAisle)
    : procurementOrder.line_items;

  const updateConnection = (next: RetailerConnectionConfig) => {
    setLocalConfig(next);
    setSyncResult(null);
    onUpdateSupplyRetailer?.(next);
  };

  const handleSelectRetailer = (retailerId: SupplyRetailerId) => {
    const defaults = getDefaultRetailerConnection(retailerId);
    updateConnection({
      ...defaults,
      account_id: activeConfig.account_id,
      price_tier: activeConfig.price_tier,
      custom_discount_pct: activeConfig.custom_discount_pct,
      api_endpoint: activeConfig.api_endpoint,
      api_key: activeConfig.api_key,
    });
  };

  const handleSyncEndpoint = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    const res = await syncOrderWithSupplierEndpoint(procurementOrder, activeConfig);
    setSyncResult({ ok: res.ok, text: res.statusText });
    setIsSyncing(false);
  };

  const handleDownloadCSV = () => {
    const csvContent = exportLowesPickSheetCSV(procurementOrder);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const retailerSlug = activeConfig.retailer_id || 'supplier';
    link.setAttribute(
      'download',
      `${retailerSlug}_materials_buy_sheet_${activeZip}_${Date.now()}.csv`
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
              <h2 className="text-lg font-bold text-white flex flex-wrap items-center gap-2">
                Materials Supply & Pro Procurement ({activeConfig.retailer_name})
                <span className="text-xs bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-full font-mono">
                  Branch #{procurementOrder.store_id}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-retailer takeoff-to-SKU adapter with contractor pricing, live product search links, and webhook sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                showSettings
                  ? 'bg-sky-600/20 text-sky-300 border-sky-500/60'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Supplier Setup
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Retailer Switcher Bar */}
        <div className="px-6 py-2.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">
              Retailer:
            </span>
            {(Object.keys(RETAILER_PROFILES) as SupplyRetailerId[]).map((rid) => {
              const profile = RETAILER_PROFILES[rid];
              const isSelected = activeConfig.retailer_id === rid;
              return (
                <button
                  key={rid}
                  type="button"
                  onClick={() => handleSelectRetailer(rid)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-400 shadow'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {profile.name}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => updateConnection({ ...activeConfig, price_tier: 'contractor_pro' })}
              className={`px-2 py-0.5 rounded font-semibold transition ${
                activeConfig.price_tier === 'contractor_pro'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Contractor Pro
            </button>
            <button
              type="button"
              onClick={() => updateConnection({ ...activeConfig, price_tier: 'retail' })}
              className={`px-2 py-0.5 rounded font-semibold transition ${
                activeConfig.price_tier === 'retail'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Retail
            </button>
          </div>
        </div>

        {/* Optional Supplier Account & API Connection Settings */}
        {showSettings && (
          <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Supplier Display Name</label>
                <input
                  type="text"
                  value={activeConfig.retailer_name}
                  onChange={(e) =>
                    updateConnection({ ...activeConfig, retailer_name: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Pro Account / Trade ID</label>
                <input
                  type="text"
                  placeholder="e.g. PRO-88412"
                  value={activeConfig.account_id || ''}
                  onChange={(e) =>
                    updateConnection({ ...activeConfig, account_id: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Extra Trade Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="1"
                  value={activeConfig.custom_discount_pct ?? 0}
                  onChange={(e) =>
                    updateConnection({
                      ...activeConfig,
                      custom_discount_pct: Math.max(0, Math.min(50, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Search URL Template ({`{query}`})</label>
                <input
                  type="text"
                  value={activeConfig.store_search_url_template}
                  onChange={(e) =>
                    updateConnection({
                      ...activeConfig,
                      store_search_url_template: e.target.value,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sky-300 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-slate-400 block mb-1">Supplier Order / Webhook API URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://api.your-supplier.com/v1/quote"
                  value={activeConfig.api_endpoint || ''}
                  onChange={(e) =>
                    updateConnection({ ...activeConfig, api_endpoint: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Bearer API Token (optional)</label>
                <input
                  type="password"
                  placeholder="Optional token for live endpoint"
                  value={activeConfig.api_key || ''}
                  onChange={(e) =>
                    updateConnection({ ...activeConfig, api_key: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncEndpoint}
                  disabled={isSyncing}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSyncing ? 'Syncing...' : 'POST Order to Supplier URL'}
                </button>
              </div>
            </div>

            {syncResult && (
              <div
                className={`text-[11px] px-3 py-1.5 rounded border ${
                  syncResult.ok
                    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                    : 'bg-amber-950/50 border-amber-800 text-amber-300'
                }`}
              >
                {syncResult.text}
              </div>
            )}
          </div>
        )}

        {/* Store Location & Waste Multipliers Bar */}
        <div className="bg-slate-950/90 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
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
            {activeConfig.account_id && (
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono text-[11px]">
                Acct: {activeConfig.account_id}
              </span>
            )}
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
          {selectedAisle && (
            <button
              onClick={() => setSelectedAisle(null)}
              className="bg-sky-950 hover:bg-sky-900 text-sky-300 px-2 py-0.5 rounded border border-sky-700 font-mono text-[11px] whitespace-nowrap transition"
            >
              All Aisles
            </button>
          )}
          {procurementOrder.aisle_bay_summary.map((summary, idx) => {
            const isSelected = selectedAisle === summary.aisle;
            return (
              <button
                key={idx}
                onClick={() =>
                  setSelectedAisle(isSelected ? null : summary.aisle)
                }
                className={`px-2 py-0.5 rounded border font-mono text-[11px] whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-400 shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {summary.aisle} ({summary.items_count} units)
              </button>
            );
          })}
        </div>

        {/* Line Items Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {visibleLineItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              {selectedAisle
                ? `No material items in ${selectedAisle}.`
                : 'No material line items need procurement. Add or scope deficiencies in the room drawer first.'}
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
                  <th className="py-2.5 px-3 text-right">
                    {activeConfig.price_tier === 'retail' ? 'Retail' : 'Pro Price'}
                  </th>
                  <th className="py-2.5 px-3 text-right text-emerald-400 font-bold">Extended</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {visibleLineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-semibold text-sky-400 whitespace-nowrap">
                      {item.aisle} / {item.bay}
                    </td>
                    <td className="py-2 px-3 text-slate-400 font-sans">{item.sku}</td>
                    <td className="py-2 px-3 font-sans text-slate-200 max-w-[260px]">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{item.product_name}</span>
                        {item.product_url && (
                          <a
                            href={item.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Search at ${activeConfig.retailer_name}`}
                            className="text-sky-400 hover:text-sky-300 shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
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
              Download Pick Sheet (CSV)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
