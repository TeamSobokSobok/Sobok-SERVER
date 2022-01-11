const express = require('express');
const { checkUser } = require('../../middlewares/auth');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/group', require('./group'));
router.use('/pill', require('./pill'));

module.exports = router;
