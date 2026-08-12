<script setup lang="ts">
import { computed } from 'vue';
import {
  OfxLocationCharacteristicsFilter,
  OfxLocationsFilter,
  OfxMaterialCharacteristicsFilter,
  OfxMaterialsFilter,
  OfxOperationFilters,
} from '@opsfactor/front-shell';
import { communityNamedOptionLabel } from '@/services/community-option-catalog.service';
import type {
  MaterialLocationScope,
  MaterialLocationScopeCatalog,
} from './material-location-scope.types';

const props = withDefaults(defineProps<{
  catalog: MaterialLocationScopeCatalog;
  title?: string;
  description?: string;
}>(), {
  title: 'Material and location scope',
  description: 'Use public master-data characteristics to restrict the initial selection.',
});

const model = defineModel<MaterialLocationScope>({ required: true });
const materialOptions = computed(() => props.catalog.materials
  .filter((material) => material.active !== false)
  .map((material) => ({ value: material.id, label: communityNamedOptionLabel(material) })));
const locationOptions = computed(() => props.catalog.locations
  .filter((location) => location.active !== false)
  .map((location) => ({ value: location.id, label: communityNamedOptionLabel(location) })));

/** Emits a fresh canonical scope so consumers never depend on nested mutation. */
function updateScope(patch: Partial<MaterialLocationScope>): void {

  model.value = { ...model.value, ...patch };

}

function updateMaterialCharacteristic(characteristicId: string, values: string[]): void {

  updateScope({
    valuesByMaterialCharacteristicId: {
      ...model.value.valuesByMaterialCharacteristicId,
      [characteristicId]: values,
    },
  });

}

function updateLocationCharacteristic(characteristicId: string, values: string[]): void {

  updateScope({
    valuesByLocationCharacteristicId: {
      ...model.value.valuesByLocationCharacteristicId,
      [characteristicId]: values,
    },
  });

}
</script>

<template>
  <OfxOperationFilters
    :title="title"
    :description="description"
    :show-date="false"
    :show-custom-selectors="false"
    :slot-order="['locations', 'location-characteristics', 'materials', 'material-characteristics']"
  >
    <template #locations>
      <OfxLocationsFilter
        :model-value="model.locationIds"
        :options="locationOptions"
        placeholder="All active locations"
        @update:model-value="updateScope({ locationIds: $event })"
      />
    </template>

    <template #location-characteristics>
      <OfxLocationCharacteristicsFilter
        v-for="characteristic in catalog.locationCharacteristics"
        :key="characteristic.caracteristicaId"
        :model-value="model.valuesByLocationCharacteristicId[characteristic.caracteristicaId] ?? []"
        :label="characteristic.descricao"
        :options="characteristic.listaAtributos.map((value) => ({ value, label: value }))"
        placeholder="All values"
        @update:model-value="updateLocationCharacteristic(characteristic.caracteristicaId, $event)"
      />
    </template>

    <template #materials>
      <OfxMaterialsFilter
        :model-value="model.materialIds"
        :options="materialOptions"
        placeholder="All active materials"
        @update:model-value="updateScope({ materialIds: $event })"
      />
    </template>

    <template #material-characteristics>
      <OfxMaterialCharacteristicsFilter
        v-for="characteristic in catalog.materialCharacteristics"
        :key="characteristic.caracteristicaId"
        :model-value="model.valuesByMaterialCharacteristicId[characteristic.caracteristicaId] ?? []"
        :label="characteristic.descricao"
        :options="characteristic.listaAtributos.map((value) => ({ value, label: value }))"
        placeholder="All values"
        @update:model-value="updateMaterialCharacteristic(characteristic.caracteristicaId, $event)"
      />
    </template>
  </OfxOperationFilters>
</template>
