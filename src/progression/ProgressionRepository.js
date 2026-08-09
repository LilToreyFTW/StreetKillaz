export class LocalStorageProgressionRepository {
  constructor(key = 'streetkillaz.progression.v2') {
    this.key = key;
  }

  async load() {
    try {
      const raw = window.localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('[ProgressionRepository] Load failed:', error);
      return null;
    }
  }

  async save(state) {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(state));
      return state;
    } catch (error) {
      console.error('[ProgressionRepository] Save failed:', error);
      throw error;
    }
  }

  async clear() {
    window.localStorage.removeItem(this.key);
  }
}

export class ApiProgressionRepository {
  constructor(baseUrl = '/api/progression') {
    this.baseUrl = baseUrl;
  }

  async load() {
    const response = await fetch(this.baseUrl, { credentials: 'include' });
    if (!response.ok) throw new Error(`Progression load failed (${response.status})`);
    return response.json();
  }

  async save(state) {
    const response = await fetch(this.baseUrl, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, revision: state.revision }),
    });
    if (!response.ok) throw new Error(`Progression save failed (${response.status})`);
    return response.json();
  }
}
