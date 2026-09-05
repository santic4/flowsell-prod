import { mlGet } from "../integrations/MELI/httpClient.js";

const BASE = 'https://api.mercadolibre.com';

class TrackingDAO{
    async fetchOrdersBySeller(sellerId, fromIso, toIso, token, offset = 0, limit = 50){
        const params = new URLSearchParams({
            seller: String(sellerId),
            'order.date_created.from': fromIso,
            'order.date_created.to': toIso,
            'order.status': 'paid',
            offset: String(offset),
            limit: String(limit),
        });
        return mlGet(`${BASE}/orders/search?${params.toString()}`, token);

        
    }

    async fetchOrderById(orderId, token){
        const url = `${BASE}/orders/${orderId}`;
        return mlGet(url, token);
    }

}

export const trackingDAO = new TrackingDAO()
