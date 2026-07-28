import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPublicRankingHref,
  firstSearchParam,
  parsePublicRankingFilters,
} from './publicRankingRoute.ts';

test('traduce parametros espanoles validos al modelo interno', () => {
  assert.deepEqual(
    parsePublicRankingFilters({ metrica: 'regalos', periodo: '28-dias' }),
    {
      metric: 'gifts',
      period: '28_days',
      metrica: 'regalos',
      periodo: '28-dias',
    },
  );
});

test('usa valores predeterminados seguros cuando faltan parametros', () => {
  assert.deepEqual(parsePublicRankingFilters({}), {
    metric: 'viewers',
    period: 'last_live',
    metrica: 'espectadores',
    periodo: 'ultimo-live',
  });
});

test('normaliza valores invalidos a la URL publica coherente', () => {
  const normalized = parsePublicRankingFilters({
    metrica: 'desconocida',
    periodo: '999-dias',
  });

  assert.equal(normalized.metric, 'viewers');
  assert.equal(normalized.period, 'last_live');
  assert.equal(buildPublicRankingHref(normalized), '/clasificaciones?metrica=espectadores&periodo=ultimo-live');
});

test('toma el primer valor cuando un search param llega repetido', () => {
  assert.equal(firstSearchParam(['regalos', 'espectadores']), 'regalos');
  assert.equal(firstSearchParam('7-dias'), '7-dias');
  assert.equal(firstSearchParam(undefined), undefined);
});
