import {Router} from 'express';
import {ClusterUsing} from "@controllers/v1/cluster.controller";

export const path = '/cluster';
export const router = Router();

router.get('/using', ClusterUsing);
