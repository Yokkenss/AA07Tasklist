const express = require('express');
const path = require('path');

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', require('./routes/taskRoutes'));
app.use('/', require('./routes/userRoutes'));

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log('Server running at http://localhost:' + port));
}

module.exports = app;
