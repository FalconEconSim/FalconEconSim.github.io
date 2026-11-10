/* Authored structure for the experimental site (x/).
 *
 * Everything a student reads as teaching content comes from the live site's pages and is
 * extracted by build.js. This file holds only the structure the live site does not have:
 * the four units, which weeks a week builds on, and the cross-week "threads" (ideas that
 * come back). These are editorial claims and should be checked by the professor.
 */
'use strict';

const UNITS = [
  { n: 1, name: 'Consumers', long: 'Consumer theory', weeks: [1, 2, 3, 4] },
  { n: 2, name: 'Firms', long: 'Producer theory', weeks: [5, 6, 7] },
  { n: 3, name: 'Markets', long: 'Market structure', weeks: [8, 9, 10] },
  { n: 4, name: 'When markets fail', long: 'Welfare and information', weeks: [11, 12] },
];

// week -> [[earlier week, what it brings forward]]
const BUILDS_ON = {
  1: [],
  2: [[1, 'utility, indifference curves and the MRS']],
  3: [[2, 'the consumer optimum, solved again at every price']],
  4: [[3, 'demand curves']],
  5: [[1, 'indifference curves, which isoquants mirror'], [2, 'tangency, which the firm uses too']],
  6: [[5, 'isoquants and the MRTS']],
  7: [[6, 'the cost curves']],
  8: [[4, 'elasticity and consumer surplus'], [7, 'marginal cost and competitive supply']],
  9: [[8, 'monopoly pricing and price discrimination']],
  10: [[8, 'monopoly'], [9, 'game theory and best responses']],
  11: [[8, 'surplus and deadweight loss']],
  12: [[8, 'surplus and efficiency'], [11, 'market failure']],
};

// Ideas that recur across weeks. Each lists figure keys from assets/predict/weekN/figs.js.
const THREADS = [
  { id: 'tangency', name: 'Where two slopes meet',
    line: 'The best choice sits where a level curve just touches a constraint: indifference curves and budget lines, isoquants and isocosts.',
    figs: ['f25', 'f210', 'f31', 'f53', 'f57', 'f61', 'f62'] },
  { id: 'margins', name: 'Marginal benefit equals marginal cost',
    line: 'Keep going while the next unit adds more than it costs. Consumers, competitive firms, monopolists and regulators all stop at the same rule.',
    figs: ['f26', 'f71', 'f72', 'f84', 'f101', 'f111', 'f112', 'f115'] },
  { id: 'surplus', name: 'Surplus and deadweight loss',
    line: 'Who gains, who loses and what simply disappears when price and quantity move away from the efficient point.',
    figs: ['f46', 'f81', 'f82', 'f83', 'f85', 'f87', 'f91', 'f111', 'f113', 'f114', 'f121'] },
  { id: 'elasticity', name: 'Elasticity and pricing power',
    line: 'How strongly buyers respond decides whether a higher price raises revenue, and where a firm with market power sets its price.',
    figs: ['f41', 'f42', 'f43', 'f44', 'f47', 'f84', 'f89'] },
  { id: 'pricing', name: 'More than one price',
    line: 'Surge pricing, price discrimination, block and two-part pricing: ways to capture surplus that a single price leaves behind.',
    figs: ['f47', 'f87', 'f88', 'f89', 'f811', 'f91', 'f94'] },
  { id: 'adding', name: 'From one to many',
    line: 'Market curves are sums of individual ones: horizontally for demand and supply, vertically for a public good.',
    figs: ['f48', 'f78', 'f103', 'f114'] },
  { id: 'runs', name: 'The short run and the long run',
    line: 'What is fixed today can change tomorrow: diminishing returns, the cost envelope, shutdown, and entry and exit.',
    figs: ['f54', 'f65', 'f66', 'f73', 'f77', 'f79'] },
  { id: 'scale', name: 'Natural monopoly',
    line: 'When average cost keeps falling, one firm is cheapest, and pricing it becomes a regulator\'s dilemma.',
    figs: ['f66', 'f810', 'f92'] },
  { id: 'strategy', name: 'Best responses',
    line: 'When your best move depends on what a rival does, look for the point where both moves are best responses.',
    figs: ['f93', 'f101', 'f102', 'f103', 'f104', 'f105'] },
  { id: 'shapes', name: 'Shapes carry the assumptions',
    line: 'The shape of an indifference curve or an isoquant is a statement about tastes or technology. Read the shape, read the assumption.',
    figs: ['f21', 'f29', 'f52', 'f55', 'f510'] },
];

module.exports = { UNITS, BUILDS_ON, THREADS };
