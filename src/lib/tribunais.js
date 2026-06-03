export const TRIBUNAIS_MASTER = [
  {
    key: 'tj',
    abbr: 'TJ',
    label: 'Tribunais de Justiça Estaduais',
    items: [
      'TJAC','TJAL','TJAP','TJAM','TJBA','TJCE','TJDF','TJES',
      'TJGO','TJMA','TJMT','TJMS','TJMG','TJPA','TJPB','TJPR',
      'TJPE','TJPI','TJRJ','TJRN','TJRS','TJRO','TJRR','TJSC',
      'TJSP','TJSE','TJTO',
    ],
  },
  {
    key: 'trf',
    abbr: 'TRF',
    label: 'Tribunais Regionais Federais',
    items: ['TRF1','TRF2','TRF3','TRF4','TRF5','TRF6'],
  },
  {
    key: 'trt',
    abbr: 'TRT',
    label: 'Tribunais Regionais do Trabalho',
    items: [
      'TRT1','TRT2','TRT3','TRT4','TRT5','TRT6','TRT7','TRT8',
      'TRT9','TRT10','TRT11','TRT12','TRT13','TRT14','TRT15',
      'TRT16','TRT17','TRT18','TRT19','TRT20','TRT21','TRT22',
      'TRT23','TRT24',
    ],
  },
  {
    key: 'tre',
    abbr: 'TRE',
    label: 'Tribunais Regionais Eleitorais',
    items: [
      'TREAC','TREAL','TREAP','TREAM','TREBA','TRECE','TREDF',
      'TREES','TREGO','TREMA','TREMT','TREMS','TREMG','TREPA',
      'TREPB','TREPR','TREPE','TREPI','TRERJ','TRERN','TRERS',
      'TRERO','TRERR','TRESC','TRESP','TRESE','TRETO',
    ],
  },
  {
    key: 'militares',
    abbr: 'Mil.',
    label: 'Tribunais Militares',
    items: ['TJMMG','TJMRS','TJMSP','STM'],
  },
  {
    key: 'superiores',
    abbr: 'Sup.',
    label: 'Tribunais Superiores',
    items: ['STF','STJ','TST','TSE','STM'],
  },
]

export const ALL_GROUP_KEYS = TRIBUNAIS_MASTER.map(g => g.key)

export function getActiveGroups(activeGroupKeys) {
  const keys = activeGroupKeys ?? ALL_GROUP_KEYS
  return TRIBUNAIS_MASTER.filter(g => keys.includes(g.key))
}
