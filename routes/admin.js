import express from 'express';
import { isSuperAdmin } from '../utils';
import adminService from '../service/admin';

const router = express.Router();

router.get('/', (req, res) => {
  if (!isSuperAdmin(req)) {
  	return res.send(403, 'Not authorised');
  }
  adminService.list()
  	.then(list => res.send(list))
  	.catch(err => res.status(400).send(err));
});

router.post('/', (req, res, next) => {
  if (!isSuperAdmin(req)) {
  	return res.status(403).send('Not authorised');
  }
  const userName = req.body.userName.toLowerCase();
  adminService.isAdmin(userName)
    .then(isAdmin => {
      if (isAdmin) {
        return res.status(400).send(`${req.body.userName} is already added as an admin`);
      }
      adminService.create(userName)
        .then(admin => res.send(admin))
        .catch(err => res.status(400).send(err));
    })
  	.catch(err => res.status(400).send(err));
});

router.delete('/:id', (req, res, next) => {
  if (!isSuperAdmin(req)) {
  	return res.send(403, 'Not authorised');
  }
  adminService.delete(req.params.id)
  	.then(() => res.sendStatus(200))
  	.catch(err => res.status(400).send(err));
});

const adminRouter = router;
export default adminRouter;
