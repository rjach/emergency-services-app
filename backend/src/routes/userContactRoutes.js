const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const {
  list,
  create,
  update,
  remove,
} = require('../controllers/contactsController');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('user'));

router.get('/', list);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);

module.exports = router;
