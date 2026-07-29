import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPublicRankingHref,
  firstSearchParam,
  parsePublicRankingFilters,
  resolvePublicRankingRoute,
} from './publicRankingRoute.ts';

test('traduce todos los parametros espanoles validos al modelo interno', () => {
  const cases = [
    ['espectadores', 'ultimo-live', 'viewers', 'last_live'],
    ['espectadores', '7-dias', 'viewers', '7_days'],
    ['regalos', '28-dias', 'gifts', '28_days'],
    ['regalos', '60-dias', 'gifts', '60_days'],
  ] as const;

  for (const [metrica, periodo, metric, period] of cases) {
    assert.deepEqual(parsePublicRankingFilters({ metrica, periodo }), {
      metric,
      period,
      metrica,
      periodo,
    });
    assert.equal(
      buildPublicRankingHref({ metric, period }),
      metric === 'viewers' && period === 'last_live'
        ? '/clasificaciones'
        : `/clasificaciones?metrica=${metrica}&periodo=${periodo}`,
    );
  }
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
  assert.equal(buildPublicRankingHref(normalized), '/clasificaciones');
});

test('toma el primer valor cuando un search param llega repetido', () => {
  assert.equal(firstSearchParam(['regalos', 'espectadores']), 'regalos');
  assert.equal(firstSearchParam('7-dias'), '7-dias');
  assert.equal(firstSearchParam(undefined), undefined);
});

test('mantiene la canonical sin query y normaliza las demas entradas', () => {
  assert.equal(resolvePublicRankingRoute({}).redirectHref, null);
  assert.equal(
    resolvePublicRankingRoute({ metrica: 'espectadores', periodo: 'ultimo-live' }).redirectHref,
    '/clasificaciones',
  );
  assert.equal(
    resolvePublicRankingRoute({ metrica: 'invalida', periodo: '999-dias' }).redirectHref,
    '/clasificaciones',
  );
  assert.equal(
    resolvePublicRankingRoute({ metrica: ['regalos', 'espectadores'], periodo: '7-dias' }).redirectHref,
    '/clasificaciones?metrica=regalos&periodo=7-dias',
  );
  assert.equal(
    resolvePublicRankingRoute({ metrica: 'regalos', periodo: '7-dias' }).redirectHref,
    null,
  );
});
