/* ============================================================
   National polls — the AP Top 25 and the US LBM Coaches Poll.

   These aren't computed from anybody's ballot; they're the real polls,
   typed in by hand. To add a week, drop a new entry under `weeks` keyed by
   the exact week name used in the app ('Preseason', 'Week 1', ... ,
   'Bowls / Final'):

     'Week 1': {
       released: 'Sep 1, 2026',
       voters: 72,
       teams: [
         ['team-id', points, firstPlaceVotes],   // votes may be omitted
         ...
       ],
       others: [['team-id', points], ...],       // optional
     }

   Team ids are the ones in teams.js. A week with no entry renders as
   "not released yet", which is exactly what the AP poll looks like now.
   ============================================================ */

const NATIONAL_POLLS = {
  coaches: {
    id: 'coaches',
    name: 'Coaches Poll',
    full: 'US LBM Coaches Poll',
    blurb: 'Voted on by a panel of FBS head coaches (USA Today).',
    weeks: {
      Preseason: {
        released: 'Aug 4, 2026',
        voters: 72,
        teams: [
          ['ohio-state', 1741, 38],
          ['oregon', 1637, 6],
          ['georgia', 1591, 7],
          ['texas', 1544, 2],
          ['notre-dame', 1524, 5],
          ['indiana', 1522, 14],
          ['miami', 1409],
          ['texas-am', 1174],
          ['oklahoma', 1104],
          ['ole-miss', 1096],
          ['alabama', 1050],
          ['texas-tech', 1034],
          ['lsu', 951],
          ['usc', 838],
          ['byu', 781],
          ['michigan', 719],
          ['penn-state', 463],
          ['tennessee', 428],
          ['washington', 406],
          ['smu', 378],
          ['utah', 313],
          ['iowa', 291],
          ['clemson', 235],
          ['houston', 194],
          ['missouri', 158],
        ],
      },
    },
  },

  ap: {
    id: 'ap',
    name: 'AP Top 25',
    full: 'Associated Press Top 25',
    blurb: 'Voted on by a national panel of sportswriters and broadcasters.',
    weeks: {
      Preseason: {
        released: 'Aug 17, 2026',
        voters: 69,
        teams: [
          ['ohio-state',  1672, 40],
          ['oregon',      1597, 14],
          ['georgia',     1513],
          ['notre-dame',  1510, 6],
          ['texas',       1483],
          ['indiana',     1440, 8],
          ['miami',       1379, 1],
          ['texas-am',    1131],
          ['ole-miss',    1102],
          ['oklahoma',    1047],
          ['lsu',          988],
          ['texas-tech',   983],
          ['alabama',      904],
          ['usc',          839],
          ['byu',          839],
          ['michigan',     718],
          ['washington',   501],
          ['penn-state',   482],
          ['smu',          434],
          ['tennessee',    394],
          ['utah',         304],
          ['iowa',         260],
          ['houston',      252],
          ['louisville',   194],
          ['missouri',     117],
        ],
      },
      'Week 1': {
        released: 'Sep 7, 2026',
        voters: 69,
        teams: [
          ['ohio-state',   1684, 46],
          ['georgia',      1532],
          ['notre-dame',   1512, 4],
          ['texas',        1462, 2],
          ['indiana',      1428, 8],
          ['oregon',       1422, 3],
          ['miami',        1405, 1],
          ['lsu',          1315, 5],
          ['ole-miss',     1154],
          ['texas-am',     1079],
          ['oklahoma',     1039],
          ['alabama',       910],
          ['texas-tech',    900],
          ['usc',           861],
          ['byu',           840],
          ['penn-state',    621],
          ['smu',           501],
          ['tennessee',     491],
          ['washington',    489],
          ['utah',          381],
          ['iowa',          369],
          ['houston',       214],
          ['missouri',      182],
          ['louisville',    163],
          ['virginia',       89],
        ],
        others: [
          ['boise-state', 86],
          ['florida', 83],
          ['michigan', 69],
          ['arizona', 33],
          ['memphis', 23],
          ['south-carolina', 19],
          ['western-michigan', 12],
          ['pittsburgh', 11],
          ['navy', 10],
          ['ucla', 7],
          ['virginia-tech', 6],
          ['illinois', 6],
          ['james-madison', 4],
          ['minnesota', 4],
          ['colorado', 3],
          ['auburn', 2],
          ['arizona-state', 2],
          ['vanderbilt', 2],
        ],
      },
    },
  },
};

const NATIONAL_POLL_ORDER = ['coaches', 'ap'];
