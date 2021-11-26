const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController')

// 유저 등록
router.post('/kakao', AuthController.saveUser)

// 닉네임 등록
router.post('/nickname', AuthController.saveNickname)


module.exports = router;