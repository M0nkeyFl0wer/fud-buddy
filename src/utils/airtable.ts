
// Analytics logging — posts events to the local SQLite backend (replaces Airtable mock).

const API_BASE =
  (typeof window !== 'undefined' && window.localStorage.getItem('fud_api_base_url')) ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000';

function getClientId(): string {
  try {
    return window.localStorage.getItem('fud_client_id') || '';
  } catch {
    return '';
  }
}

export const logToAirtable = async (
  tableName: string,
  data: unknown,
): Promise<{ success: true }> => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const clientId = getClientId();
    if (clientId) headers['X-FUD-Client-Id'] = clientId;

    await fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event_type: 'analytics',
        table_name: tableName,
        data,
      }),
    });
  } catch {
    // Backend unavailable — swallow silently so the UI is never blocked.
    console.debug(`[analytics] POST /api/events failed for ${tableName}`);
  }

  return { success: true };
};

export const queryAirtable = async (
  _tableName: string,
  _query: unknown,
): Promise<unknown> => {
  // Query support not needed yet — kept for interface compat.
  return [];
};
