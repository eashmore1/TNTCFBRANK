// Full FBS team database (2026 alignment, 136 teams). Colors drive the SVG helmets:
//   shell = helmet color, stripe = center stripe, mask = facemask, decal = letters on the side.
// conf is used for the pool filter chips.
const TEAMS = [
  // ==== SEC (16) ====
  { id: 'alabama',        school: 'Alabama',            mascot: 'Crimson Tide',     conf: 'SEC', shell: '#9E1B32', stripe: '#FFFFFF', mask: '#75787B', decal: '#FFFFFF', abbr: 'A' },
  { id: 'arkansas',       school: 'Arkansas',           mascot: 'Razorbacks',       conf: 'SEC', shell: '#9D2235', stripe: '#FFFFFF', mask: '#9D2235', decal: '#FFFFFF', abbr: 'A' },
  { id: 'auburn',         school: 'Auburn',             mascot: 'Tigers',           conf: 'SEC', shell: '#FFFFFF', stripe: '#0C2340', mask: '#0C2340', decal: '#0C2340', abbr: 'AU' },
  { id: 'florida',        school: 'Florida',            mascot: 'Gators',           conf: 'SEC', shell: '#0021A5', stripe: '#FA4616', mask: '#FA4616', decal: '#FA4616', abbr: 'F' },
  { id: 'georgia',        school: 'Georgia',            mascot: 'Bulldogs',         conf: 'SEC', shell: '#BA0C2F', stripe: '#000000', mask: '#BA0C2F', decal: '#FFFFFF', abbr: 'G' },
  { id: 'kentucky',       school: 'Kentucky',           mascot: 'Wildcats',         conf: 'SEC', shell: '#0033A0', stripe: '#FFFFFF', mask: '#FFFFFF', decal: '#FFFFFF', abbr: 'UK' },
  { id: 'lsu',            school: 'LSU',                mascot: 'Tigers',           conf: 'SEC', shell: '#FDD023', stripe: '#461D7C', mask: '#FDD023', decal: '#461D7C', abbr: 'LSU' },
  { id: 'miss-state',     school: 'Mississippi State',  mascot: 'Bulldogs',         conf: 'SEC', shell: '#660000', stripe: '#FFFFFF', mask: '#660000', decal: '#FFFFFF', abbr: 'MS' },
  { id: 'missouri',       school: 'Missouri',           mascot: 'Tigers',           conf: 'SEC', shell: '#000000', stripe: '#F1B82D', mask: '#000000', decal: '#F1B82D', abbr: 'M' },
  { id: 'oklahoma',       school: 'Oklahoma',           mascot: 'Sooners',          conf: 'SEC', shell: '#841617', stripe: '#FDF9D8', mask: '#841617', decal: '#FDF9D8', abbr: 'OU' },
  { id: 'ole-miss',       school: 'Ole Miss',           mascot: 'Rebels',           conf: 'SEC', shell: '#14213D', stripe: '#CE1126', mask: '#B1B3B3', decal: '#FFFFFF', abbr: 'OM' },
  { id: 'south-carolina', school: 'South Carolina',     mascot: 'Gamecocks',        conf: 'SEC', shell: '#73000A', stripe: '#000000', mask: '#000000', decal: '#FFFFFF', abbr: 'SC' },
  { id: 'tennessee',      school: 'Tennessee',          mascot: 'Volunteers',       conf: 'SEC', shell: '#FFFFFF', stripe: '#FF8200', mask: '#75787B', decal: '#FF8200', abbr: 'T' },
  { id: 'texas',          school: 'Texas',              mascot: 'Longhorns',        conf: 'SEC', shell: '#FFFFFF', stripe: '#FFFFFF', mask: '#BF5700', decal: '#BF5700', abbr: 'UT' },
  { id: 'texas-am',       school: 'Texas A&M',          mascot: 'Aggies',           conf: 'SEC', shell: '#500000', stripe: '#FFFFFF', mask: '#500000', decal: '#FFFFFF', abbr: 'ATM' },
  { id: 'vanderbilt',     school: 'Vanderbilt',         mascot: 'Commodores',       conf: 'SEC', shell: '#000000', stripe: '#A8996E', mask: '#000000', decal: '#A8996E', abbr: 'V' },

  // ==== Big Ten (18) ====
  { id: 'illinois',       school: 'Illinois',           mascot: 'Fighting Illini',  conf: 'Big Ten', shell: '#E84A27', stripe: '#13294B', mask: '#13294B', decal: '#FFFFFF', abbr: 'I' },
  { id: 'indiana',        school: 'Indiana',            mascot: 'Hoosiers',         conf: 'Big Ten', shell: '#7D110C', stripe: '#FFFFFF', mask: '#7D110C', decal: '#FFFFFF', abbr: 'IU' },
  { id: 'iowa',           school: 'Iowa',               mascot: 'Hawkeyes',         conf: 'Big Ten', shell: '#000000', stripe: '#FFCD00', mask: '#FFCD00', decal: '#FFCD00', abbr: 'I' },
  { id: 'maryland',       school: 'Maryland',           mascot: 'Terrapins',        conf: 'Big Ten', shell: '#E03A3E', stripe: '#FFD520', mask: '#000000', decal: '#FFFFFF', abbr: 'M' },
  { id: 'michigan',       school: 'Michigan',           mascot: 'Wolverines',       conf: 'Big Ten', shell: '#00274C', stripe: '#FFCB05', mask: '#00274C', decal: '#FFCB05', abbr: 'M' },
  { id: 'michigan-state', school: 'Michigan State',     mascot: 'Spartans',         conf: 'Big Ten', shell: '#18453B', stripe: '#FFFFFF', mask: '#18453B', decal: '#FFFFFF', abbr: 'S' },
  { id: 'minnesota',      school: 'Minnesota',          mascot: 'Golden Gophers',   conf: 'Big Ten', shell: '#7A0019', stripe: '#FFCC33', mask: '#FFCC33', decal: '#FFCC33', abbr: 'M' },
  { id: 'nebraska',       school: 'Nebraska',           mascot: 'Cornhuskers',      conf: 'Big Ten', shell: '#FFFFFF', stripe: '#E41C38', mask: '#E41C38', decal: '#E41C38', abbr: 'N' },
  { id: 'northwestern',   school: 'Northwestern',       mascot: 'Wildcats',         conf: 'Big Ten', shell: '#4E2A84', stripe: '#FFFFFF', mask: '#4E2A84', decal: '#FFFFFF', abbr: 'N' },
  { id: 'ohio-state',     school: 'Ohio State',         mascot: 'Buckeyes',         conf: 'Big Ten', shell: '#C6C8CA', stripe: '#BB0000', mask: '#75787B', decal: '#BB0000', abbr: 'O' },
  { id: 'oregon',         school: 'Oregon',             mascot: 'Ducks',            conf: 'Big Ten', shell: '#154733', stripe: '#FEE123', mask: '#FEE123', decal: '#FEE123', abbr: 'O' },
  { id: 'penn-state',     school: 'Penn State',         mascot: 'Nittany Lions',    conf: 'Big Ten', shell: '#FFFFFF', stripe: '#041E42', mask: '#75787B', decal: '#041E42', abbr: 'PS' },
  { id: 'purdue',         school: 'Purdue',             mascot: 'Boilermakers',     conf: 'Big Ten', shell: '#B1946C', stripe: '#000000', mask: '#000000', decal: '#000000', abbr: 'P' },
  { id: 'rutgers',        school: 'Rutgers',            mascot: 'Scarlet Knights',  conf: 'Big Ten', shell: '#CC0033', stripe: '#FFFFFF', mask: '#CC0033', decal: '#FFFFFF', abbr: 'R' },
  { id: 'ucla',           school: 'UCLA',               mascot: 'Bruins',           conf: 'Big Ten', shell: '#2D68C4', stripe: '#F2A900', mask: '#2D68C4', decal: '#F2A900', abbr: 'U' },
  { id: 'usc',            school: 'USC',                mascot: 'Trojans',          conf: 'Big Ten', shell: '#990000', stripe: '#FFCC00', mask: '#990000', decal: '#FFCC00', abbr: 'SC' },
  { id: 'washington',     school: 'Washington',         mascot: 'Huskies',          conf: 'Big Ten', shell: '#4B2E83', stripe: '#B7A57A', mask: '#B7A57A', decal: '#B7A57A', abbr: 'W' },
  { id: 'wisconsin',      school: 'Wisconsin',          mascot: 'Badgers',          conf: 'Big Ten', shell: '#FFFFFF', stripe: '#C5050C', mask: '#C5050C', decal: '#C5050C', abbr: 'W' },

  // ==== Big 12 (16) ====
  { id: 'arizona',        school: 'Arizona',            mascot: 'Wildcats',         conf: 'Big 12', shell: '#0C234B', stripe: '#AB0520', mask: '#0C234B', decal: '#AB0520', abbr: 'A' },
  { id: 'arizona-state',  school: 'Arizona State',      mascot: 'Sun Devils',       conf: 'Big 12', shell: '#8C1D40', stripe: '#FFC627', mask: '#8C1D40', decal: '#FFC627', abbr: 'AS' },
  { id: 'baylor',         school: 'Baylor',             mascot: 'Bears',            conf: 'Big 12', shell: '#154734', stripe: '#FFB81C', mask: '#154734', decal: '#FFB81C', abbr: 'BU' },
  { id: 'byu',            school: 'BYU',                mascot: 'Cougars',          conf: 'Big 12', shell: '#003DA5', stripe: '#FFFFFF', mask: '#FFFFFF', decal: '#FFFFFF', abbr: 'Y' },
  { id: 'cincinnati',     school: 'Cincinnati',         mascot: 'Bearcats',         conf: 'Big 12', shell: '#000000', stripe: '#E00122', mask: '#E00122', decal: '#E00122', abbr: 'C' },
  { id: 'colorado',       school: 'Colorado',           mascot: 'Buffaloes',        conf: 'Big 12', shell: '#CFB87C', stripe: '#000000', mask: '#000000', decal: '#000000', abbr: 'CU' },
  { id: 'houston',        school: 'Houston',            mascot: 'Cougars',          conf: 'Big 12', shell: '#C8102E', stripe: '#FFFFFF', mask: '#C8102E', decal: '#FFFFFF', abbr: 'UH' },
  { id: 'iowa-state',     school: 'Iowa State',         mascot: 'Cyclones',         conf: 'Big 12', shell: '#C8102E', stripe: '#F1BE48', mask: '#C8102E', decal: '#F1BE48', abbr: 'IS' },
  { id: 'kansas',         school: 'Kansas',             mascot: 'Jayhawks',         conf: 'Big 12', shell: '#0051BA', stripe: '#E8000D', mask: '#FFFFFF', decal: '#E8000D', abbr: 'KU' },
  { id: 'kansas-state',   school: 'Kansas State',       mascot: 'Wildcats',         conf: 'Big 12', shell: '#512888', stripe: '#FFFFFF', mask: '#512888', decal: '#D1D1D1', abbr: 'KS' },
  { id: 'oklahoma-state', school: 'Oklahoma State',     mascot: 'Cowboys',          conf: 'Big 12', shell: '#FF7300', stripe: '#000000', mask: '#000000', decal: '#000000', abbr: 'OS' },
  { id: 'tcu',            school: 'TCU',                mascot: 'Horned Frogs',     conf: 'Big 12', shell: '#4D1979', stripe: '#FFFFFF', mask: '#4D1979', decal: '#FFFFFF', abbr: 'TCU' },
  { id: 'texas-tech',     school: 'Texas Tech',         mascot: 'Red Raiders',      conf: 'Big 12', shell: '#000000', stripe: '#CC0000', mask: '#CC0000', decal: '#FFFFFF', abbr: 'TT' },
  { id: 'ucf',            school: 'UCF',                mascot: 'Knights',          conf: 'Big 12', shell: '#000000', stripe: '#BA9B37', mask: '#BA9B37', decal: '#BA9B37', abbr: 'UCF' },
  { id: 'utah',           school: 'Utah',               mascot: 'Utes',             conf: 'Big 12', shell: '#CC0000', stripe: '#FFFFFF', mask: '#CC0000', decal: '#FFFFFF', abbr: 'U' },
  { id: 'west-virginia',  school: 'West Virginia',      mascot: 'Mountaineers',     conf: 'Big 12', shell: '#002855', stripe: '#EAAA00', mask: '#EAAA00', decal: '#EAAA00', abbr: 'WV' },

  // ==== ACC (17) ====
  { id: 'boston-college', school: 'Boston College',     mascot: 'Eagles',           conf: 'ACC', shell: '#8C2232', stripe: '#B29D6C', mask: '#8C2232', decal: '#B29D6C', abbr: 'BC' },
  { id: 'california',     school: 'California',         mascot: 'Golden Bears',     conf: 'ACC', shell: '#003262', stripe: '#FDB515', mask: '#003262', decal: '#FDB515', abbr: 'C' },
  { id: 'clemson',        school: 'Clemson',            mascot: 'Tigers',           conf: 'ACC', shell: '#FFFFFF', stripe: '#F56600', mask: '#75787B', decal: '#F56600', abbr: 'C' },
  { id: 'duke',           school: 'Duke',               mascot: 'Blue Devils',      conf: 'ACC', shell: '#FFFFFF', stripe: '#003087', mask: '#003087', decal: '#003087', abbr: 'D' },
  { id: 'florida-state',  school: 'Florida State',      mascot: 'Seminoles',        conf: 'ACC', shell: '#CEB888', stripe: '#782F40', mask: '#782F40', decal: '#782F40', abbr: 'FS' },
  { id: 'georgia-tech',   school: 'Georgia Tech',       mascot: 'Yellow Jackets',   conf: 'ACC', shell: '#B3A369', stripe: '#FFFFFF', mask: '#003057', decal: '#003057', abbr: 'GT' },
  { id: 'louisville',     school: 'Louisville',         mascot: 'Cardinals',        conf: 'ACC', shell: '#AD0000', stripe: '#000000', mask: '#AD0000', decal: '#FFFFFF', abbr: 'L' },
  { id: 'miami',          school: 'Miami',              mascot: 'Hurricanes',       conf: 'ACC', shell: '#FFFFFF', stripe: '#F47321', mask: '#F47321', decal: '#F47321', abbr: 'U' },
  { id: 'nc-state',       school: 'NC State',           mascot: 'Wolfpack',         conf: 'ACC', shell: '#CC0000', stripe: '#FFFFFF', mask: '#FFFFFF', decal: '#FFFFFF', abbr: 'S' },
  { id: 'north-carolina', school: 'North Carolina',     mascot: 'Tar Heels',        conf: 'ACC', shell: '#7BAFD4', stripe: '#FFFFFF', mask: '#7BAFD4', decal: '#FFFFFF', abbr: 'NC' },
  { id: 'pittsburgh',     school: 'Pittsburgh',         mascot: 'Panthers',         conf: 'ACC', shell: '#003594', stripe: '#FFB81C', mask: '#FFB81C', decal: '#FFB81C', abbr: 'P' },
  { id: 'smu',            school: 'SMU',                mascot: 'Mustangs',         conf: 'ACC', shell: '#C8102E', stripe: '#0033A0', mask: '#C8102E', decal: '#FFFFFF', abbr: 'SMU' },
  { id: 'stanford',       school: 'Stanford',           mascot: 'Cardinal',         conf: 'ACC', shell: '#8C1515', stripe: '#FFFFFF', mask: '#8C1515', decal: '#FFFFFF', abbr: 'S' },
  { id: 'syracuse',       school: 'Syracuse',           mascot: 'Orange',           conf: 'ACC', shell: '#D44500', stripe: '#0D1D37', mask: '#D44500', decal: '#FFFFFF', abbr: 'S' },
  { id: 'virginia',       school: 'Virginia',           mascot: 'Cavaliers',        conf: 'ACC', shell: '#232D4B', stripe: '#F84C1E', mask: '#F84C1E', decal: '#F84C1E', abbr: 'V' },
  { id: 'virginia-tech',  school: 'Virginia Tech',      mascot: 'Hokies',           conf: 'ACC', shell: '#630031', stripe: '#CF4420', mask: '#630031', decal: '#CF4420', abbr: 'VT' },
  { id: 'wake-forest',    school: 'Wake Forest',        mascot: 'Demon Deacons',    conf: 'ACC', shell: '#9E7E38', stripe: '#000000', mask: '#000000', decal: '#000000', abbr: 'WF' },

  // ==== American (14) ====
  { id: 'army',           school: 'Army',               mascot: 'Black Knights',    conf: 'American', shell: '#D4BF91', stripe: '#000000', mask: '#75787B', decal: '#000000', abbr: 'A' },
  { id: 'charlotte',      school: 'Charlotte',          mascot: '49ers',            conf: 'American', shell: '#005035', stripe: '#A49665', mask: '#005035', decal: '#B9975B', abbr: 'C' },
  { id: 'east-carolina',  school: 'East Carolina',      mascot: 'Pirates',          conf: 'American', shell: '#592A8A', stripe: '#FDC82F', mask: '#592A8A', decal: '#FDC82F', abbr: 'EC' },
  { id: 'fau',            school: 'Florida Atlantic',   mascot: 'Owls',             conf: 'American', shell: '#003366', stripe: '#CC0000', mask: '#003366', decal: '#CC0000', abbr: 'FAU' },
  { id: 'memphis',        school: 'Memphis',            mascot: 'Tigers',           conf: 'American', shell: '#003087', stripe: '#898D8D', mask: '#003087', decal: '#898D8D', abbr: 'M' },
  { id: 'navy',           school: 'Navy',               mascot: 'Midshipmen',       conf: 'American', shell: '#B4A76C', stripe: '#00205B', mask: '#00205B', decal: '#00205B', abbr: 'N' },
  { id: 'north-texas',    school: 'North Texas',        mascot: 'Mean Green',       conf: 'American', shell: '#00853E', stripe: '#FFFFFF', mask: '#00853E', decal: '#FFFFFF', abbr: 'NT' },
  { id: 'rice',           school: 'Rice',               mascot: 'Owls',             conf: 'American', shell: '#00205B', stripe: '#C1C6C8', mask: '#00205B', decal: '#FFFFFF', abbr: 'R' },
  { id: 'usf',            school: 'South Florida',      mascot: 'Bulls',            conf: 'American', shell: '#006747', stripe: '#CFC493', mask: '#006747', decal: '#CFC493', abbr: 'SF' },
  { id: 'temple',         school: 'Temple',             mascot: 'Owls',             conf: 'American', shell: '#9D2235', stripe: '#FFFFFF', mask: '#9D2235', decal: '#FFFFFF', abbr: 'T' },
  { id: 'tulane',         school: 'Tulane',             mascot: 'Green Wave',       conf: 'American', shell: '#006747', stripe: '#418FDE', mask: '#006747', decal: '#FFFFFF', abbr: 'TU' },
  { id: 'tulsa',          school: 'Tulsa',              mascot: 'Golden Hurricane', conf: 'American', shell: '#002D72', stripe: '#CFB53B', mask: '#002D72', decal: '#CFB53B', abbr: 'TU' },
  { id: 'uab',            school: 'UAB',                mascot: 'Blazers',          conf: 'American', shell: '#1E6B52', stripe: '#DAAA00', mask: '#1E6B52', decal: '#DAAA00', abbr: 'UAB' },
  { id: 'utsa',           school: 'UTSA',               mascot: 'Roadrunners',      conf: 'American', shell: '#0C2340', stripe: '#F15A22', mask: '#0C2340', decal: '#F15A22', abbr: 'UTSA' },

  // ==== Conference USA (11) ====
  { id: 'delaware',       school: 'Delaware',           mascot: 'Blue Hens',        conf: 'C-USA', shell: '#00539F', stripe: '#FFD200', mask: '#00539F', decal: '#FFD200', abbr: 'D' },
  { id: 'fiu',            school: 'FIU',                mascot: 'Panthers',         conf: 'C-USA', shell: '#081E3F', stripe: '#B6862C', mask: '#081E3F', decal: '#B6862C', abbr: 'FIU' },
  { id: 'jax-state',      school: 'Jacksonville State', mascot: 'Gamecocks',        conf: 'C-USA', shell: '#CC0000', stripe: '#FFFFFF', mask: '#CC0000', decal: '#FFFFFF', abbr: 'JSU' },
  { id: 'kennesaw-state', school: 'Kennesaw State',     mascot: 'Owls',             conf: 'C-USA', shell: '#000000', stripe: '#FDBB30', mask: '#000000', decal: '#FDBB30', abbr: 'KSU' },
  { id: 'liberty',        school: 'Liberty',            mascot: 'Flames',           conf: 'C-USA', shell: '#0A254E', stripe: '#A6192E', mask: '#0A254E', decal: '#FFFFFF', abbr: 'LU' },
  { id: 'louisiana-tech', school: 'Louisiana Tech',     mascot: 'Bulldogs',         conf: 'C-USA', shell: '#002F8B', stripe: '#E31B23', mask: '#002F8B', decal: '#FFFFFF', abbr: 'LT' },
  { id: 'middle-tenn',    school: 'Middle Tennessee',   mascot: 'Blue Raiders',     conf: 'C-USA', shell: '#0066CC', stripe: '#000000', mask: '#0066CC', decal: '#FFFFFF', abbr: 'MT' },
  { id: 'missouri-state', school: 'Missouri State',     mascot: 'Bears',            conf: 'C-USA', shell: '#5E0009', stripe: '#FFFFFF', mask: '#5E0009', decal: '#FFFFFF', abbr: 'MO' },
  { id: 'new-mexico-state', school: 'New Mexico State', mascot: 'Aggies',           conf: 'C-USA', shell: '#8C0B42', stripe: '#FFFFFF', mask: '#8C0B42', decal: '#FFFFFF', abbr: 'NMS' },
  { id: 'sam-houston',    school: 'Sam Houston',        mascot: 'Bearkats',         conf: 'C-USA', shell: '#F56423', stripe: '#FFFFFF', mask: '#F56423', decal: '#FFFFFF', abbr: 'SH' },
  { id: 'wku',            school: 'Western Kentucky',   mascot: 'Hilltoppers',      conf: 'C-USA', shell: '#B01E24', stripe: '#FFFFFF', mask: '#B01E24', decal: '#FFFFFF', abbr: 'WKU' },

  // ==== MAC (12) ====
  { id: 'akron',          school: 'Akron',              mascot: 'Zips',             conf: 'MAC', shell: '#041E42', stripe: '#A89968', mask: '#041E42', decal: '#A89968', abbr: 'Z' },
  { id: 'ball-state',     school: 'Ball State',         mascot: 'Cardinals',        conf: 'MAC', shell: '#BA0C2F', stripe: '#FFFFFF', mask: '#BA0C2F', decal: '#FFFFFF', abbr: 'BS' },
  { id: 'bowling-green',  school: 'Bowling Green',      mascot: 'Falcons',          conf: 'MAC', shell: '#4F2C1D', stripe: '#FE5000', mask: '#FE5000', decal: '#FE5000', abbr: 'BG' },
  { id: 'buffalo',        school: 'Buffalo',            mascot: 'Bulls',            conf: 'MAC', shell: '#005BBB', stripe: '#FFFFFF', mask: '#005BBB', decal: '#FFFFFF', abbr: 'UB' },
  { id: 'central-michigan', school: 'Central Michigan', mascot: 'Chippewas',        conf: 'MAC', shell: '#6A0032', stripe: '#FFC82E', mask: '#6A0032', decal: '#FFC82E', abbr: 'CM' },
  { id: 'eastern-michigan', school: 'Eastern Michigan', mascot: 'Eagles',           conf: 'MAC', shell: '#046A38', stripe: '#FFFFFF', mask: '#046A38', decal: '#FFFFFF', abbr: 'E' },
  { id: 'kent-state',     school: 'Kent State',         mascot: 'Golden Flashes',   conf: 'MAC', shell: '#002664', stripe: '#EAAB00', mask: '#002664', decal: '#EAAB00', abbr: 'K' },
  { id: 'miami-oh',       school: 'Miami (OH)',         mascot: 'RedHawks',         conf: 'MAC', shell: '#B61E2E', stripe: '#FFFFFF', mask: '#B61E2E', decal: '#FFFFFF', abbr: 'M' },
  { id: 'ohio',           school: 'Ohio',               mascot: 'Bobcats',          conf: 'MAC', shell: '#00694E', stripe: '#FFFFFF', mask: '#00694E', decal: '#FFFFFF', abbr: 'O' },
  { id: 'toledo',         school: 'Toledo',             mascot: 'Rockets',          conf: 'MAC', shell: '#15397F', stripe: '#FFD520', mask: '#15397F', decal: '#FFD520', abbr: 'T' },
  { id: 'umass',          school: 'UMass',              mascot: 'Minutemen',        conf: 'MAC', shell: '#881C1C', stripe: '#FFFFFF', mask: '#881C1C', decal: '#FFFFFF', abbr: 'UM' },
  { id: 'western-michigan', school: 'Western Michigan', mascot: 'Broncos',          conf: 'MAC', shell: '#532E1F', stripe: '#F1C500', mask: '#532E1F', decal: '#F1C500', abbr: 'W' },

  // ==== Mountain West (9) ====
  { id: 'air-force',      school: 'Air Force',          mascot: 'Falcons',          conf: 'MW', shell: '#0033A0', stripe: '#FFFFFF', mask: '#FFFFFF', decal: '#FFFFFF', abbr: 'AF' },
  { id: 'hawaii',         school: 'Hawaii',             mascot: 'Rainbow Warriors', conf: 'MW', shell: '#024731', stripe: '#FFFFFF', mask: '#024731', decal: '#FFFFFF', abbr: 'H' },
  { id: 'nevada',         school: 'Nevada',             mascot: 'Wolf Pack',        conf: 'MW', shell: '#003366', stripe: '#807F84', mask: '#003366', decal: '#FFFFFF', abbr: 'N' },
  { id: 'new-mexico',     school: 'New Mexico',         mascot: 'Lobos',            conf: 'MW', shell: '#BA0C2F', stripe: '#A7A8AA', mask: '#BA0C2F', decal: '#A7A8AA', abbr: 'NM' },
  { id: 'niu',            school: 'Northern Illinois',  mascot: 'Huskies',          conf: 'MW', shell: '#C8102E', stripe: '#000000', mask: '#000000', decal: '#FFFFFF', abbr: 'NIU' },
  { id: 'san-jose-state', school: 'San Jose State',     mascot: 'Spartans',         conf: 'MW', shell: '#0055A2', stripe: '#E5A823', mask: '#0055A2', decal: '#E5A823', abbr: 'SJ' },
  { id: 'unlv',           school: 'UNLV',               mascot: 'Rebels',           conf: 'MW', shell: '#CF0A2C', stripe: '#A7A8AA', mask: '#000000', decal: '#A7A8AA', abbr: 'U' },
  { id: 'utep',           school: 'UTEP',               mascot: 'Miners',           conf: 'MW', shell: '#041E42', stripe: '#FF8200', mask: '#041E42', decal: '#FF8200', abbr: 'UTEP' },
  { id: 'wyoming',        school: 'Wyoming',            mascot: 'Cowboys',          conf: 'MW', shell: '#492F24', stripe: '#FFC425', mask: '#492F24', decal: '#FFC425', abbr: 'WY' },

  // ==== Pac-12 (8) ====
  { id: 'boise-state',    school: 'Boise State',        mascot: 'Broncos',          conf: 'Pac-12', shell: '#0033A0', stripe: '#D64309', mask: '#0033A0', decal: '#D64309', abbr: 'B' },
  { id: 'colorado-state', school: 'Colorado State',     mascot: 'Rams',             conf: 'Pac-12', shell: '#1E4D2B', stripe: '#FFFFFF', mask: '#1E4D2B', decal: '#C8C372', abbr: 'CSU' },
  { id: 'fresno-state',   school: 'Fresno State',       mascot: 'Bulldogs',         conf: 'Pac-12', shell: '#DB0032', stripe: '#002E6D', mask: '#DB0032', decal: '#FFFFFF', abbr: 'F' },
  { id: 'oregon-state',   school: 'Oregon State',       mascot: 'Beavers',          conf: 'Pac-12', shell: '#000000', stripe: '#DC4405', mask: '#DC4405', decal: '#DC4405', abbr: 'OS' },
  { id: 'san-diego-state', school: 'San Diego State',   mascot: 'Aztecs',           conf: 'Pac-12', shell: '#000000', stripe: '#A6192E', mask: '#000000', decal: '#A6192E', abbr: 'SD' },
  { id: 'texas-state',    school: 'Texas State',        mascot: 'Bobcats',          conf: 'Pac-12', shell: '#501214', stripe: '#8D734A', mask: '#501214', decal: '#FFFFFF', abbr: 'TX' },
  { id: 'utah-state',     school: 'Utah State',         mascot: 'Aggies',           conf: 'Pac-12', shell: '#0F2439', stripe: '#FFFFFF', mask: '#0F2439', decal: '#FFFFFF', abbr: 'USU' },
  { id: 'washington-state', school: 'Washington State', mascot: 'Cougars',          conf: 'Pac-12', shell: '#981E32', stripe: '#5E6A71', mask: '#981E32', decal: '#FFFFFF', abbr: 'WS' },

  // ==== Sun Belt (13) ====
  { id: 'app-state',      school: 'Appalachian State',  mascot: 'Mountaineers',     conf: 'Sun Belt', shell: '#000000', stripe: '#FFCC00', mask: '#FFCC00', decal: '#FFCC00', abbr: 'A' },
  { id: 'arkansas-state', school: 'Arkansas State',     mascot: 'Red Wolves',       conf: 'Sun Belt', shell: '#CC092F', stripe: '#000000', mask: '#CC092F', decal: '#FFFFFF', abbr: 'AS' },
  { id: 'coastal',        school: 'Coastal Carolina',   mascot: 'Chanticleers',     conf: 'Sun Belt', shell: '#006F71', stripe: '#A27752', mask: '#006F71', decal: '#A27752', abbr: 'CC' },
  { id: 'georgia-southern', school: 'Georgia Southern', mascot: 'Eagles',           conf: 'Sun Belt', shell: '#011E41', stripe: '#87714D', mask: '#011E41', decal: '#87714D', abbr: 'GS' },
  { id: 'georgia-state',  school: 'Georgia State',      mascot: 'Panthers',         conf: 'Sun Belt', shell: '#0039A6', stripe: '#FFFFFF', mask: '#0039A6', decal: '#FFFFFF', abbr: 'GSU' },
  { id: 'james-madison',  school: 'James Madison',      mascot: 'Dukes',            conf: 'Sun Belt', shell: '#450084', stripe: '#CBB677', mask: '#450084', decal: '#CBB677', abbr: 'JM' },
  { id: 'louisiana',      school: 'Louisiana',          mascot: "Ragin' Cajuns",    conf: 'Sun Belt', shell: '#CE181E', stripe: '#FFFFFF', mask: '#CE181E', decal: '#FFFFFF', abbr: 'UL' },
  { id: 'marshall',       school: 'Marshall',           mascot: 'Thundering Herd',  conf: 'Sun Belt', shell: '#00B140', stripe: '#000000', mask: '#000000', decal: '#FFFFFF', abbr: 'M' },
  { id: 'old-dominion',   school: 'Old Dominion',       mascot: 'Monarchs',         conf: 'Sun Belt', shell: '#003057', stripe: '#7C878E', mask: '#003057', decal: '#FFFFFF', abbr: 'ODU' },
  { id: 'south-alabama',  school: 'South Alabama',      mascot: 'Jaguars',          conf: 'Sun Belt', shell: '#00205B', stripe: '#BF0D3E', mask: '#00205B', decal: '#FFFFFF', abbr: 'SA' },
  { id: 'southern-miss',  school: 'Southern Miss',      mascot: 'Golden Eagles',    conf: 'Sun Belt', shell: '#000000', stripe: '#FFAB00', mask: '#000000', decal: '#FFAB00', abbr: 'SM' },
  { id: 'troy',           school: 'Troy',               mascot: 'Trojans',          conf: 'Sun Belt', shell: '#98002E', stripe: '#C6C9CA', mask: '#98002E', decal: '#C6C9CA', abbr: 'T' },
  { id: 'ulm',            school: 'UL Monroe',          mascot: 'Warhawks',         conf: 'Sun Belt', shell: '#840029', stripe: '#FDB913', mask: '#840029', decal: '#FDB913', abbr: 'ULM' },

  // ==== Independents (2) ====
  { id: 'notre-dame',     school: 'Notre Dame',         mascot: 'Fighting Irish',   conf: 'Ind', shell: '#C99700', stripe: '#C99700', mask: '#C99700', decal: '#0C2340', abbr: 'ND' },
  { id: 'uconn',          school: 'UConn',              mascot: 'Huskies',          conf: 'Ind', shell: '#0E1A3C', stripe: '#FFFFFF', mask: '#0E1A3C', decal: '#FFFFFF', abbr: 'UC' },
];

const TEAM_MAP = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

const CONFS = ['All', 'SEC', 'Big Ten', 'Big 12', 'ACC', 'American', 'C-USA', 'MAC', 'MW', 'Pac-12', 'Sun Belt', 'Ind'];

// Side-view helmet drawn with the team's colors. The stripe is clipped to the
// shell so it always follows the dome regardless of color combos.
function helmetSVG(team, size = 72) {
  const t = team;
  const uid = `${t.id}-${size}`;
  const shellPath =
    'M 62 7 C 34 7 13 30 13 58 L 13 74 C 13 83 19 88 28 88 L 72 88 ' +
    'C 79 88 84 84 86 78 L 91 62 L 104 58 C 110 56 112 50 111 44 C 107 22 88 7 62 7 Z';
  const whiteShell = t.shell.toUpperCase() === '#FFFFFF';
  const outline = whiteShell ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.28)';
  const stripe =
    t.stripe.toUpperCase() === t.shell.toUpperCase()
      ? ''
      : `<path d="M 15 48 C 20 22 40 9 62 9 C 87 9 105 24 110 41" fill="none" stroke="${t.stripe}" stroke-width="8" clip-path="url(#shell-${uid})"/>`;
  const fontSize =
    t.abbr.length >= 4 ? 13 : t.abbr.length === 3 ? 17 : t.abbr.length === 2 ? 22 : 28;
  return `
<svg viewBox="0 0 128 100" width="${size}" height="${Math.round(size * 0.78)}" class="helmet" aria-hidden="true">
  <defs>
    <clipPath id="shell-${uid}"><path d="${shellPath}"/></clipPath>
    <linearGradient id="shine-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.35"/>
      <stop offset="35%" stop-color="#fff" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.22"/>
    </linearGradient>
  </defs>
  <g>
    <path d="M 100 62 C 114 58 123 64 122 72 C 121 84 108 91 92 91 L 82 90"
          fill="none" stroke="${t.mask}" stroke-width="5" stroke-linecap="round"/>
    <path d="M 116 63 L 109 89" fill="none" stroke="${t.mask}" stroke-width="4.5" stroke-linecap="round"/>
    <path d="${shellPath}" fill="${t.shell}" stroke="${outline}" stroke-width="2"/>
    ${stripe}
    <path d="${shellPath}" fill="url(#shine-${uid})"/>
    <path d="${shellPath}" fill="none" stroke="${outline}" stroke-width="2"/>
    <circle cx="58" cy="70" r="4.5" fill="rgba(0,0,0,0.38)"/>
    <path d="M 86 78 C 88 84 92 88 98 89" fill="none" stroke="${t.mask}" stroke-width="4" stroke-linecap="round"/>
    <text x="50" y="56" text-anchor="middle" font-family="'Arial Black', Arial, sans-serif"
          font-weight="900" font-size="${fontSize}" fill="${t.decal}"
          stroke="rgba(0,0,0,0.18)" stroke-width="0.5">${t.abbr}</text>
  </g>
</svg>`;
}
