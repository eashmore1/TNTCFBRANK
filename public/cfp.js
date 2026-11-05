/* ============================================================
   The College Football Playoff selection committee's weekly Top 25 —
   hand-entered, same spirit as polls.js. Unlike the AP and Coaches
   polls, the committee doesn't publish points or vote totals, just an
   ordered Top 25, so each week is just a plain list of team ids.

   To add a week, drop a new entry under `weeks` keyed by the exact
   week name used in the app ('Week 10', 'Week 11', ..., 'Bowls / Final'):

     'Week 10': {
       released: 'Nov 4, 2026',
       teams: ['team-id', 'team-id', ...],   // ordered 1st to 25th
     }

   Team ids are the ones in teams.js. A week with no entry renders as
   "not released yet" — the committee's first ranking of the season
   comes out on a Tuesday in early November.
   ============================================================ */

const CFP_RANKINGS = {
  weeks: {
    'Week 10': {
      released: 'Nov 3, 2026',
      teams: [
        'miami',
        'georgia',
        'utah',
        'indiana',
        'alabama',
        'kentucky',
        'texas',
        'ucla',
        'byu',
        'ole-miss',
        'notre-dame',
        'ohio-state',
        'tennessee',
        'lsu',
        'texas-tech',
        'wake-forest',
        'houston',
        'missouri',
        'iowa',
        'usc',
        'south-carolina',
        'arizona',
        'oregon',
        'florida',
        'boise-state',
      ],
    },
  },
};
