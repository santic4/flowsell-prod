import { getSalesReport, createSalesCsv } from '../services/statisticsServices.js';
import { tokenServices } from '../services/tokenServices.js';

const loadReportForCurrentUser = async (req) => {
  const accessToken = await tokenServices.getValidAccessToken(req.user);
  return getSalesReport({
    sellerId: req.user.meliId,
    accessToken,
    from: req.query.from,
    to: req.query.to,
  });
};

export const getSalesStatistics = async (req, res, next) => {
  try {
    const { report } = await loadReportForCurrentUser(req);
    res.set('Cache-Control', 'private, max-age=120');
    return res.json(report);
  } catch (error) {
    return next(error);
  }
};

export const exportSalesStatistics = async (req, res, next) => {
  try {
    const { report, orders } = await loadReportForCurrentUser(req);
    const filename = `flowsell-ventas-${report.meta.from}-a-${report.meta.to}.csv`;
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    });
    return res.send(createSalesCsv(orders));
  } catch (error) {
    return next(error);
  }
};
