require('dotenv').config();
console.log('✅ dotenv loaded');
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ exists' : '❌ missing');

const express = require('express');
console.log('✅ express loaded');

const mongoose = require('mongoose');
console.log('✅ mongoose loaded');

const cors = require('cors');
console.log('✅ cors loaded');

console.log('🎉 All dependencies loaded successfully!');
