/** Customers: shapes and file rules shared by the server actions and the console. */

import type { AdminReservation } from "./sales";

export const DOC_MAX_BYTES = 10 * 1024 * 1024;
export const DOC_ACCEPT = ".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx,.xls,.xlsx";

/** PDFs and photos are Cloudinary "image" assets; Word and Excel files are "raw". */
export function docResource(name: string, type: string): "image" | "raw" {
  return type.startsWith("image/") || type === "application/pdf" || /\.(pdf|jpe?g|png|heic|webp)$/i.test(name) ? "image" : "raw";
}

export interface AdminCustomerRow {
  id: number;
  name: string;
  nic: string;
  mobile: string;
  email: string;
  units: string[];
  overdue: boolean;
  createdAt: string;
}

export interface AdminDocument {
  id: number;
  name: string;
  format: string;
  bytes: number;
  uploadedBy: string;
  createdAt: string;
}

export interface AdminCustomer {
  id: number;
  name: string;
  nic: string;
  mobile: string;
  email: string;
  address: string;
  notes: string;
  leadId: number | null;
  createdAt: string;
  reservations: AdminReservation[];
  documents: AdminDocument[];
}
