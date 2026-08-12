/** Canonical public scope forwarded by Community analysis screens. */
export interface MaterialLocationScope {
  materialIds: string[];
  locationIds: string[];
  valuesByMaterialCharacteristicId: Record<string, string[]>;
  valuesByLocationCharacteristicId: Record<string, string[]>;
}

/** Public categorical characteristic returned by the master-data catalog. */
export interface MaterialLocationScopeCharacteristic {
  caracteristicaId: string;
  descricao: string;
  listaAtributos: string[];
}

/** All option catalogs required to render the shared scope component. */
export interface MaterialLocationScopeCatalog {
  materials: Array<{ id: string; description?: string | null; active?: boolean | null }>;
  locations: Array<{ id: string; description?: string | null; active?: boolean | null }>;
  materialCharacteristics: MaterialLocationScopeCharacteristic[];
  locationCharacteristics: MaterialLocationScopeCharacteristic[];
}

/** Creates an unrestricted scope; empty selections mean every active candidate. */
export function createEmptyMaterialLocationScope(
  catalog?: Pick<MaterialLocationScopeCatalog, 'materialCharacteristics' | 'locationCharacteristics'>,
): MaterialLocationScope {

  return {
    materialIds: [],
    locationIds: [],
    valuesByMaterialCharacteristicId: Object.fromEntries(
      (catalog?.materialCharacteristics ?? []).map((characteristic) => [characteristic.caracteristicaId, []]),
    ),
    valuesByLocationCharacteristicId: Object.fromEntries(
      (catalog?.locationCharacteristics ?? []).map((characteristic) => [characteristic.caracteristicaId, []]),
    ),
  };

}
