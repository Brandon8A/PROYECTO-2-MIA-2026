
const express = require('express');
const { iniciarSesion } = require('../controllers/AuthController');

const router = express.Router();

router.post('/login', iniciarSesion);

module.exports = router;
