// Middleware de vérification d'authentification admin
function isAdmin(req, res, next) {
  if (req.cookies.auth === 'admin') {
    next();
  } else {
    res.redirect('/login.html');
  }
}

// Décode une chaîne base64
function decode(str) {
  return Buffer.from(str, 'base64').toString();
}

module.exports = { isAdmin, decode };