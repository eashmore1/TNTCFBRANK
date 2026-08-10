/* ============================================================
   Preseason Heisman board for 2026, in odds order.

   Hand-entered from a single published snapshot so the whole list is
   internally consistent (mixing books gives you two players "tied" at
   different prices). Odds are the fractional line converted to American.

   `team` is only filled in where the player's 2026 team was actually
   confirmed — the transfer portal makes guessing a good way to put the wrong
   helmet next to someone's name. Anyone without one just shows as a name, and
   filling the rest in is a one-word edit:

     { id: 'dylan-raiola', name: 'Dylan Raiola', team: 'nebraska', odds: '+3300' }

   Team ids come from teams.js. `pos` is likewise only set where it was
   confirmed.
   ============================================================ */

const HEISMAN_ODDS = [
  { id: 'arch-manning', name: 'Arch Manning', team: 'texas', pos: 'QB', odds: '+600' },
  { id: 'trinidad-chambliss', name: 'Trinidad Chambliss', team: 'ole-miss', pos: 'QB', odds: '+650' },
  { id: 'cj-carr', name: 'CJ Carr', team: 'notre-dame', pos: 'QB', odds: '+750' },
  { id: 'dante-moore', name: 'Dante Moore', team: 'oregon', pos: 'QB', odds: '+1000' },
  { id: 'josh-hoover', name: 'Josh Hoover', team: 'tcu', pos: 'QB', odds: '+1000' },
  { id: 'julian-sayin', name: 'Julian Sayin', team: 'ohio-state', pos: 'QB', odds: '+1200' },
  { id: 'sam-leavitt', name: 'Sam Leavitt', team: 'lsu', pos: 'QB', odds: '+1300' },
  { id: 'jayden-maiava', name: 'Jayden Maiava', team: 'usc', pos: 'QB', odds: '+1400' },
  { id: 'jeremiah-smith', name: 'Jeremiah Smith', team: 'ohio-state', pos: 'WR', odds: '+1400' },
  { id: 'darian-mensah', name: 'Darian Mensah', team: 'duke', pos: 'QB', odds: '+1500' },
  { id: 'john-mateer', name: 'John Mateer', team: 'oklahoma', pos: 'QB', odds: '+1600' },
  { id: 'gunner-stockton', name: 'Gunner Stockton', team: 'georgia', pos: 'QB', odds: '+1800' },
  { id: 'lanorris-sellers', name: 'LaNorris Sellers', team: 'south-carolina', pos: 'QB', odds: '+1800' },
  { id: 'malachi-toney', name: 'Malachi Toney', team: 'miami', pos: 'WR', odds: '+2200' },
  { id: 'brendan-sorsby', name: 'Brendan Sorsby', pos: 'QB', odds: '+2500' },
  { id: 'bryce-underwood', name: 'Bryce Underwood', team: 'michigan', pos: 'QB', odds: '+2500' },
  { id: 'marcel-reed', name: 'Marcel Reed', team: 'texas-am', pos: 'QB', odds: '+2500' },
  { id: 'byrum-brown', name: 'Byrum Brown', team: 'auburn', odds: '+2800' },
  { id: 'dylan-raiola', name: 'Dylan Raiola', odds: '+3300' },
  { id: 'devon-dampier', name: 'Devon Dampier', team: 'utah', odds: '+4000' },
  { id: 'austin-mack', name: 'Austin Mack', team: 'alabama', odds: '+5000' },
  { id: 'demond-williams', name: 'Demond Williams Jr.', team: 'washington', odds: '+5000' },
  { id: 'keelon-russell', name: 'Keelon Russell', team: 'alabama', odds: '+5000' },
  { id: 'aaron-philo', name: 'Aaron Philo', team: 'florida', odds: '+5500' },
  { id: 'austin-simmons', name: 'Austin Simmons', odds: '+6000' },
  { id: 'rocco-becht', name: 'Rocco Becht', team: 'penn-state', odds: '+6000' },
  { id: 'bear-bachmeier', name: 'Bear Bachmeier', odds: '+6600' },
  { id: 'drew-mestemaker', name: 'Drew Mestemaker', odds: '+6600' },
  { id: 'kevin-jennings', name: 'Kevin Jennings', odds: '+6600' },
  { id: 'kewan-lacy', name: 'Kewan Lacy', odds: '+6600' },
  { id: 'lincoln-kienholz', name: 'Lincoln Kienholz', odds: '+6600' },
  { id: 'nico-iamaleava', name: 'Nico Iamaleava', odds: '+6600' },
  { id: 'christopher-vizzina', name: 'Christopher Vizzina', odds: '+7500' },
  { id: 'bo-jackson', name: 'Bo Jackson', odds: '+8000' },
  { id: 'ahmad-hardy', name: 'Ahmad Hardy', odds: '+10000' },
  { id: 'avery-johnson', name: 'Avery Johnson', odds: '+10000' },
  { id: 'cj-bailey', name: 'CJ Bailey', odds: '+10000' },
  { id: 'jaron-keawe-sagapolutele', name: 'Jaron-Keawe Sagapolutele', odds: '+10000' },
  { id: 'noah-fifita', name: 'Noah Fifita', odds: '+10000' },
  { id: 'kenny-minchey', name: 'Kenny Minchey', odds: '+12500' },
  { id: 'anthony-colandrea', name: 'Anthony Colandrea', odds: '+15000' },
  { id: 'cam-coleman', name: 'Cam Coleman', odds: '+15000' },
  { id: 'connor-weigman', name: 'Connor Weigman', odds: '+15000' },
  { id: 'cutter-boley', name: 'Cutter Boley', odds: '+15000' },
  { id: 'kamario-taylor', name: 'Kamario Taylor', odds: '+15000' },
  { id: 'nick-marsh', name: 'Nick Marsh', odds: '+15000' },
  { id: 'alonza-barnett', name: 'Alonza Barnett', odds: '+17500' },
  { id: 'beau-pribula', name: 'Beau Pribula', odds: '+17500' },
  { id: 'cameron-dickey', name: 'Cameron Dickey', odds: '+17500' },
];

const HEISMAN_MAP = Object.fromEntries(HEISMAN_ODDS.map((p) => [p.id, p]));
