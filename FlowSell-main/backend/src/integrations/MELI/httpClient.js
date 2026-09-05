export async function mlGet(url, token) {
    try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          const error = new Error(`Mercado Libre respondió con estado ${res.status}.`);
          error.status = res.status === 401 ? 401 : 502;
          throw error;
        }

        return res.json();
    } catch (error) {
        throw error;
    }
}
