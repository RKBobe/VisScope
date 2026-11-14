import {
  IngestionDocumentType,
  IngestionGeometryMode,
  PropertyMetadata,
  QualityClass,
  ConditionClass,
  RoomNode,
} from '../../types/sprocket';

export interface IngestionResult {
  document_type: IngestionDocumentType;
  document_label: string;
  confidence: number;
  recommended_mode: IngestionGeometryMode;
  mode_reasoning: string;
  project_name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  baseline_quality: QualityClass;
  baseline_condition: ConditionClass;
  metadata: PropertyMetadata;
  exterior_footprint_rooms: RoomNode[];
  interior_rooms: RoomNode[];
  has_clear_interior_rooms: boolean;
  raw_extracted_text?: string;
}

export interface RawDocumentPayload {
  fileName: string;
  text?: string;
  rawBytes?: Uint8Array;
  pageImages?: string[];
}
