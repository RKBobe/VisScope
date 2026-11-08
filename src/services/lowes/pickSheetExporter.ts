import { ProcurementOrder } from '../../types/sprocket';

/**
 * Exports a contractor pick sheet CSV sorted by store Aisle and Bay.
 */
export function exportLowesPickSheetCSV(order: ProcurementOrder): string {
  const headers = [
    'Aisle',
    'Bay',
    'SKU',
    'Product Description',
    'Order Qty',
    'UOM',
    'Contractor Unit Price',
    'Extended Cost',
    'Room Origin',
    'Raw Takeoff Qty',
    'Waste Factor %',
  ];

  const rows: string[] = [];
  rows.push(headers.join(','));

  for (const item of order.line_items) {
    const row = [
      `"${item.aisle}"`,
      `"${item.bay}"`,
      `"${item.sku}"`,
      `"${item.product_name.replace(/"/g, '""')}"`,
      item.order_units,
      `"Units"`,
      `$${item.unit_price.toFixed(2)}`,
      `$${item.extended_cost.toFixed(2)}`,
      `"${item.room_name.replace(/"/g, '""')}"`,
      item.raw_quantity,
      `+${item.waste_factor_pct}%`,
    ];
    rows.push(row.join(','));
  }

  // Add summary rows
  rows.push('');
  rows.push(`"", "", "", "Subtotal", "", "", "", "$${order.subtotal.toFixed(2)}", "", "", ""`);
  rows.push(`"", "", "", "Estimated Sales Tax", "", "", "", "$${order.estimated_tax.toFixed(2)}", "", "", ""`);
  rows.push(`"", "", "", "Total Purchase Order", "", "", "", "$${order.total.toFixed(2)}", "", "", ""`);

  return rows.join('\r\n');
}
