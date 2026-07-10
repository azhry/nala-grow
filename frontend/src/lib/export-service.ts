"use client"

import {
  getExportData as gqlGetExportData,
  getExportCSV as gqlGetExportCSV,
} from "./graphql-client"
import type { ExportDataResult } from "./graphql-types"

export async function fetchExportData(
  babyId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<ExportDataResult> {
  return gqlGetExportData(babyId, dateFrom, dateTo)
}

export async function fetchExportCSV(
  babyId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<string> {
  return gqlGetExportCSV(babyId, dateFrom, dateTo)
}
