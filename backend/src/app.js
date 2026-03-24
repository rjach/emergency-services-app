const express = require('express');
const apiRoutes = require('./routes');

const app = express();

app.use(express.json());
app.use('/api', apiRoutes);

module.exports = app;
