import assert from 'node:assert/strict';
import test from 'node:test';
import { crmKeyForProduct, normalizeProductInterest } from '../server/utils/products.js';

test('normaliza aliases de producto', () => {
  assert.equal(normalizeProductInterest('Neurotraumas'), 'neurotrauma');
  assert.equal(normalizeProductInterest('HOLOGRAFICA'), 'holograficas');
  assert.equal(normalizeProductInterest('ambos_productos'), 'ambos');
});

test('recupera el producto desde el crm_key historico', () => {
  assert.equal(normalizeProductInterest('', 'neurotraumas'), 'neurotrauma');
  assert.equal(normalizeProductInterest('', 'holograficas'), 'holograficas');
  assert.equal(normalizeProductInterest('', ''), 'sin_definir');
});

test('mantiene compatibilidad con el chatbot por crm_key', () => {
  assert.equal(crmKeyForProduct('neurotrauma'), 'neurotraumas');
  assert.equal(crmKeyForProduct('holograficas'), 'holograficas');
});
