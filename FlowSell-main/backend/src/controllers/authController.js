export function checkAuth(req, res) {
  const isAuthenticated = req.isAuthenticated?.() === true;
  return res.json({ isAuthenticated });
}
