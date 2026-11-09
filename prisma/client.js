require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');

module.exports = new PrismaClient();
