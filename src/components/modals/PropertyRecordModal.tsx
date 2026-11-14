import React from 'react';
import {
  ConditionClass,
  PropertyMetadata,
  QualityClass,
  SprocketProject,
} from '../../types/sprocket';
import {
  X,
  FileSpreadsheet,
  MapPin,
  Building,
  DollarSign,
  Hammer,
  ClipboardList,
} from 'lucide-react';

interface PropertyRecordModalProps {
  project: SprocketProject;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProjectMetadata: (
    updatedAddress: SprocketProject['address'],
    updatedMetadata: PropertyMetadata,
    baselineQuality: QualityClass,
    baselineCondition: ConditionClass
  ) => void;
}

const QUALITY_CLASSES: QualityClass[] = [
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
];

const CONDITION_CLASSES: ConditionClass[] = [
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
];

export const PropertyRecordModal: React.FC<PropertyRecordModalProps> = ({
  project,
  isOpen,
  onClose,
  onUpdateProjectMetadata,
}) => {
  if (!isOpen) return null;

  const meta: PropertyMetadata = project.property_metadata || {};

  const updateMetaField = <K extends keyof PropertyMetadata>(
    key: K,
    value: PropertyMetadata[K]
  ) => {
    onUpdateProjectMetadata(
      project.address,
      { ...meta, [key]: value },
      project.baseline_quality,
      project.baseline_condition
    );
  };

  const updateAddressField = (key: keyof SprocketProject['address'], value: string) => {
    onUpdateProjectMetadata(
      { ...project.address, [key]: value },
      meta,
      project.baseline_quality,
      project.baseline_condition
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Property Record Card & Appraisal Data Fields
                {meta.source_file_name && (
                  <span className="text-xs bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded-full font-mono">
                    Source: {meta.source_file_name}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Prepopulated parcel identification, building characteristics, systems, county valuations, and permits
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

        {/* Scrollable Fields */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
          {meta.ingestion_notes && (
            <div className="bg-sky-950/40 border border-sky-800/70 rounded-xl p-3 text-sky-200 flex items-center justify-between">
              <span>{meta.ingestion_notes}</span>
              <span className="text-[10px] font-mono bg-sky-900/80 px-2 py-0.5 rounded text-sky-300 shrink-0 ml-3">
                Mode: {meta.ingestion_mode || 'exterior_footprint_only'}
              </span>
            </div>
          )}

          {/* Section 1: Situs Address & Parcel Identification */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              1. Situs Address & Parcel Identification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-slate-400 block mb-1">Street Address</label>
                <input
                  type="text"
                  value={project.address.street}
                  onChange={(e) => updateAddressField('street', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">City</label>
                <input
                  type="text"
                  value={project.address.city}
                  onChange={(e) => updateAddressField('city', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">State</label>
                  <input
                    type="text"
                    value={project.address.state}
                    onChange={(e) => updateAddressField('state', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">ZIP</label>
                  <input
                    type="text"
                    value={project.address.zip}
                    onChange={(e) => updateAddressField('zip', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Parcel ID / PIN</label>
                <input
                  type="text"
                  value={meta.parcel_id || ''}
                  onChange={(e) => updateMetaField('parcel_id', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sky-300 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Quick Ref / Alt ID</label>
                <input
                  type="text"
                  value={meta.quick_ref_id || ''}
                  onChange={(e) => updateMetaField('quick_ref_id', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Owner Name</label>
                <input
                  type="text"
                  value={meta.owner_name || ''}
                  onChange={(e) => updateMetaField('owner_name', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Neighborhood / Zoning</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    placeholder="NBHD"
                    value={meta.neighborhood_code || ''}
                    onChange={(e) => updateMetaField('neighborhood_code', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Zoning"
                    value={meta.zoning || ''}
                    onChange={(e) => updateMetaField('zoning', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono"
                  />
                </div>
              </div>
              <div className="sm:col-span-3">
                <label className="text-slate-400 block mb-1">Legal Description</label>
                <input
                  type="text"
                  value={meta.legal_description || ''}
                  onChange={(e) => updateMetaField('legal_description', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Lot Size (SqFt)</label>
                <input
                  type="number"
                  value={meta.lot_size_sqft ?? ''}
                  onChange={(e) => updateMetaField('lot_size_sqft', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dwelling & Architectural Characteristics */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Building className="w-4 h-4" />
              2. Dwelling & Architectural Characteristics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Year Built</label>
                <input
                  type="number"
                  value={meta.year_built ?? ''}
                  onChange={(e) => updateMetaField('year_built', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Architectural Style</label>
                <input
                  type="text"
                  value={meta.architectural_style || ''}
                  onChange={(e) => updateMetaField('architectural_style', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Reported GLA (SF)</label>
                <input
                  type="number"
                  value={meta.total_living_area_reported_sqft ?? ''}
                  onChange={(e) =>
                    updateMetaField('total_living_area_reported_sqft', Number(e.target.value))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-emerald-300 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Basement Type & Area (SF)</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    placeholder="Type"
                    value={meta.basement_type || ''}
                    onChange={(e) => updateMetaField('basement_type', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                  />
                  <input
                    type="number"
                    placeholder="Area SF"
                    value={meta.basement_area_sqft ?? ''}
                    onChange={(e) => updateMetaField('basement_area_sqft', Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Total Rooms</label>
                <input
                  type="number"
                  value={meta.total_rooms_reported ?? ''}
                  onChange={(e) => updateMetaField('total_rooms_reported', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Bedrooms</label>
                <input
                  type="number"
                  value={meta.bedrooms_reported ?? ''}
                  onChange={(e) => updateMetaField('bedrooms_reported', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Full Baths</label>
                <input
                  type="number"
                  value={meta.full_baths_reported ?? ''}
                  onChange={(e) => updateMetaField('full_baths_reported', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Plumbing Fixtures</label>
                <input
                  type="number"
                  value={meta.plumbing_fixtures_count ?? ''}
                  onChange={(e) =>
                    updateMetaField('plumbing_fixtures_count', Number(e.target.value))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Structural Systems & Baseline Quality/Condition */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Hammer className="w-4 h-4" />
              3. Structural Systems & Quality / Condition Ratings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Foundation</label>
                <input
                  type="text"
                  value={meta.foundation_type || ''}
                  onChange={(e) => updateMetaField('foundation_type', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Exterior Wall</label>
                <input
                  type="text"
                  value={meta.exterior_wall_type || ''}
                  onChange={(e) => updateMetaField('exterior_wall_type', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Roof Type & Material</label>
                <input
                  type="text"
                  value={meta.roofing_material || meta.roof_type || ''}
                  onChange={(e) => updateMetaField('roofing_material', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Heating & Cooling (HVAC)</label>
                <input
                  type="text"
                  value={meta.heating_cooling_description || ''}
                  onChange={(e) => updateMetaField('heating_cooling_description', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Baseline Quality ({meta.quality_grade_raw || 'Mapped'})
                </label>
                <select
                  value={project.baseline_quality}
                  onChange={(e) =>
                    onUpdateProjectMetadata(
                      project.address,
                      meta,
                      e.target.value as QualityClass,
                      project.baseline_condition
                    )
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                >
                  {QUALITY_CLASSES.map((qc) => (
                    <option key={qc} value={qc}>
                      {qc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Baseline Condition ({meta.condition_cdu_raw || 'Mapped'})
                </label>
                <select
                  value={project.baseline_condition}
                  onChange={(e) =>
                    onUpdateProjectMetadata(
                      project.address,
                      meta,
                      project.baseline_quality,
                      e.target.value as ConditionClass
                    )
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                >
                  {CONDITION_CLASSES.map((cc) => (
                    <option key={cc} value={cc}>
                      {cc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: County Valuation & Architectural Metrics */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              4. County Appraised Values & Architectural Area Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
              <div>
                <label className="text-slate-400 font-sans block mb-1">Land Value ($)</label>
                <input
                  type="number"
                  value={meta.appraised_land_value ?? ''}
                  onChange={(e) => updateMetaField('appraised_land_value', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 font-sans block mb-1">Building Value ($)</label>
                <input
                  type="number"
                  value={meta.appraised_building_value ?? ''}
                  onChange={(e) =>
                    updateMetaField('appraised_building_value', Number(e.target.value))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 font-sans block mb-1">Total Market ($)</label>
                <input
                  type="number"
                  value={meta.appraised_total_value ?? ''}
                  onChange={(e) =>
                    updateMetaField('appraised_total_value', Number(e.target.value))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-emerald-400 font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400 font-sans block mb-1">Dwelling RCN ($)</label>
                <input
                  type="number"
                  value={meta.dwelling_rcn_value ?? ''}
                  onChange={(e) => updateMetaField('dwelling_rcn_value', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sky-300"
                />
              </div>
              <div>
                <label className="text-slate-400 font-sans block mb-1">Assessed / % Good</label>
                <input
                  type="number"
                  value={meta.assessed_total_value ?? meta.percent_good ?? ''}
                  onChange={(e) =>
                    updateMetaField('assessed_total_value', Number(e.target.value))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Extracted Components & Permits */}
          {(meta.components?.length || meta.permits?.length) ? (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-sky-400" />
                5. Ingested Dwelling Components, Area Schedule & Building Permits
              </h3>

              {meta.permits && meta.permits.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">
                    Building Permits
                  </span>
                  {meta.permits.map((p, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 px-3 py-2 rounded border border-slate-800 flex items-center justify-between font-mono"
                    >
                      <span>
                        {p.number} — {p.type} ({p.issue_date})
                      </span>
                      <span className="text-emerald-400 font-bold">
                        ${p.amount.toLocaleString()} ({p.status})
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {meta.components && meta.components.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {meta.components.map((c, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 px-3 py-1.5 rounded border border-slate-800 flex items-center justify-between"
                    >
                      <span className="text-slate-300">
                        {c.code ? `[${c.code}] ` : ''}
                        {c.description}
                      </span>
                      {c.units !== undefined && (
                        <span className="font-mono text-sky-400 font-bold">
                          {c.units.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
