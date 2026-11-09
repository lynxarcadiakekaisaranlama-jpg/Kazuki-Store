const products = require('./_products');
module.exports = (req, res) => res.status(200).json(products);
