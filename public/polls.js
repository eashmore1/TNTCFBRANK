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
    // The AP preseason poll drops closer to kickoff — add it here when it does.
    pending: 'The AP preseason Top 25 is due at noon ET on Aug 17, 2026.',
    weeks: {},
  },
};

const NATIONAL_POLL_ORDER = ['coaches', 'ap'];
