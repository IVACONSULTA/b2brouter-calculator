import { paFetchJson } from './pa-api';

/**
 * Fetch the real total count of document analyses from the API
 */
export async function fetchAnalysesCount(token: string): Promise<number> {
  try {
    const res = await paFetchJson<{ items?: any[]; success?: boolean }>(
      '/admin/document-analyses',
      token,
    );
    
    if (res.ok && res.data?.items) {
      return res.data.items.length;
    }
    
    return 0;
  } catch (err) {
    console.error('[fetchAnalysesCount] Error:', err);
    return 0;
  }
}

/**
 * Fetch analyses and return both the count and the list
 */
export async function fetchAnalysesList(token: string): Promise<{ count: number; items: any[] }> {
  try {
    const res = await paFetchJson<{ items?: any[]; success?: boolean }>(
      '/admin/document-analyses',
      token,
    );
    
    if (res.ok && res.data?.items) {
      return { count: res.data.items.length, items: res.data.items };
    }
    
    return { count: 0, items: [] };
  } catch (err) {
    console.error('[fetchAnalysesList] Error:', err);
    return { count: 0, items: [] };
  }
}
