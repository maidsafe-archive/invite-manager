import express from 'express';
import mongoose from 'mongoose';

import { isSuperAdmin } from '../utils';
import networkProxyService from '../service/network_proxy';

const router = express.Router();

const isAdmin = (req) => {
    return req && req.session && req.session.user && req.session.user.role.toLocaleString() !== 'user';
};

router.get('/', (req, res) => {
  if (!isAdmin(req)) {
  	return res.send(403, 'Not authorised');
  }
  networkProxyService.list(req.session.testnet)
  	.then(list => res.send(list))
  	.catch(err => res.send(400, err));
});

router.post('/', async (req, res) => {
  try {
      if (!isSuperAdmin(req)) {
          return res.send(403, 'Not authorised');
      }
      const list = req.body.ipList;
      for (let i = 0; i < list.length; i++) {
          await networkProxyService.create(req.session.testnet, list[i]);
      }
      res.sendStatus(200);
  } catch(e) {
      res.status(400).send(e);
  }
});


router.delete('/clearAll', (req, res) => {
  if (!isSuperAdmin(req)) {
    return res.send(403, 'Not authorised');
  }
  networkProxyService.deleteAll(req.session.testnet)
    .then(() => res.sendStatus(200))
    .catch(err => res.send(400, err));
});

router.delete('/:id', (req, res) => {
  if (!isSuperAdmin(req)) {
  	return res.send(403, 'Not authorised');
  }
  networkProxyService.delete(req.params.id)
  	.then(() => res.sendStatus(200))
  	.catch(err => res.send(400, err));
});

const networkProxyRouter = router;
export default networkProxyRouter;
