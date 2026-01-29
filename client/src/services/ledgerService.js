import axios from 'axios';
import { API_ENDPOINTS } from '../constants/api';
import authService from './authService';

function headers() {
  const token = authService.getToken();
  if (!token) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    'x-auth-token': token,
  };
}

export const ledgerService = {
  overview: () =>
    axios.get(API_ENDPOINTS.LEDGER_OVERVIEW, { headers: headers() }).then((r) => r.data),

  accounts: (tenantId) =>
    axios
      .get(API_ENDPOINTS.LEDGER_ACCOUNTS, {
        headers: headers(),
        params: tenantId ? { tenantId } : {},
      })
      .then((r) => r.data),

  journal: (tenantId, limit) =>
    axios
      .get(API_ENDPOINTS.LEDGER_JOURNAL, {
        headers: headers(),
        params: { ...(tenantId && { tenantId }), ...(limit != null && { limit }) },
      })
      .then((r) => r.data),

  journalById: (id) =>
    axios
      .get(API_ENDPOINTS.LEDGER_JOURNAL_ENTRY(id), { headers: headers() })
      .then((r) => r.data),
};

export default ledgerService;
