// Single source of truth for the site's PUBLISHED operator identity.
// The React legal pages and the static HTML pre-renderer both read this file,
// so a crawler that never runs JavaScript sees exactly the same operator,
// contact channel and response deadline as a human visitor.
// No physical postal address is published by design (Privacy §1).
export const OPERATOR = {
  name: 'Gustavo Romão Borges',
  entity: 'Individual (pessoa física)',
  jurisdiction: 'São João da Boa Vista, São Paulo, Brasil',
  email: 'gustavo.romao.borges0@gmail.com',
  sla: '15 days',
};

export const LAST_UPDATED = 'November 2, 2026';
