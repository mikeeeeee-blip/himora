import axios from 'axios';
import { API_ENDPOINTS } from '../constants/api';

const get = (url) => axios.get(url).then((r) => r.data);

export const reconService = {
  overview: () => get(API_ENDPOINTS.RECON_OVERVIEW),
  runs: () => get(API_ENDPOINTS.RECON_RUNS),
  runById: (runId) => get(API_ENDPOINTS.RECON_RUN(runId)),
  journal: () => get(API_ENDPOINTS.RECON_JOURNAL),
  journalById: (id) => get(API_ENDPOINTS.RECON_JOURNAL_ENTRY(id)),
  exceptions: () => get(API_ENDPOINTS.RECON_EXCEPTIONS),
  exceptionById: (id) => get(API_ENDPOINTS.RECON_EXCEPTION(id)),
  logs: (limit = 50) => get(API_ENDPOINTS.RECON_LOGS(limit)),
};

export default reconService;
